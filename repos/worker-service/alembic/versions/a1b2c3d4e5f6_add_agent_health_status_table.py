"""add_agent_health_status_table

Revision ID: a1b2c3d4e5f6
Revises: c05dd567237d
Create Date: 2025-11-19 18:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'c05dd567237d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add agent_health_status table."""
    op.create_table(
        'agent_health_status',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('agent_name', sa.String(), nullable=False),
        sa.Column('framework', sa.String(), nullable=False),
        sa.Column('endpoint_url', sa.String(), nullable=False),
        sa.Column('is_healthy', sa.Boolean(), nullable=True, default=True),
        sa.Column('response_time_ms', sa.Float(), nullable=True),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('consecutive_failures', sa.Integer(), nullable=True, default=0),
        sa.Column('last_healthy_at', sa.DateTime(), nullable=True),
        sa.Column('checked_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_agent_health_status_id'), 'agent_health_status', ['id'], unique=False)
    op.create_index(op.f('ix_agent_health_status_agent_id'), 'agent_health_status', ['agent_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema - Remove agent_health_status table."""
    op.drop_index(op.f('ix_agent_health_status_agent_id'), table_name='agent_health_status')
    op.drop_index(op.f('ix_agent_health_status_id'), table_name='agent_health_status')
    op.drop_table('agent_health_status')
