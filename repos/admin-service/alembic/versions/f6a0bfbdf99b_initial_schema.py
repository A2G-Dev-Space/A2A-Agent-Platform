"""initial_schema

Revision ID: f6a0bfbdf99b
Revises:
Create Date: 2025-10-31 16:40:46.987655

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f6a0bfbdf99b'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial schema for admin service"""

    # Create llm_models table
    op.create_table(
        'llm_models',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('provider', sa.String(length=100), nullable=False),
        sa.Column('endpoint', sa.String(length=500), nullable=False),
        sa.Column('api_key_encrypted', sa.Text(), nullable=True),
        sa.Column('model_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('health_status', sa.Enum('HEALTHY', 'UNHEALTHY', 'UNKNOWN', name='healthstatus'), nullable=False),
        sa.Column('last_health_check', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_llm_models_name'), 'llm_models', ['name'], unique=True)

    # Create platform_statistics table
    op.create_table(
        'platform_statistics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('total_users', sa.Integer(), nullable=False),
        sa.Column('active_users', sa.Integer(), nullable=False),
        sa.Column('total_agents', sa.Integer(), nullable=False),
        sa.Column('production_agents', sa.Integer(), nullable=False),
        sa.Column('total_sessions', sa.Integer(), nullable=False),
        sa.Column('total_api_calls', sa.Integer(), nullable=False),
        sa.Column('llm_usage', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_platform_statistics_date'), 'platform_statistics', ['date'], unique=True)


def downgrade() -> None:
    """Drop all tables"""
    op.drop_index(op.f('ix_platform_statistics_date'), table_name='platform_statistics')
    op.drop_table('platform_statistics')

    op.drop_index(op.f('ix_llm_models_name'), table_name='llm_models')
    op.drop_table('llm_models')

    # Drop enum type
    op.execute('DROP TYPE IF EXISTS healthstatus')
