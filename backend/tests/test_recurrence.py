import pytest
from datetime import datetime, timezone
import json

from app.models.task import Recurrence
from app.models.enums import RecurrenceType
from app.services.recurrence_service import RecurrenceService


def test_recurrence_daily():
    svc = RecurrenceService()
    rec = Recurrence(type=RecurrenceType.daily, interval=2)
    base = datetime(2026, 10, 1, 10, 0, tzinfo=timezone.utc)
    nxt = svc.next_occurrence(rec, base)
    assert nxt == datetime(2026, 10, 3, 10, 0, tzinfo=timezone.utc)


def test_recurrence_days_of_month():
    svc = RecurrenceService()
    # User example: todo dia (1, 10, 15)
    rec = Recurrence(type=RecurrenceType.daily, days_of_month=json.dumps([1, 10, 15]))
    
    # 5th of October -> next is 10th of October
    base = datetime(2026, 10, 5, 9, 0, tzinfo=timezone.utc)
    nxt = svc.next_occurrence(rec, base)
    assert nxt == datetime(2026, 10, 10, 9, 0, tzinfo=timezone.utc)

    # 10th of October -> next is 15th of October
    nxt2 = svc.next_occurrence(rec, nxt)
    assert nxt2 == datetime(2026, 10, 15, 9, 0, tzinfo=timezone.utc)

    # 15th of October -> rolls to 1st of November
    nxt3 = svc.next_occurrence(rec, nxt2)
    assert nxt3 == datetime(2026, 11, 1, 9, 0, tzinfo=timezone.utc)


def test_recurrence_weekly_days_of_week():
    svc = RecurrenceService()
    # Seg (0), Qua (2), Qui (3)
    rec = Recurrence(type=RecurrenceType.weekly, interval=1, days_of_week=json.dumps([0, 2, 3]))
    
    # 2026-10-05 is Monday (0)
    monday = datetime(2026, 10, 5, 14, 0, tzinfo=timezone.utc)
    assert monday.weekday() == 0
    
    # Next should be Wednesday (2) -> 2026-10-07
    nxt_wed = svc.next_occurrence(rec, monday)
    assert nxt_wed.weekday() == 2
    assert nxt_wed == datetime(2026, 10, 7, 14, 0, tzinfo=timezone.utc)

    # Next from Wednesday should be Thursday (3) -> 2026-10-08
    nxt_thu = svc.next_occurrence(rec, nxt_wed)
    assert nxt_thu.weekday() == 3
    assert nxt_thu == datetime(2026, 10, 8, 14, 0, tzinfo=timezone.utc)

    # Next from Thursday should roll to next week's Monday (0) -> 2026-10-12
    nxt_mon = svc.next_occurrence(rec, nxt_thu)
    assert nxt_mon.weekday() == 0
    assert nxt_mon == datetime(2026, 10, 12, 14, 0, tzinfo=timezone.utc)


def test_recurrence_monthly():
    svc = RecurrenceService()
    # Every 2 months (a cada X meses)
    rec = Recurrence(type=RecurrenceType.monthly, interval=2)
    base = datetime(2026, 1, 15, 8, 0, tzinfo=timezone.utc)
    nxt = svc.next_occurrence(rec, base)
    assert nxt == datetime(2026, 3, 15, 8, 0, tzinfo=timezone.utc)


def test_recurrence_expiration():
    svc = RecurrenceService()
    end_dt = datetime(2026, 12, 31, 23, 59, tzinfo=timezone.utc)
    rec = Recurrence(type=RecurrenceType.monthly, interval=1, end_date=end_dt, max_occurrences=5)

    assert not svc.is_expired(rec, 3, datetime(2026, 6, 1, tzinfo=timezone.utc))
    assert svc.is_expired(rec, 5, datetime(2026, 6, 1, tzinfo=timezone.utc))
    assert svc.is_expired(rec, 2, datetime(2027, 1, 1, tzinfo=timezone.utc))
