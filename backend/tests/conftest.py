import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import MagicMock
from datetime import date

from database import Base, get_db
from models import StatusEnum, CategoryEnum, ThicknessEnum, MaterialEnum

# ──────────────────────────────────────────────
# 기존 mock 헬퍼 (test_recommend.py, test_tpo_rules.py 단위 테스트용)
# ──────────────────────────────────────────────

def make_clothes(**kwargs):
    c = MagicMock()
    c.status         = kwargs.get("status",         StatusEnum.wearable)
    c.category       = kwargs.get("category",       CategoryEnum.top)
    c.thickness      = kwargs.get("thickness",      ThicknessEnum.medium)
    c.material       = kwargs.get("material",       None)
    c.last_worn_date = kwargs.get("last_worn_date", None)
    c.clothes_id     = kwargs.get("clothes_id",     1)
    c.name           = kwargs.get("name",           "테스트옷")
    c.color          = kwargs.get("color",          "블랙")
    c.season         = kwargs.get("season",         "사계절")
    c.style          = kwargs.get("style",          "캐주얼")
    c.tone           = None
    c.mood           = None
    c.point          = None
    c.wear_count     = kwargs.get("wear_count",     0)
    c.situation      = kwargs.get("situation",      None)
    return c

def make_user(**kwargs):
    u = MagicMock()
    u.temp_sensitivity = kwargs.get("temp_sensitivity", 0.0)
    preferred_style    = kwargs.get("preferred_style",  None)
    if preferred_style:
        mock_style        = MagicMock()
        mock_style.value  = preferred_style
        u.preferred_style = mock_style
    else:
        u.preferred_style = None
    return u


# ──────────────────────────────────────────────
# TestClient 공통 fixture (HTTP 엔드포인트 테스트용)
# 사용법: def test_xxx(self, client, auth_headers, sample_clothes):
# ──────────────────────────────────────────────

BACKEND_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_DB_PATH = os.path.join(BACKEND_DIR, "test_temp.db")
TEST_DB_URL  = f"sqlite:///{TEST_DB_PATH}"


@pytest.fixture
def client():
    """테스트용 DB + FastAPI 앱 클라이언트. 각 테스트 후 DB 초기화됨."""
    from main import app

    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    os.makedirs(os.path.join(BACKEND_DIR, "uploaded_images"), exist_ok=True)

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture
def auth_headers(client):
    """테스트용 계정 가입 + 로그인 후 Authorization 헤더 반환."""
    res = client.post("/auth/signup", json={
        "email": "test@test.com",
        "password": "testpass123"
    })
    assert res.status_code == 201, f"signup 실패: {res.json()}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_clothes(client, auth_headers):
    """기본 옷 3벌 등록 후 반환 (착용기록·통계 테스트용).
    clothes 엔드포인트가 Form 방식이므로 data= 사용."""
    items = [
        {"name": "흰 티셔츠", "category": "상의", "color": "화이트", "season": "사계절", "style": "캐주얼"},
        {"name": "청바지",    "category": "하의", "color": "블루",   "season": "사계절", "style": "캐주얼"},
        {"name": "운동화",    "category": "신발", "color": "화이트", "season": "사계절", "style": "스포티"},
    ]
    results = []
    for item in items:
        res = client.post("/clothes", headers=auth_headers, data=item)
        results.append(res.json())
    return results
