from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from backend.db import engine, Base
from backend.routers.signup import router as signup_router
from backend.routers.login import router as login_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "https://m4wqgak-anonymous-8081.exp.direct/",
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.exp\.direct$|http://localhost:8081$|http://127\.0\.0\.1:8081$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(signup_router)
app.include_router(login_router)

@app.get("/")
def home():
    return {"message": "Server is running"}