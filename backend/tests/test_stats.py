import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

class TestStats:
    def test_미착용_옷_우선순위_조회(self, client, auth_headers, sample_clothes):
        res = client.get("/stats/unworn?current_season=봄", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_착용_빈도_통계_조회(self, client, auth_headers, sample_clothes):
        res = client.get("/stats/frequency", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)


    def test_처분_추천_조회(self, client, auth_headers, sample_clothes):
        res = client.get("/stats/dispose?current_season=봄", headers=auth_headers)
        assert res.status_code == 200
        assert "items" in res.json()
        assert "ai_advice" in res.json()

    def test_가성비_조회(self, client, auth_headers, sample_clothes):
        res = client.get("/stats/cost-per-wear", headers=auth_headers)
        assert res.status_code == 200
        assert "best_efficiency" in res.json()
        assert "worst_efficiency" in res.json()

    def test_옷장_과부하_분석(self, client, auth_headers, sample_clothes):
        res = client.get("/stats/overload", headers=auth_headers)
        assert res.status_code == 200
        assert "total_warnings" in res.json()

    def test_월간_리포트_통합_조회(self, client, auth_headers, sample_clothes):
        res = client.get("/stats/monthly-report", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "ecosystem" in data
        assert "overload" in data