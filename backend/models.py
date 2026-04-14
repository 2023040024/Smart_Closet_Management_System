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

class TopFitEnum(str, enum.Enum):
    slim    = "슬림"
    regular = "레귤러"
    over    = "오버핏"
    crop    = "크롭"

class BottomFitEnum(str, enum.Enum):
    slim     = "슬림"
    straight = "스트레이트"
    wide     = "와이드"
    jogger   = "조거"
    tapered  = "테이퍼드"

class ColorEnum(str, enum.Enum):
    black      = "블랙"
    white      = "화이트"
    gray       = "그레이"
    charcoal   = "차콜"
    navy       = "네이비"
    beige      = "베이지"
    ivory      = "아이보리"
    brown      = "브라운"
    camel      = "카멜"
    khaki      = "카키"
    olive      = "올리브"
    blue       = "블루"
    skyblue    = "스카이블루"
    red        = "레드"
    pink       = "핑크"

class SeasonEnum(str, enum.Enum):
    spring   = "봄"
    summer   = "여름"
    autumn   = "가을"
    winter   = "겨울"
    all_year = "사계절"

class ToneEnum(str, enum.Enum):
    bright   = "화사한"
    vivid    = "선명한"
    calm     = "차분한"
    deep     = "진한"

class StyleEnum(str, enum.Enum):
    casual      = "캐주얼"
    semi_casual = "세미캐주얼"
    formal      = "포멀"
    minimal     = "미니멀"
    street      = "스트릿"
    dandy       = "댄디"
    sporty      = "스포티"
    vintage     = "빈티지"
    amekaji     = "아메카지"
    gorpcore    = "고프코어"

class MoodEnum(str, enum.Enum):
    active       = "활동적인"
    sophisticated = "세련된"
    cute         = "귀여운"
    hip          = "힙한"
    calm         = "차분한"
    luxury       = "고급스러운"

class MaterialEnum(str, enum.Enum):
    knit   = "니트"
    denim  = "데님"
    cotton = "코튼"
    leather = "레더"
    nylon  = "나일론"
    padding = "패딩"

class ThicknessEnum(str, enum.Enum):
    thin     = "얇음"
    medium   = "보통"
    thick    = "두꺼움"

class PointEnum(str, enum.Enum):
    printing = "프린팅"
    layered  = "레이어드"
    color    = "컬러포인트"
    plain    = "무지"
    stripe   = "스트라이프"
    check    = "체크"

class StatusEnum(str, enum.Enum):
    wearable  = "착용가능"
    need_wash = "세탁필요"
    washing   = "세탁중"
    repair    = "수선중"
    stored    = "보관중"

class SituationEnum(str, enum.Enum):
    daily   = "데일리"
    business = "비즈니스"
    interview = "면접"
    wedding = "결혼식"
    funeral = "장례식"
    exercise = "운동"
    date     = "데이트"
    meeting = "모임"
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
    color          = Column(Enum(ColorEnum), nullable=False)
    top_fit        = Column(Enum(TopFitEnum), nullable=True)     # 상의일 때만 사용
    bottom_fit     = Column(Enum(BottomFitEnum), nullable=True)  # 하의일 때만 사용
    season         = Column(Enum(SeasonEnum), nullable=False)
    style          = Column(Enum(StyleEnum), nullable=False)
    tone           = Column(Enum(ToneEnum), nullable=True)
    mood           = Column(Enum(MoodEnum), nullable=True)
    material       = Column(Enum(MaterialEnum), nullable=True)   # 면, 폴리, 울, 니트 등
    point          = Column(Enum(PointEnum), nullable=True)
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
