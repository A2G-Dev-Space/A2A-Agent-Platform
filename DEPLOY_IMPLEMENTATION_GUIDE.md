# Deploy Feature - Implementation Guide with Code Examples

## 1. FRONTEND TYPE SYSTEM FIX (FIRST - 15 minutes)

### File: `/home/aidivn/A2A-Agent-Platform/frontend/src/types/index.ts`

**Current (Lines 30-35)**:
```typescript
export enum AgentStatus {
  DEVELOPMENT = 'DEVELOPMENT',
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
  ARCHIVED = 'ARCHIVED',
}
```

**Change To**:
```typescript
export enum AgentStatus {
  DEVELOPMENT = 'DEVELOPMENT',
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
  ARCHIVED = 'ARCHIVED',
  DEPLOYED_ALL = 'DEPLOYED_ALL',      // New - deployed to all users
  DEPLOYED_DEPT = 'DEPLOYED_DEPT',    // New - deployed to department only
}

export enum DeploymentScope {
  ALL = 'all',
  DEPARTMENT = 'department',
  CUSTOM = 'custom',
}
```

---

## 2. FRONTEND SERVICE METHODS (1 hour)

### File: `/home/aidivn/A2A-Agent-Platform/frontend/src/services/agentService.ts`

**Add to existing agentService object**:
```typescript
  deployAgent: async (id: number, scope: 'all' | 'department' | 'custom', allowedUsers?: string[]): Promise<Agent> => {
    return await api.post<Agent>(`/agents/${id}/deploy`, {
      scope,
      allowed_users: allowedUsers,
    });
  },

  undeployAgent: async (id: number): Promise<Agent> => {
    return await api.post<Agent>(`/agents/${id}/undeploy`, {});
  },
```

---

## 3. BACKEND DATABASE MIGRATION (3-5 hours)

### File: Create new migration `/home/aidivn/A2A-Agent-Platform/repos/agent-service/alembic/versions/004_add_deployment_tracking.py`

```python
"""Add deployment tracking fields to agents table

Revision ID: 004
Revises: 003
Create Date: 2025-01-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add deployment tracking columns to agents table"""
    
    # Add deployed_at column
    op.add_column('agents', sa.Column('deployed_at', sa.DateTime, nullable=True))
    
    # Add deployed_by column
    op.add_column('agents', sa.Column('deployed_by', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Remove deployment tracking columns from agents table"""
    
    # Drop columns
    op.drop_column('agents', 'deployed_by')
    op.drop_column('agents', 'deployed_at')
```

### Update Agent Model: `/home/aidivn/A2A-Agent-Platform/repos/agent-service/app/core/database.py`

**Add these fields to Agent class (after updated_at)**:
```python
    # Deployment tracking
    deployed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    deployed_by: Mapped[Optional[str]] = mapped_column(String(50))
```

---

## 4. BACKEND API ENDPOINTS (5-7 hours)

### File: `/home/aidivn/A2A-Agent-Platform/repos/agent-service/app/api/v1/agents.py`

**Add new endpoint classes at top of file**:
```python
class DeployRequest(BaseModel):
    scope: str  # "all", "department", "custom"
    allowed_users: Optional[List[str]] = None

class DeployResponse(BaseModel):
    id: int
    name: str
    status: AgentStatus
    visibility: str
    allowed_users: Optional[List[str]]
    deployed_at: Optional[datetime]
    deployed_by: str
    message: str
```

