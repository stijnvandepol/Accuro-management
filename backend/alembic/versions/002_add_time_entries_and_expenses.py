"""add time_entries and expenses tables

Revision ID: 002
Revises: 001
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "time_entries",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("project_workspaces.id"), nullable=False, index=True),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("hours", sa.Numeric(5, 2), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "expenses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("invoice_number", sa.String(100), nullable=True),
        sa.Column("amount_incl_vat", sa.Numeric(10, 2), nullable=False),
        sa.Column("vat_rate", sa.Numeric(5, 2), nullable=False),
        sa.Column("amount_excl_vat", sa.Numeric(10, 2), nullable=False),
        sa.Column("vat_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("expenses")
    op.drop_table("time_entries")
