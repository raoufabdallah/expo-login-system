from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from backend.db import get_db
from backend.models.user import User
from backend.auth.security import verify_password, create_access_token
from backend.auth.deps import get_current_user


router = APIRouter()

class UserLogin(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(user: UserLogin,response : Response, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": str(db_user.id)})

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,   # local dev over http; set True in production (https)
        samesite="none",
        max_age=1800,
    )

    return {"message": "login successful", "id": db_user.id, "name": db_user.name, "email": db_user.email}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True,
        samesite="none",
    )
    return {"message": "logged out"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email}
