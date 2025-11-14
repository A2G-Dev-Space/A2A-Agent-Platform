"""Update AgentStatus enum with deployment values

Revision ID: 005
Revises: 004
Create Date: 2025-11-14 04:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new enum values for deployment statuses
    # PostgreSQL doesn't support "IF NOT EXISTS" for enum values in older versions
    # so we need to handle this safely

    # Add DEPLOYED_TEAM
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'DEPLOYED_TEAM'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agentstatus')
            ) THEN
                ALTER TYPE agentstatus ADD VALUE 'DEPLOYED_TEAM';
            END IF;
        END $$;
    """)

    # Add DEPLOYED_ALL
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'DEPLOYED_ALL'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agentstatus')
            ) THEN
                ALTER TYPE agentstatus ADD VALUE 'DEPLOYED_ALL';
            END IF;
        END $$;
    """)

    # Add DEPLOYED_DEPT
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'DEPLOYED_DEPT'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agentstatus')
            ) THEN
                ALTER TYPE agentstatus ADD VALUE 'DEPLOYED_DEPT';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Cannot safely remove enum values in PostgreSQL
    # Would need to:
    # 1. Check no rows use these values
    # 2. Recreate the entire enum type
    # 3. Update all columns using the enum
    # This is complex and risky, so we just pass
    pass
