from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db import SessionLocal, engine, Base
from test import User
import models

# creates the table in postgres if it doesn't exist yet
Base.metadata.create_all(bind=engine)

app = FastAPI()

# this is the shape of data coming from your Expo app
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

# dependency — gives each request its own db connection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    new_user = models.User(
        name=user.name,
        email=user.email,
        password=user.password    # ⚠️ hash this before storing (see below)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return { "message": "User created", "id": new_user.id }