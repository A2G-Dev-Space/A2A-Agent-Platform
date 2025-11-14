"""Add card_color and logo_url columns to agents table

Revision ID: 003
Revises: 002
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add card_color and logo_url columns to agents table"""

    # Add card_color column
    op.add_column('agents', sa.Column('card_color', sa.String(length=20), nullable=True))

    # Add logo_url column
    op.add_column('agents', sa.Column('logo_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Remove card_color and logo_url columns from agents table"""

    # Drop columns
    op.drop_column('agents', 'logo_url')
    op.drop_column('agents', 'card_color')
