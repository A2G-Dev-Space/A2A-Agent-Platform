"""add_agno_os_endpoint_column

Revision ID: 3141b96a6e2f
Revises: b475b14b52f2
Create Date: 2025-11-18 10:33:55.283692

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3141b96a6e2f'
down_revision: Union[str, None] = 'b475b14b52f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add agno_os_endpoint column
    op.add_column('agents', sa.Column('agno_os_endpoint', sa.String(), nullable=True))


def downgrade() -> None:
    # Drop agno_os_endpoint column
    op.drop_column('agents', 'agno_os_endpoint')
