from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()  # .env 파일 자동 로드

from database import engine, Base
from routers import auth, clothes, recommend, weather, vision

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title       = "Closet App API",
    description = "옷장 관리 최적화 시스템 (Gemini AI 추천)",
    version     = "0.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

app.mount("/images", StaticFiles(directory="uploaded_images"), name="images")

app.include_router(auth.router)
app.include_router(clothes.router)
app.include_router(recommend.router)
app.include_router(weather.router)
app.include_router(vision.router)

# C 담당자가 추가할 라우터
from routers import history, stats
app.include_router(history.router)
# app.include_router(stats.router)

@app.get("/")
def root():
    return {"message": "Closet App API 실행 중", "docs": "/docs"}