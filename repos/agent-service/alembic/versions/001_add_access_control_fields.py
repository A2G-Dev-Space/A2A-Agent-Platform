"""Add Access Control fields to agents table

Revision ID: 001
Revises:
Create Date: 2025-10-29 17:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Access Control fields to agents table"""

    # Create agents table if not exists
    op.create_table(
        'agents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('framework', sa.Enum('LANGCHAIN', 'AGNO', 'ADK', 'CUSTOM', name='agentframework'), nullable=False),
        sa.Column('status', sa.Enum('DEVELOPMENT', 'STAGING', 'PRODUCTION', 'ARCHIVED', name='agentstatus'), nullable=False),
        sa.Column('a2a_endpoint', sa.String(length=500), nullable=True),
        sa.Column('capabilities', sa.JSON(), nullable=False),
        sa.Column('embedding_vector', sa.JSON(), nullable=True),

        # Access Control fields
        sa.Column('owner_id', sa.String(length=50), nullable=False),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('visibility', sa.String(length=20), nullable=False, server_default='public'),
        sa.Column('allowed_users', sa.JSON(), nullable=True),

        # Health and metadata
        sa.Column('health_status', sa.Enum('healthy', 'unhealthy', 'unknown', name='healthstatus'), nullable=False),
        sa.Column('last_health_check', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index(op.f('ix_agents_name'), 'agents', ['name'], unique=True)
    op.create_index(op.f('ix_agents_owner_id'), 'agents', ['owner_id'], unique=False)
    op.create_index(op.f('ix_agents_visibility'), 'agents', ['visibility'], unique=False)


def downgrade() -> None:
    """Drop agents table"""
    op.drop_index(op.f('ix_agents_visibility'), table_name='agents')
    op.drop_index(op.f('ix_agents_owner_id'), table_name='agents')
    op.drop_index(op.f('ix_agents_name'), table_name='agents')
    op.drop_table('agents')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS agentframework')
    op.execute('DROP TYPE IF EXISTS agentstatus')
    op.execute('DROP TYPE IF EXISTS healthstatus')
