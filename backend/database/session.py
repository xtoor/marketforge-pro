"""
Database session management
Creates and manages SQLite database connections
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL - defaults to SQLite in project root
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./marketforge.db")

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    pool_pre_ping=True,
    echo=False  # Set to True for SQL debugging
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def init_db():
    """
    Initialize database tables
    Creates all tables defined in models
    """
    from .models import Trade, Position, StrategyConfig  # noqa: F401
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    Dependency for FastAPI routes to get database session

    Yields:
        SQLAlchemy Session object

    Example:
        @app.get("/trades")
        def get_trades(db: Session = Depends(get_db)):
            return db.query(Trade).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
