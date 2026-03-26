"""rename bank_name to account_holder_name in business_settings

Revision ID: 005
Revises: 004
Create Date: 2026-03-26
"""
from alembic import op

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('business_settings', 'bank_name', new_column_name='account_holder_name')


def downgrade() -> None:
    op.alter_column('business_settings', 'account_holder_name', new_column_name='bank_name')
