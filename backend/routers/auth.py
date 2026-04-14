from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer

from database import get_db
from models import User
from schemas import UserSignup, UserLogin, TokenResponse, UserResponse, StyleUpdate

router = APIRouter(prefix="/auth", tags=["인증"])

# 설정값 - 실제 배포 시 환경변수로 분리할 것
SECRET_KEY  = "your-secret-key-change-this"
ALGORITHM   = "HS256"
TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(body: UserSignup, db: Session = Depends(get_db)):
    # 이메일 중복 확인
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")

    user = User(
        email         = body.email,
        password_hash = hash_password(body.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token = create_token(user.user_id),
        user         = UserResponse.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 틀렸습니다")

    return TokenResponse(
        access_token = create_token(user.user_id),
        user         = UserResponse.model_validate(user)
    )


@router.put("/me/style", response_model=UserResponse)
def update_style(body: StyleUpdate, db: Session = Depends(get_db)):
    """
    선호 스타일 업데이트
    실제로는 JWT 토큰에서 user_id 추출해야 함 (미들웨어 추가 후 연결)
    """
    # TODO: JWT 미들웨어 완성 후 토큰에서 user_id 파싱
    raise HTTPException(status_code=501, detail="JWT 미들웨어 연결 후 구현")

# 토큰을 추출할 위치 설정 (로그인 엔드포인트와 연결)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    JWT 토큰을 검증하고 현재 로그인한 사용자 객체를 반환합니다.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="자격 증명을 확인할 수 없습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 1. 토큰 복호화
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # create_token에서 "sub"에 user_id를 넣었으므로 이를 추출
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # 2. 데이터베이스에서 사용자 조회
    # recommend.py에서 current_user.id를 사용하므로 모델의 ID 필드와 매칭
    user = db.query(User).filter(User.id == int(user_id)).first()
    
    if user is None:
        raise credentials_exception
        
    return user