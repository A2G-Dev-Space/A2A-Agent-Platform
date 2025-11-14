"""Initial schema for LLM Proxy Service

Revision ID: 000
Revises:
Create Date: 2025-11-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '000'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial tables for LLM Proxy Service"""

    # Create llm_calls table
    op.create_table('llm_calls',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('agent_id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('trace_id', sa.String(), nullable=True),
        sa.Column('provider', sa.String(), nullable=False),
        sa.Column('model', sa.String(), nullable=False),
        sa.Column('request_messages', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('request_params', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('response_content', sa.Text(), nullable=True),
        sa.Column('response_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('request_tokens', sa.Integer(), nullable=True),
        sa.Column('response_tokens', sa.Integer(), nullable=True),
        sa.Column('total_tokens', sa.Integer(), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_llm_calls_agent_id'), 'llm_calls', ['agent_id'], unique=False)
    op.create_index(op.f('ix_llm_calls_model'), 'llm_calls', ['model'], unique=False)
    op.create_index(op.f('ix_llm_calls_session_id'), 'llm_calls', ['session_id'], unique=False)
    op.create_index(op.f('ix_llm_calls_trace_id'), 'llm_calls', ['trace_id'], unique=False)

    # Create trace_events table
    op.create_table('trace_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('agent_id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('trace_id', sa.String(), nullable=True),
        sa.Column('llm_call_id', sa.String(), nullable=True),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('event_data', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('event_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_trace_events_agent_id'), 'trace_events', ['agent_id'], unique=False)
    op.create_index(op.f('ix_trace_events_llm_call_id'), 'trace_events', ['llm_call_id'], unique=False)
    op.create_index(op.f('ix_trace_events_session_id'), 'trace_events', ['session_id'], unique=False)
    op.create_index(op.f('ix_trace_events_trace_id'), 'trace_events', ['trace_id'], unique=False)

    # Create tool_calls table
    op.create_table('tool_calls',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('agent_id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('llm_call_id', sa.String(), nullable=True),
        sa.Column('tool_name', sa.String(), nullable=False),
        sa.Column('tool_args', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('tool_result', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('called_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tool_calls_agent_id'), 'tool_calls', ['agent_id'], unique=False)
    op.create_index(op.f('ix_tool_calls_llm_call_id'), 'tool_calls', ['llm_call_id'], unique=False)
    op.create_index(op.f('ix_tool_calls_session_id'), 'tool_calls', ['session_id'], unique=False)


def downgrade() -> None:
    """Drop all tables"""

    # Drop tool_calls table
    op.drop_index(op.f('ix_tool_calls_session_id'), table_name='tool_calls')
    op.drop_index(op.f('ix_tool_calls_llm_call_id'), table_name='tool_calls')
    op.drop_index(op.f('ix_tool_calls_agent_id'), table_name='tool_calls')
    op.drop_table('tool_calls')

    # Drop trace_events table
    op.drop_index(op.f('ix_trace_events_trace_id'), table_name='trace_events')
    op.drop_index(op.f('ix_trace_events_session_id'), table_name='trace_events')
    op.drop_index(op.f('ix_trace_events_llm_call_id'), table_name='trace_events')
    op.drop_index(op.f('ix_trace_events_agent_id'), table_name='trace_events')
    op.drop_table('trace_events')

    # Drop llm_calls table
    op.drop_index(op.f('ix_llm_calls_trace_id'), table_name='llm_calls')
    op.drop_index(op.f('ix_llm_calls_session_id'), table_name='llm_calls')
    op.drop_index(op.f('ix_llm_calls_model'), table_name='llm_calls')
    op.drop_index(op.f('ix_llm_calls_agent_id'), table_name='llm_calls')
    op.drop_table('llm_calls')
