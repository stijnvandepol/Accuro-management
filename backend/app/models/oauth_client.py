from sqlalchemy import Boolean, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, TimestampMixin


class OAuthClient(TimestampMixin, Base):
    __tablename__ = "oauth_clients"

    client_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    client_secret_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    redirect_uris: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    allowed_scopes: Mapped[str] = mapped_column(
        String(255), nullable=False, default="openid profile email"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
