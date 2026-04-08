from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite (개발용) - MySQL/PostgreSQL로 바꾸려면 이 URL만 수정
DATABASE_URL = "sqlite:///./closet.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite 전용 옵션
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """API에서 DB 세션 주입용"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
