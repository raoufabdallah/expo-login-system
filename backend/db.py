from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.secret import link

DATABASE_URL = link
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # tests the connection before using it, reconnects if dead
    pool_recycle=300,     # recycle connections every 5 min, before the DB provider kills them
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()