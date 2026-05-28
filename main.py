from fastapi import FastAPI

from backend.db import engine, Base
from backend.routers.signup import router as signup_router

Base.metadata.create_all(bind=engine)

app = FastAPI()


app.include_router(signup_router)


@app.get("/")
def home():
    return {"message": "Server is running"}