**Add after update_agent endpoint (around line 418)**:
```python
@router.post("/{agent_id}/deploy", response_model=DeployResponse)
async def deploy_agent(
    agent_id: int,
    request: DeployRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deploy an agent to production with specified scope
    
    Scopes:
    - all: Public (visibility=public)
    - department: Team (visibility=team)
    - custom: Private with allowed users (visibility=private, allowed_users set)
    """
    from datetime import datetime
    
    # Get agent
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Check ownership
    if agent.owner_id != current_user["username"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to deploy this agent"
        )
    
    # Validate scope
    if request.scope not in ["all", "department", "custom"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid scope. Must be 'all', 'department', or 'custom'"
        )
    
    # Set visibility based on scope
    if request.scope == "all":
        agent.visibility = "public"
        agent.allowed_users = None
    elif request.scope == "department":
        agent.visibility = "team"
        agent.allowed_users = None
    elif request.scope == "custom":
        if not request.allowed_users:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="allowed_users required for custom scope"
            )
        agent.visibility = "private"
        agent.allowed_users = request.allowed_users
    
    # Update status and deployment info
    agent.status = AgentStatus.PRODUCTION
    agent.deployed_at = datetime.utcnow()
    agent.deployed_by = current_user["username"]
    
    await db.commit()
    await db.refresh(agent)
    
    logger.info(f"[Deploy Agent] User {current_user['username']} deployed agent {agent_id} with scope {request.scope}")
    
    return DeployResponse(
        id=agent.id,
        name=agent.name,
        status=agent.status,
        visibility=agent.visibility,
        allowed_users=agent.allowed_users,
        deployed_at=agent.deployed_at,
        deployed_by=agent.deployed_by,
        message=f"Agent deployed to {request.scope}"
    )


@router.post("/{agent_id}/undeploy", response_model=AgentResponse)
async def undeploy_agent(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Undeploy an agent - move back to development status
    """
    # Get agent
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Check ownership
    if agent.owner_id != current_user["username"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to undeploy this agent"
        )
    
    # Reset to development
    agent.status = AgentStatus.DEVELOPMENT
    agent.visibility = "private"
    agent.allowed_users = None
    agent.deployed_at = None
    agent.deployed_by = None
    
    await db.commit()
    await db.refresh(agent)
    
    logger.info(f"[Undeploy Agent] User {current_user['username']} undeployed agent {agent_id}")
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        framework=agent.framework,
        status=agent.status,
        a2a_endpoint=agent.a2a_endpoint,
        trace_id=agent.trace_id,
        capabilities=agent.capabilities,
        owner_id=agent.owner_id,
        department=agent.department,
        is_public=agent.is_public,
        visibility=agent.visibility,
        allowed_users=agent.allowed_users,
        health_status=agent.health_status,
        last_health_check=agent.last_health_check,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        card_color=agent.card_color,
        logo_url=agent.logo_url
    )
```

---

## 5. FRONTEND COMPONENT - Deploy Modal (2-3 hours)

### Create new file: `/home/aidivn/A2A-Agent-Platform/frontend/src/components/workbench/DeployModal.tsx`

```typescript
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type Agent, DeploymentScope } from '@/types';
import { agentService } from '@/services/agentService';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';

interface DeployModalProps {
  isOpen: boolean;
  agent: Agent | null;
  onClose: () => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({ isOpen, agent, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedScope, setSelectedScope] = useState<'all' | 'department' | 'custom'>('all');
  const [customUsers, setCustomUsers] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!agent) throw new Error('No agent selected');
      return await agentService.deployAgent(
        agent.id,
        selectedScope,
        selectedScope === 'custom' ? customUsers : undefined
      );
    },
    onSuccess: () => {
      toast.success('Agent deployed successfully!');
      queryClient.invalidateQueries({ queryKey: ['developmentAgents'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to deploy agent');
    },
  });

  const handleAddUser = (user: string) => {
    if (user.trim() && !customUsers.includes(user.trim())) {
      setCustomUsers([...customUsers, user.trim()]);
      setUserInput('');
    }
  };

  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Deploy Agent: {agent.name}</h2>

        <div className="space-y-4 mb-6">
          {/* Scope Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Deployment Scope</label>
            
            <div className="space-y-2">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  value="all"
                  checked={selectedScope === 'all'}
                  onChange={(e) => setSelectedScope(e.target.value as any)}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium">Deploy to All</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Public - visible to all users in Hub
                  </p>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  value="department"
                  checked={selectedScope === 'department'}
                  onChange={(e) => setSelectedScope(e.target.value as any)}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium">Deploy to Department</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Team - visible only to {agent.department} members in Hub
                  </p>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  value="custom"
                  checked={selectedScope === 'custom'}
                  onChange={(e) => setSelectedScope(e.target.value as any)}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium">Deploy to Custom Users</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Private - visible only to selected users
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Custom Users Input */}
          {selectedScope === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-2">Add Users</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Enter username"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddUser(userInput);
                    }
                  }}
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <Button onClick={() => handleAddUser(userInput)} size="sm">
                  Add
                </Button>
              </div>
              {customUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customUsers.map((user) => (
                    <span
                      key={user}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {user}
                      <button
                        onClick={() => setCustomUsers(customUsers.filter((u) => u !== user))}
                        className="font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => deployMutation.mutate()}
            loading={deployMutation.isPending}
            className="flex-1"
          >
            Deploy
          </Button>
        </div>
      </div>
    </div>
  );
};
```

