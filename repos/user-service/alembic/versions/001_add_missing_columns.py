"""Add username_en, is_active to users and expires_at to api_keys

Revision ID: 001_add_missing_columns
Revises:
Create Date: 2025-01-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_add_missing_columns'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add username_en column to users table
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS username_en VARCHAR(255);
    """)

    # Add is_active column to users table
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    """)

    # Add expires_at column to api_keys table
    op.execute("""
        ALTER TABLE api_keys
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
    """)


def downgrade() -> None:
    # Remove columns in reverse order
    op.execute("ALTER TABLE api_keys DROP COLUMN IF EXISTS expires_at;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_active;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS username_en;")
