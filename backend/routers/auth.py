from datetime import datetime, timedelta, timezone
import os, bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from dotenv import load_dotenv

from database import get_db
from models import User
from schemas import UserSignup, UserLogin, TokenResponse, UserResponse, StyleUpdate

# .env 파일에서 환경변수 로드
load_dotenv()

router = APIRouter(prefix="/auth", tags=["인증"])

# 설정값 - 실제 배포 시 환경변수로 분리할 것
SECRET_KEY  = os.getenv("SECRET_KEY", "your-default-secret-key")
ALGORITHM   = "HS256"
TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

def hash_password(password: str) -> str:
    # 1. 문자열을 바이트로 변환
    pwd_bytes = password.encode('utf-8')
    # 2. 솔트 생성 및 해싱
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    # 3. DB 저장을 위해 다시 문자열로 변환하여 반환
    return hashed.decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        plain.encode('utf-8'), 
        hashed.encode('utf-8')
    )

def create_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(api_key_header), 
    db: Session = Depends(get_db)):
    """
    JWT 토큰을 검증하고 현재 로그인한 사용자 객체를 반환합니다.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="자격 증명을 확인할 수 없습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
    if token.startswith("Bearer "):
        token = token.replace("Bearer ", "")
    try:
        # 1. 토큰 복호화
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # create_token에서 "sub"에 user_id를 넣었으므로 이를 추출
        user_id_from_token: str = payload.get("sub")
        if user_id_from_token is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # 2. 데이터베이스에서 사용자 조회
    # recommend.py에서 current_user.id를 사용하므로 모델의 ID 필드와 매칭
    user = db.query(User).filter(User.id == int(user_id_from_token)).first()
    
    if user is None:
        raise credentials_exception
        
    return user

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(body: UserSignup, db: Session = Depends(get_db)):
    # 이메일 중복 확인
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")

    new_user = User(
        email         = body.email,
        password_hash = hash_password(body.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "access_token": create_token(new_user.id),
        "token_type": "bearer",
        "user": UserResponse.model_validate(new_user).model_dump()
    }


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 틀렸습니다")

    return {
        "access_token": create_token(user.id),
        "token_type": "bearer",
        "user": UserResponse.model_validate(user).model_dump()
    }


@router.put("/me/style", response_model=UserResponse)
def update_style(body: StyleUpdate, 
                 db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    """
    선호 스타일 업데이트
    """
    try:
        current_user.preferred_style = body.preferred_style
        db.commit()
        db.refresh(current_user)
        return UserResponse.model_validate(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"스타일 업데이트 중 오류가 발생했습니다: {str(e)}"
        )