---

## 6. FRONTEND COMPONENT - Workbench Updates (2-3 hours)

### File: `/home/aidivn/A2A-Agent-Platform/frontend/src/components/workbench/WorkbenchDashboard.tsx`

**Add imports at top**:
```typescript
import { DeployModal } from './DeployModal';
```

**Add state**:
```typescript
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [agentToSploy, setAgentToDeploy] = useState<Agent | null>(null);
```

**Update handleDeploy**:
```typescript
  const handleDeploy = (agent: Agent) => {
    setAgentToDeploy(agent);
    setDeployModalOpen(true);
  };
```

**Add modal before closing div**:
```typescript
        <DeployModal
          isOpen={deployModalOpen}
          agent={agentToDeploy}
          onClose={() => {
            setDeployModalOpen(false);
            setAgentToDeploy(null);
          }}
        />
```

---

## 7. FRONTEND COMPONENT - AgentCard Status Update (30 minutes)

### File: `/home/aidivn/A2A-Agent-Platform/frontend/src/components/workbench/AgentCard.tsx`

**Update getStatusBadge function** (lines 14-40):
```typescript
const getStatusBadge = (status: AgentStatus, isDarkMode: boolean, isLightBg: boolean) => {
  switch (status) {
    case AgentStatus.DEPLOYED_ALL:
      return (
        <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300 border border-green-700/30 dark:border-green-300/30">
          DEPLOY TO ALL
        </span>
      );
    case AgentStatus.DEPLOYED_DEPT:
      return (
        <span className="inline-flex items-center rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300 border border-sky-700/30 dark:border-sky-300/30">
          DEPLOY TO DEPARTMENT
        </span>
      );
    case AgentStatus.PRODUCTION:
      return (
        <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300 border border-green-700/30 dark:border-green-300/30">
          PRODUCTION
        </span>
      );
    case AgentStatus.DEVELOPMENT:
    default:
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
          isDarkMode || !isLightBg
            ? 'bg-white/20 text-white border-white/30'
            : 'bg-gray-800/20 text-gray-800 border-gray-800/30'
        }`}>
          DEVELOPMENT
        </span>
      );
  }
};
```

**Update isDeployed check** (line 44):
```typescript
  const isDeployed = [
    AgentStatus.PRODUCTION,
    AgentStatus.DEPLOYED_ALL,
    AgentStatus.DEPLOYED_DEPT,
  ].includes(agent.status);
```

---

## 8. IMPLEMENTATION SEQUENCE

1. **Types Fix** (15 min)
   - Update enum in types/index.ts
   - Add DeploymentScope enum
   - Deploy to main branch immediately

2. **Backend Migration** (4 hours)
   - Create migration file
   - Update Agent model
   - Run migration
   - Test database changes

3. **Backend Endpoints** (6 hours)
   - Implement deploy endpoint
   - Implement undeploy endpoint
   - Add logging
   - Test with Postman

4. **Frontend Services** (1 hour)
   - Add deploy/undeploy methods
   - Test API calls

5. **Frontend Components** (4 hours)
   - Create DeployModal
   - Update WorkbenchDashboard
   - Update AgentCard status badge
   - Wire event handlers

6. **Testing** (4 hours)
   - E2E testing
   - Edge cases
   - Error handling

---

## 9. VERIFICATION CHECKLIST

- [ ] Type enum has DEPLOYED_ALL and DEPLOYED_DEPT
- [ ] Migration creates deployed_at and deployed_by columns
- [ ] Agent model has new fields
- [ ] Deploy endpoint returns 200 with deployment info
- [ ] Undeploy endpoint returns agent to DEVELOPMENT
- [ ] Status changes reflected in Hub immediately
- [ ] Statistics page shows updated counts
- [ ] Deploy modal shows scope options
- [ ] Custom user deployment works
- [ ] Permissions respected (can only deploy own agents)
- [ ] Visibility updated based on scope
- [ ] Error messages user-friendly

