import sys, os, jose.jwt
from sqlalchemy.orm import Session
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

class TestSignup:
    def test_정상_가입(self, client):
        res = client.post("/auth/signup", json={"email": "new@test.com", "password": "pass123"})
        assert res.status_code == 201

    def test_중복_이메일_거부(self, client):
        client.post("/auth/signup", json={"email": "dup@test.com", "password": "pass123"})
        res = client.post("/auth/signup", json={"email": "dup@test.com", "password": "pass123"})
        assert res.status_code == 400

class TestLogin:
    def test_정상_로그인(self, client):
        client.post("/auth/signup", json={"email": "a@test.com", "password": "pass123"})
        res = client.post("/auth/login", json={"email": "a@test.com", "password": "pass123"})
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_틀린_비밀번호(self, client):
        client.post("/auth/signup", json={"email": "b@test.com", "password": "pass123"})
        res = client.post("/auth/login", json={"email": "b@test.com", "password": "wrong"})
        assert res.status_code == 401

class TestAuthExceptions:
    def test_잘못된_토큰_거부_JWTError(self, client):
        # JWTError 발생 커버: 형식이 완전히 틀린 가짜 토큰 전송
        res = client.put(
            "/auth/me/style", 
            headers={"Authorization": "Bearer invalid_token_string"}, 
            json={"preferred_style": "캐주얼"}
        )
        assert res.status_code == 401

    def test_토큰에_sub가_없는_경우(self, client, monkeypatch):
        # user_id_from_token is None 커버: jwt.decode를 가로채서 sub가 없는 데이터를 반환하게 조작
        monkeypatch.setattr(jose.jwt, "decode", lambda *args, **kwargs: {"other_data": "dummy"})
        
        res = client.put(
            "/auth/me/style", 
            headers={"Authorization": "Bearer dummy_token"}, 
            json={"preferred_style": "캐주얼"}
        )
        assert res.status_code == 401

    def test_존재하지_않는_유저_조회(self, client, monkeypatch):
        # if user is None 커버: jwt.decode를 가로채서 DB에 절대 없는 user_id(예: 99999) 반환
        monkeypatch.setattr(jose.jwt, "decode", lambda *args, **kwargs: {"sub": "99999"})
        
        res = client.put(
            "/auth/me/style", 
            headers={"Authorization": "Bearer dummy_token"}, 
            json={"preferred_style": "캐주얼"}
        )
        assert res.status_code == 401

    def test_스타일_업데이트_DB에러_500(self, client, monkeypatch):
        # HTTP_500_INTERNAL_SERVER_ERROR 커버: DB 커밋 실패 상황
        client.post("/auth/signup", json={"email": "error@test.com", "password": "pass123"})
        login_res = client.post("/auth/login", json={"email": "error@test.com", "password": "pass123"})
        token = login_res.json()["access_token"]
        
        def mock_commit(self):
            raise Exception("강제 DB 에러 발생")
        monkeypatch.setattr(Session, "commit", mock_commit)

        # 스타일 업데이트 API 호출
        res = client.put(
            "/auth/me/style",
            headers={"Authorization": f"Bearer {token}"},
            json={"preferred_style": "캐주얼"}
        )

        assert res.status_code == 500
        assert "스타일 업데이트 중 오류가 발생했습니다" in res.json()["detail"]

class TestStyleUpdate:
    def test_정상_스타일_업데이트(self, client):
        client.post("/auth/signup", json={"email": "style@test.com", "password": "pass123"})
        login_res = client.post("/auth/login", json={"email": "style@test.com", "password": "pass123"})
        token = login_res.json()["access_token"]
        
        res = client.put(
            "/auth/me/style",
            headers={"Authorization": f"Bearer {token}"},
            json={"preferred_style": "캐주얼"}
        )
        
        assert res.status_code == 200
        assert res.json()["preferred_style"] == "캐주얼"