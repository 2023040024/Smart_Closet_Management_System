# Smart_Closet_Management_System

개인화 옷장 관리 최적화 시스템

프로젝트 소개
사용자의 옷장 정보, 착용 기록, 날씨, TPO를 분석하여
개인 맞춤형 코디를 추천하고 옷장 활용도를 극대화하는 서비스

기술 스택
Backend: Python 3.11 + FastAPI
Frontend: React Native + Expo
Database: SQLite
AI: Google Gemini API

의존성
Python 3.11 이상
Node.js 18 이상
pip 24 이상

설치 방법
백엔드
git clone https://github.com/2023040024/Smart_Closet_Management_System
cd Smart_Closet_Management_System/backend
pip install -r requirements.txt

프론트엔드
cd ClosetApp
npm install

실행 방법
백엔드 실행
cd backend
uvicorn main:app --reload

Unit Test 실행
cd backend
pytest --cov=. --cov-report=term-missing

프론트엔드 실행
cd ClosetApp
npx expo start

환경 변수 설정
backend 폴더에 .env 파일 생성 후 아래 내용 입력
GEMINI_API_KEY=발급받은키입력
DATABASE_URL=sqlite:///./closet.db
SECRET_KEY=mysecretkey123

Contributors
김용민 (2023040028) - Frontend
이승찬 (2023040025) - Backend
이준원 (2023040006) - 기록/통계
박선호 (2023040024) - 추천 로직

License
MIT License
