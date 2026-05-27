# Smart_Closet_Management_System

## 👗 Re:Fit (개인화 옷장 관리 최적화 시스템)
"오늘 뭐 입지?"에 대한 데이터 기반의 스마트한 해답
사용자의 옷장 데이터, 착용 기록, 실시간 날씨 및 TPO를 AI(Gemini)가 분석하여 최적의 코디를 제안하고 옷장 활용도를 극대화합니다.

## 🚀 프로젝트 소개
사용자의 옷장 정보, 착용 기록, 날씨, TPO를 분석하여
개인 맞춤형 코디를 추천하고 옷장 활용도를 극대화하는 서비스
기존의 단순 코디 앱을 넘어, '추천-기록-통계'의 선순환 구조를 통해 사용자의 의류 활용도를 높이는 데 집중합니다.

- 데이터 기반 추천: 날씨, TPO(시간·장소·상황), 사용자 선호 스타일 반영.
- 옷장 효율화: 착용 기록 분석을 통해 미착용 의류를 식별하고 가성비(1회 착용당 비용) 통계 제공.
- AI 설명: 단순히 옷을 골라주는 것이 아니라, 왜 이 코디를 추천하는지 Gemini API가 타당한 근거를 설명합니다.

## 🛠 기술 스택
Backend: Python + FastAPI
Frontend: JavaScript, React Native + Expo
Database: SQLite
AI: Google Gemini 1.5 Flash API

의존성
```
Python 3.11+
Node.js 18+
pip 24+
이 외 requrements.txt 명시
```

## 💾 설치 방법
1. 환경 변수 설정
backend 폴더에 .env 파일 생성 후 아래 내용 입력
```
GEMINI_API_KEY=발급받은키입력
WEATHER_SERVICE_KEY=발급받은키입력
DATABASE_URL=sqlite:///./closet.db
SECRET_KEY=mysecretkey123
```

2. 백엔드(FastAPI)
```
git clone https://github.com/2023040024/Smart_Closet_Management_System
cd Smart_Closet_Management_System/backend
pip install -r requirements.txt
```

3. 프론트엔드(React Native / Expo)
```
cd ClosetApp
npm install
```

## 📦 실행 방법
1. 백엔드 실행
```
cd backend
uvicorn main:app --reload
```

2. 프론트엔드 실행
```
cd ClosetApp
npx expo start
```

3. Unit Test 실행
```
cd backend
pytest --cov=. --cov-report=term-missing
```

## 👥 Contributors
- 김용민 @aepr23 (2023040028) - Frontend
- 이승찬 @imgoce (2023040025) - Backend
- 이준원 @junsilva21 (2023040006) - 기록/통계
- 박선호 @2023040024 (2023040024) - 추천 로직

## ⚖️ License
이 프로젝트는 [MIT License](./LICENSE)를 따릅니다.
