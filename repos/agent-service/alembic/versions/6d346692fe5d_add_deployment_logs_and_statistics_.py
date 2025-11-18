"""add_deployment_logs_and_statistics_tables

Revision ID: 6d346692fe5d
Revises: 007
Create Date: 2025-11-18 07:13:11.104400

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6d346692fe5d'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create deployment_logs table
    op.create_table(
        'deployment_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('performed_by', sa.String(length=50), nullable=False),
        sa.Column('visibility', sa.String(length=20), nullable=True),
        sa.Column('validated_endpoint', sa.String(length=500), nullable=True),
        sa.Column('previous_status', sa.String(length=20), nullable=False),
        sa.Column('new_status', sa.String(length=20), nullable=False),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_deployment_logs_agent_id', 'deployment_logs', ['agent_id'])

    # Create agent_call_statistics table
    op.create_table(
        'agent_call_statistics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('call_type', sa.String(length=20), nullable=False),
        sa.Column('agent_status', sa.String(length=20), nullable=False),
        sa.Column('called_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('date', sa.Date(), nullable=False, server_default=sa.text('CURRENT_DATE')),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_agent_call_statistics_agent_id', 'agent_call_statistics', ['agent_id'])
    op.create_index('idx_agent_call_statistics_user_id', 'agent_call_statistics', ['user_id'])
    op.create_index('idx_agent_call_statistics_call_type', 'agent_call_statistics', ['call_type'])
    op.create_index('idx_agent_call_statistics_called_at', 'agent_call_statistics', ['called_at'])
    op.create_index('idx_agent_call_statistics_date', 'agent_call_statistics', ['date'])


def downgrade() -> None:
    # Drop agent_call_statistics table and indexes
    op.drop_index('idx_agent_call_statistics_date', table_name='agent_call_statistics')
    op.drop_index('idx_agent_call_statistics_called_at', table_name='agent_call_statistics')
    op.drop_index('idx_agent_call_statistics_call_type', table_name='agent_call_statistics')
    op.drop_index('idx_agent_call_statistics_user_id', table_name='agent_call_statistics')
    op.drop_index('idx_agent_call_statistics_agent_id', table_name='agent_call_statistics')
    op.drop_table('agent_call_statistics')

    # Drop deployment_logs table and indexes
    op.drop_index('idx_deployment_logs_agent_id', table_name='deployment_logs')
    op.drop_table('deployment_logs')
