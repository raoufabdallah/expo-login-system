from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from backend.db import get_db
from backend.models.user import User

router = APIRouter()

class UserLogin(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not db_user.password == user.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"message": "login successful", "id": db_user.id, "name": db_user.name, "email": db_user.email}
