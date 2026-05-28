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
