import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    Date, DateTime, Enum, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from database import Base


# ──────────────────────────────────────────────
# Enum 유효값 정의 (팀 전체 공유 기준)
# B 담당자가 확정 후 팀원에게 공유할 것
# ──────────────────────────────────────────────

class CategoryEnum(str, enum.Enum):
    top      = "상의"
    bottom   = "하의"
    outer    = "아우터"
    shoes    = "신발"
    acc      = "악세사리"

class SeasonEnum(str, enum.Enum):
    spring   = "봄"
    summer   = "여름"
    autumn   = "가을"
    winter   = "겨울"
    all_year = "사계절"

class StyleEnum(str, enum.Enum):
    casual   = "캐주얼"
    formal   = "포멀"
    minimal  = "미니멀"
    street   = "스트릿"

class ThicknessEnum(str, enum.Enum):
    thin     = "thin"
    medium   = "medium"
    thick    = "thick"

class StatusEnum(str, enum.Enum):
    wearable  = "착용가능"
    need_wash = "세탁필요"
    washing   = "세탁중"
    repair    = "수선중"
    stored    = "보관중"

class SituationEnum(str, enum.Enum):
    school   = "학교"
    date     = "데이트"
    interview = "면접"
    exercise = "운동"
    cafe     = "카페"
    travel   = "여행"

class FeedbackTempEnum(str, enum.Enum):
    hot      = "더웠음"
    good     = "적당"
    cold     = "추웠음"

class FeedbackFitEnum(str, enum.Enum):
    comfy    = "편했음"
    normal   = "보통"
    bad      = "불편했음"

class FeedbackTpoEnum(str, enum.Enum):
    good     = "잘맞음"
    normal   = "보통"
    bad      = "안맞음"


# ──────────────────────────────────────────────
# 테이블 모델
# ──────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    user_id          = Column(Integer, primary_key=True, index=True)
    email            = Column(String(100), unique=True, nullable=False, index=True)
    password_hash    = Column(String(255), nullable=False)
    preferred_style  = Column(Enum(StyleEnum), nullable=True)
    temp_sensitivity = Column(Float, default=0.0)  # -2.0(더위) ~ +2.0(추위)
    created_at       = Column(DateTime, default=datetime.utcnow)

    clothes      = relationship("Clothes", back_populates="owner")
    wear_history = relationship("WearHistory", back_populates="user")
    outfits      = relationship("Outfit", back_populates="user")


class Clothes(Base):
    __tablename__ = "clothes"

    clothes_id     = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name           = Column(String(100), nullable=False)
    category       = Column(Enum(CategoryEnum), nullable=False)
    color          = Column(String(50), nullable=False)
    season         = Column(Enum(SeasonEnum), nullable=False)
    style          = Column(Enum(StyleEnum), nullable=False)
    material       = Column(String(50), nullable=True)   # 면, 폴리, 울, 니트 등
    thickness      = Column(Enum(ThicknessEnum), nullable=True)
    purchase_price = Column(Integer, nullable=True)       # 가성비 계산용 (0원 허용)
    image_url      = Column(String(255), nullable=True)
    status         = Column(Enum(StatusEnum), default=StatusEnum.wearable)
    wear_count     = Column(Integer, default=0)
    last_worn_date = Column(Date, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    owner        = relationship("User", back_populates="clothes")
    wear_history = relationship("WearHistory", back_populates="clothes")
    outfit_items = relationship("OutfitClothes", back_populates="clothes")

    @property
    def cost_per_wear(self):
        """가성비 계산: wear_count=0이면 None 반환"""
        if self.purchase_price is None:
            return None
        if self.wear_count == 0:
            return None  # "계산불가" 처리
        return round(self.purchase_price / self.wear_count, 0)


class WearHistory(Base):
    __tablename__ = "wear_history"

    history_id           = Column(Integer, primary_key=True, index=True)
    user_id              = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    clothes_id           = Column(Integer, ForeignKey("clothes.clothes_id"), nullable=False)
    worn_date            = Column(Date, nullable=False)
    feedback_temperature = Column(Enum(FeedbackTempEnum), nullable=True)
    feedback_fit         = Column(Enum(FeedbackFitEnum), nullable=True)
    feedback_tpo         = Column(Enum(FeedbackTpoEnum), nullable=True)
    memo                 = Column(String(200), nullable=True)
    created_at           = Column(DateTime, default=datetime.utcnow)

    user    = relationship("User", back_populates="wear_history")
    clothes = relationship("Clothes", back_populates="wear_history")


class Outfit(Base):
    __tablename__ = "outfits"

    outfit_id         = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    recommended_date  = Column(Date, nullable=False)
    situation         = Column(Enum(SituationEnum), nullable=True)
    weather_condition = Column(String(50), nullable=True)  # 맑음, 흐림, 비, 눈
    temperature       = Column(Float, nullable=True)        # 기온(°C)
    total_score       = Column(Float, nullable=True)        # S 점수
    is_worn           = Column(Boolean, default=False)
    created_at        = Column(DateTime, default=datetime.utcnow)

    user   = relationship("User", back_populates="outfits")
    items  = relationship("OutfitClothes", back_populates="outfit")


class OutfitClothes(Base):
    """Outfit과 Clothes 사이 다대다 연결 테이블"""
    __tablename__ = "outfit_clothes"

    id         = Column(Integer, primary_key=True, index=True)
    outfit_id  = Column(Integer, ForeignKey("outfits.outfit_id"), nullable=False)
    clothes_id = Column(Integer, ForeignKey("clothes.clothes_id"), nullable=False)
    role       = Column(Enum(CategoryEnum), nullable=False)  # 이 코디에서의 역할

    outfit  = relationship("Outfit", back_populates="items")
    clothes = relationship("Clothes", back_populates="outfit_items")
