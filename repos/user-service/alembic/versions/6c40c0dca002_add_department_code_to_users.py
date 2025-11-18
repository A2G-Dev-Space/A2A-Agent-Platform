"""add_department_code_to_users

Revision ID: 6c40c0dca002
Revises: 003_remove_is_active
Create Date: 2025-11-18 07:35:03.221636

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6c40c0dca002'
down_revision: Union[str, None] = '003_remove_is_active'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add department column (language-neutral code)
    op.add_column('users', sa.Column('department', sa.String(length=100), nullable=True))

    # Populate department with lowercase version of department_en (or department_kr if en is null)
    op.execute("""
        UPDATE users
        SET department = LOWER(COALESCE(department_en, department_kr))
        WHERE department_en IS NOT NULL OR department_kr IS NOT NULL
    """)


def downgrade() -> None:
    op.drop_column('users', 'department')
