import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from unittest.mock import MagicMock
from models import TpoScore, FeedbackTpoEnum, FeedbackTempEnum
from routers.feedback import update_tpo_score, update_temp_sensitivity


def make_db(existing_score=None):
    db = MagicMock()
    if existing_score is not None:
        rec = MagicMock()
        rec.score = existing_score
        db.query.return_value.filter.return_value.first.return_value = rec
    else:
        db.query.return_value.filter.return_value.first.return_value = None
    return db


class TestUpdateTpoScoreBad:
    def test_bad_신규_레코드_없으면_score_95_생성(self):
        db = make_db(existing_score=None)
        update_tpo_score(db, clothes_id=1, situation="면접", feedback_tpo=FeedbackTpoEnum.bad)
        db.add.assert_called_once()
        added = db.add.call_args[0][0]
        assert isinstance(added, TpoScore)
        assert added.score == 95

    def test_bad_기존_레코드_점수_5감소(self):
        db = make_db(existing_score=80)
        rec = db.query.return_value.filter.return_value.first.return_value
        update_tpo_score(db, clothes_id=1, situation="면접", feedback_tpo=FeedbackTpoEnum.bad)
        assert rec.score == 75

    def test_bad_점수_0_미만_클램프(self):
        db = make_db(existing_score=3)
        rec = db.query.return_value.filter.return_value.first.return_value
        update_tpo_score(db, clothes_id=1, situation="면접", feedback_tpo=FeedbackTpoEnum.bad)
        assert rec.score == 0


class TestUpdateTpoScoreGood:
    def test_good_기존_점수_5회복(self):
        db = make_db(existing_score=70)
        rec = db.query.return_value.filter.return_value.first.return_value
        update_tpo_score(db, clothes_id=1, situation="데일리", feedback_tpo=FeedbackTpoEnum.good)
        assert rec.score == 75

    def test_good_100_초과_클램프(self):
        db = make_db(existing_score=98)
        rec = db.query.return_value.filter.return_value.first.return_value
        update_tpo_score(db, clothes_id=1, situation="데일리", feedback_tpo=FeedbackTpoEnum.good)
        assert rec.score == 100

    def test_good_레코드_없으면_추가_안함(self):
        db = make_db(existing_score=None)
        update_tpo_score(db, clothes_id=1, situation="데일리", feedback_tpo=FeedbackTpoEnum.good)
        db.add.assert_not_called()

    def test_normal_점수_변화_없음(self):
        db = make_db(existing_score=80)
        rec = db.query.return_value.filter.return_value.first.return_value
        update_tpo_score(db, clothes_id=1, situation="데일리", feedback_tpo=FeedbackTpoEnum.normal)
        assert rec.score == 80
        db.add.assert_not_called()


class TestUpdateTempSensitivity:
    def test_hot_민감도_감소(self):
        user = MagicMock()
        user.temp_sensitivity = 0.5
        update_temp_sensitivity(user, FeedbackTempEnum.hot)
        assert user.temp_sensitivity == 0.0

    def test_cold_민감도_증가(self):
        user = MagicMock()
        user.temp_sensitivity = 0.5
        update_temp_sensitivity(user, FeedbackTempEnum.cold)
        assert user.temp_sensitivity == 1.0

    def test_good_민감도_변화_없음(self):
        user = MagicMock()
        user.temp_sensitivity = 0.5
        update_temp_sensitivity(user, FeedbackTempEnum.good)
        assert user.temp_sensitivity == 0.5

    def test_hot_하한_클램프(self):
        user = MagicMock()
        user.temp_sensitivity = -1.8
        update_temp_sensitivity(user, FeedbackTempEnum.hot)
        assert user.temp_sensitivity == -2.0

    def test_cold_상한_클램프(self):
        user = MagicMock()
        user.temp_sensitivity = 1.8
        update_temp_sensitivity(user, FeedbackTempEnum.cold)
        assert user.temp_sensitivity == 2.0
