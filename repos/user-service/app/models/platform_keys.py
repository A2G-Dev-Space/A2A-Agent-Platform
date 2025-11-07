"""Platform API key models."""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class PlatformKey(Base):
    __tablename__ = "platform_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key = Column(String, unique=True, nullable=False, index=True)  # Store as a2g_ prefix + hash
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="platform_keys")


# Update User model relationship
def update_user_model():
    from app.models.users import User
    if not hasattr(User, 'platform_keys'):
        User.platform_keys = relationship("PlatformKey", back_populates="user", cascade="all, delete-orphan")