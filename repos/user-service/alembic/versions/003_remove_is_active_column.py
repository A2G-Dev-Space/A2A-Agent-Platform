"""Remove is_active column from users table

Revision ID: 003_remove_is_active
Revises: 002_add_user_preferences
Create Date: 2025-11-13 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_remove_is_active'
down_revision: Union[str, None] = '002_add_user_preferences'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove is_active column from users table"""
    # Drop is_active column from users table
    op.drop_column('users', 'is_active')


def downgrade() -> None:
    """Re-add is_active column to users table"""
    # Re-add is_active column (in case we need to rollback)
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
