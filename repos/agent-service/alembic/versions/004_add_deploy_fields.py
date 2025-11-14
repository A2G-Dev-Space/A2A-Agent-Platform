"""Add deploy fields to agents table

Revision ID: 004
Revises: 003
Create Date: 2025-11-14 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add deploy-related fields to agents table"""

    # Add deployed_at field
    op.add_column('agents', sa.Column('deployed_at', sa.DateTime(), nullable=True))

    # Add deployed_by field (who deployed the agent)
    op.add_column('agents', sa.Column('deployed_by', sa.String(length=50), nullable=True))

    # Add deploy_config field for deployment configuration
    op.add_column('agents', sa.Column('deploy_config', sa.JSON(), nullable=True, server_default='{}'))

    # Add validated_endpoint field to store validated public endpoint
    op.add_column('agents', sa.Column('validated_endpoint', sa.String(length=500), nullable=True))

    # Create index on deployed_at for faster queries
    op.create_index(op.f('ix_agents_deployed_at'), 'agents', ['deployed_at'], unique=False)

    # Create index on deployed_by
    op.create_index(op.f('ix_agents_deployed_by'), 'agents', ['deployed_by'], unique=False)


def downgrade() -> None:
    """Remove deploy-related fields from agents table"""

    # Drop indexes
    op.drop_index(op.f('ix_agents_deployed_by'), table_name='agents')
    op.drop_index(op.f('ix_agents_deployed_at'), table_name='agents')

    # Drop columns
    op.drop_column('agents', 'validated_endpoint')
    op.drop_column('agents', 'deploy_config')
    op.drop_column('agents', 'deployed_by')
    op.drop_column('agents', 'deployed_at')