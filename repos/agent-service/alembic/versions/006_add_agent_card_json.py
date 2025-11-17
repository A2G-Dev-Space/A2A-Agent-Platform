"""Add agent_card_json column for server-side agent card storage

Revision ID: 006
Revises: 005
Create Date: 2025-11-14 15:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add agent_card_json column to store A2A agent card generated from user input.
    This eliminates the need to fetch .well-known/agent.json from agent endpoints.
    """
    op.add_column('agents',
        sa.Column('agent_card_json', postgresql.JSON(astext_type=sa.Text()), nullable=True)
    )


def downgrade() -> None:
    """Remove agent_card_json column"""
    op.drop_column('agents', 'agent_card_json')
