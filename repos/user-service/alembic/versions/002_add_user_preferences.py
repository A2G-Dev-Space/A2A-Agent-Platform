"""add user preferences

Revision ID: 002_add_user_preferences
Revises: 0edc1d2491f0
Create Date: 2025-11-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_add_user_preferences'
down_revision: Union[str, None] = '0edc1d2491f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add preferences column to users table"""
    op.add_column('users',
        sa.Column('preferences', postgresql.JSON(), nullable=True, server_default='{}')
    )


def downgrade() -> None:
    """Remove preferences column from users table"""
    op.drop_column('users', 'preferences')