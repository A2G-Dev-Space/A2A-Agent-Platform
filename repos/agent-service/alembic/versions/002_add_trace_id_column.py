"""Add trace_id column to agents table

Revision ID: 002
Revises: 001
Create Date: 2025-11-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add trace_id column to agents table"""

    # Add trace_id column
    op.add_column('agents', sa.Column('trace_id', sa.String(length=100), nullable=True))

    # Create unique index on trace_id
    op.create_index(op.f('ix_agents_trace_id'), 'agents', ['trace_id'], unique=True)


def downgrade() -> None:
    """Remove trace_id column from agents table"""

    # Drop index
    op.drop_index(op.f('ix_agents_trace_id'), table_name='agents')

    # Drop column
    op.drop_column('agents', 'trace_id')
