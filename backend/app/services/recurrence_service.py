from typing import Optional
from datetime import datetime, timezone, timedelta
import json

from app.models.task import Recurrence
from app.models.enums import RecurrenceType


class RecurrenceService:
    """
    Isolated recurrence logic. All recurrence calculations happen here.
    Never duplicate this logic in routes or other services.
    """

    def next_occurrence(self, recurrence: Recurrence, from_date: datetime) -> Optional[datetime]:
        """Calculate the next occurrence date after from_date."""
        interval = recurrence.interval or 1

        if recurrence.type == RecurrenceType.daily:
            return from_date + timedelta(days=interval)

        elif recurrence.type == RecurrenceType.weekly:
            if recurrence.days_of_week:
                try:
                    dow_list = json.loads(recurrence.days_of_week)
                    return self._next_day_of_week(from_date, dow_list, interval)
                except Exception:
                    pass
            return from_date + timedelta(weeks=interval)

        elif recurrence.type == RecurrenceType.monthly:
            month = from_date.month + interval
            year = from_date.year + (month - 1) // 12
            month = (month - 1) % 12 + 1
            day = min(from_date.day, self._days_in_month(year, month))
            return from_date.replace(year=year, month=month, day=day)

        elif recurrence.type == RecurrenceType.yearly:
            return from_date.replace(year=from_date.year + interval)

        return None

    def is_expired(self, recurrence: Recurrence, occurrence_count: int, next_date: datetime) -> bool:
        """Check if a recurrence has reached its end condition."""
        if recurrence.end_date and next_date > recurrence.end_date:
            return True
        if recurrence.max_occurrences and occurrence_count >= recurrence.max_occurrences:
            return True
        return False

    def _next_day_of_week(
        self, from_date: datetime, days: list[int], interval_weeks: int
    ) -> datetime:
        """Find the next occurrence matching days of week."""
        current = from_date + timedelta(days=1)
        for _ in range(7 * interval_weeks + 7):
            if current.weekday() in days:
                return current
            current += timedelta(days=1)
        return from_date + timedelta(weeks=interval_weeks)

    def _days_in_month(self, year: int, month: int) -> int:
        import calendar
        return calendar.monthrange(year, month)[1]
