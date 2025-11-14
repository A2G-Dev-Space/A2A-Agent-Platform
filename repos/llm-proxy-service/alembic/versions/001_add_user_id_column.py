"""Add user_id column to llm_calls table

Revision ID: 001
Revises: 000
Create Date: 2025-11-14 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = '000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add user_id column to llm_calls table"""

    # Add user_id column
    op.add_column('llm_calls', sa.Column('user_id', sa.Integer(), nullable=True))

    # Create index on user_id
    op.create_index(op.f('ix_llm_calls_user_id'), 'llm_calls', ['user_id'], unique=False)


def downgrade() -> None:
    """Remove user_id column from llm_calls table"""

    # Drop index
    op.drop_index(op.f('ix_llm_calls_user_id'), table_name='llm_calls')

    # Drop column
    op.drop_column('llm_calls', 'user_id')
