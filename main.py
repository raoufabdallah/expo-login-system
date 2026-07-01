from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from backend.db import engine, Base
from backend.routers.signup import router as signup_router
from backend.routers.login import router as login_router
from backend.auth.security import hash_password

Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(signup_router)
app.include_router(login_router)
#app.include_router(auth_router)

@app.get("/")
def home():
    return {"message": "Server is running"}