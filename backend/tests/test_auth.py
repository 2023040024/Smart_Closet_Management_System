import sys, os
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