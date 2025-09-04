from sqlalchemy import Column, Integer, String, Boolean
from ..dependencies import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    correo = Column(String(120), unique=True, index=True, nullable=False)
    password = Column(String(200), nullable=False)
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String(6), nullable=True)