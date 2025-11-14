"""Add workbench_messages column for storing Workbench chat history

Revision ID: 007
Revises: 006
Create Date: 2025-11-14 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add workbench_messages column to store Workbench chat history.
    Format: {user_id: [messages]}
    This enables chat history persistence across backend restarts.
    """
    op.add_column('agents',
        sa.Column('workbench_messages', postgresql.JSON(astext_type=sa.Text()), nullable=True)
    )


def downgrade() -> None:
    """Remove workbench_messages column"""
    op.drop_column('agents', 'workbench_messages')
