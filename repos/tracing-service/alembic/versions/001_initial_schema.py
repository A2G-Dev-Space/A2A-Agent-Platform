"""Initial schema - create log_entries table

Revision ID: 001_initial_schema
Revises:
Create Date: 2025-10-31 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial schema for tracing service"""

    # Create log_entries table
    op.create_table(
        'log_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('trace_id', sa.String(length=100), nullable=False),
        sa.Column('service_name', sa.String(length=50), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=True),
        sa.Column('level', sa.String(length=20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('context', sa.JSON(), nullable=False),
        sa.Column('is_transfer', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_log_entries_trace_id'), 'log_entries', ['trace_id'], unique=False)
    op.create_index(op.f('ix_log_entries_service_name'), 'log_entries', ['service_name'], unique=False)
    op.create_index(op.f('ix_log_entries_agent_id'), 'log_entries', ['agent_id'], unique=False)
    op.create_index(op.f('ix_log_entries_user_id'), 'log_entries', ['user_id'], unique=False)


def downgrade() -> None:
    """Drop all tables"""
    op.drop_index(op.f('ix_log_entries_user_id'), table_name='log_entries')
    op.drop_index(op.f('ix_log_entries_agent_id'), table_name='log_entries')
    op.drop_index(op.f('ix_log_entries_service_name'), table_name='log_entries')
    op.drop_index(op.f('ix_log_entries_trace_id'), table_name='log_entries')
    op.drop_table('log_entries')
