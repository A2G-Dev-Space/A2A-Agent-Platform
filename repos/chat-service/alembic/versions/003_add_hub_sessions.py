"""Add hub_sessions table for multi-user multi-session support

Revision ID: 003
Revises: 002
Create Date: 2025-11-14 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create hub_sessions table for deployed agents"""

    # Create hub_sessions table
    op.create_table('hub_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('session_name', sa.String(length=100), nullable=True),
        sa.Column('messages', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('last_message_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for efficient queries
    op.create_index(op.f('ix_hub_sessions_agent_id'), 'hub_sessions', ['agent_id'], unique=False)
    op.create_index(op.f('ix_hub_sessions_user_id'), 'hub_sessions', ['user_id'], unique=False)
    op.create_index(op.f('ix_hub_sessions_agent_user'), 'hub_sessions', ['agent_id', 'user_id'], unique=False)

    # Create unique constraint for session per agent/user combination
    # Allow multiple sessions per user-agent pair
    # op.create_unique_constraint('unique_hub_session', 'hub_sessions', ['agent_id', 'user_id', 'id'])


def downgrade() -> None:
    """Drop hub_sessions table"""

    # Drop indexes
    op.drop_index(op.f('ix_hub_sessions_agent_user'), table_name='hub_sessions')
    op.drop_index(op.f('ix_hub_sessions_user_id'), table_name='hub_sessions')
    op.drop_index(op.f('ix_hub_sessions_agent_id'), table_name='hub_sessions')

    # Drop table
    op.drop_table('hub_sessions')