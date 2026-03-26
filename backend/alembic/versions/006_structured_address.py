"""Replace address text field with street, postal_code, city on business_settings and clients

Revision ID: 006
Revises: 005
Create Date: 2026-03-26
"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # business_settings
    op.add_column('business_settings', sa.Column('street', sa.String(255), nullable=True))
    op.add_column('business_settings', sa.Column('postal_code', sa.String(10), nullable=True))
    op.add_column('business_settings', sa.Column('city', sa.String(100), nullable=True))
    op.drop_column('business_settings', 'address')

    # clients
    op.add_column('clients', sa.Column('street', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('postal_code', sa.String(10), nullable=True))
    op.add_column('clients', sa.Column('city', sa.String(100), nullable=True))
    op.drop_column('clients', 'address')


def downgrade() -> None:
    op.add_column('business_settings', sa.Column('address', sa.Text(), nullable=True))
    op.drop_column('business_settings', 'street')
    op.drop_column('business_settings', 'postal_code')
    op.drop_column('business_settings', 'city')

    op.add_column('clients', sa.Column('address', sa.Text(), nullable=True))
    op.drop_column('clients', 'street')
    op.drop_column('clients', 'postal_code')
    op.drop_column('clients', 'city')
