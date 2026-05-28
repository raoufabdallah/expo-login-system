from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.secret import link

DATABASE_URL = link
engine = create_engine(DATABASE_URL)

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