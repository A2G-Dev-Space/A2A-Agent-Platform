"""add workbench sessions table

Revision ID: 002_add_workbench_sessions
Revises: 001_initial_schema
Create Date: 2025-11-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_add_workbench_sessions'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create workbench_sessions table for storing user chat sessions"""
    op.create_table('workbench_sessions',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('user_id', sa.String(50), nullable=False, index=True),
        sa.Column('agent_id', sa.Integer(), nullable=False, index=True),
        sa.Column('messages', postgresql.JSON(), nullable=True, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create index for faster lookups by user_id and agent_id
    op.create_index(
        'idx_workbench_sessions_user_agent',
        'workbench_sessions',
        ['user_id', 'agent_id'],
        unique=True
    )


def downgrade() -> None:
    """Drop workbench_sessions table"""
    op.drop_index('idx_workbench_sessions_user_agent', table_name='workbench_sessions')
    op.drop_table('workbench_sessions')