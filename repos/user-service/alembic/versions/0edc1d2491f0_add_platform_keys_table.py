"""Add platform_keys table

Revision ID: 0edc1d2491f0
Revises: 001_initial_schema
Create Date: 2025-11-07 10:31:57.993898

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0edc1d2491f0'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('platform_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_used', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_platform_keys_id'), 'platform_keys', ['id'], unique=False)
    op.create_index(op.f('ix_platform_keys_key'), 'platform_keys', ['key'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_platform_keys_key'), table_name='platform_keys')
    op.drop_index(op.f('ix_platform_keys_id'), table_name='platform_keys')
    op.drop_table('platform_keys')
