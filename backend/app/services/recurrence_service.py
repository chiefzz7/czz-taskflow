from typing import Optional, List
from datetime import datetime, timezone, timedelta
import json
import calendar

from app.models.task import Recurrence
from app.models.enums import RecurrenceType


class RecurrenceService:
    """
    Isolated recurrence logic. All recurrence calculations happen here.
    Never duplicate this logic in routes or other services.
    """

    def next_occurrence(self, recurrence: Recurrence, from_date: datetime) -> Optional[datetime]:
        """Calculate the next occurrence date after from_date."""
        interval = max(recurrence.interval or 1, 1)

        # 1. If days_of_month is set (e.g. [1, 10, 15])
        if recurrence.days_of_month:
            try:
                dom_list = sorted(list(set(json.loads(recurrence.days_of_month))))
                if dom_list:
                    return self._next_day_of_month(from_date, dom_list, interval if recurrence.type == RecurrenceType.monthly else 1)
            except Exception:
                pass

        # 2. Daily
        if recurrence.type == RecurrenceType.daily:
            return from_date + timedelta(days=interval)

        # 3. Weekly
        elif recurrence.type == RecurrenceType.weekly:
            if recurrence.days_of_week:
                try:
                    dow_list = sorted(list(set(json.loads(recurrence.days_of_week))))
                    if dow_list:
                        return self._next_day_of_week(from_date, dow_list, interval)
                except Exception:
                    pass
            return from_date + timedelta(weeks=interval)

        # 4. Monthly
        elif recurrence.type == RecurrenceType.monthly:
            month = from_date.month + interval
            year = from_date.year + (month - 1) // 12
            month = (month - 1) % 12 + 1
            day = min(from_date.day, self._days_in_month(year, month))
            return from_date.replace(year=year, month=month, day=day)

        # 5. Yearly
        elif recurrence.type == RecurrenceType.yearly:
            year = from_date.year + interval
            day = min(from_date.day, self._days_in_month(year, from_date.month))
            return from_date.replace(year=year, day=day)

        return None

    def is_expired(self, recurrence: Recurrence, occurrence_count: int, next_date: datetime) -> bool:
        """Check if a recurrence has reached its end condition."""
        if recurrence.end_date and next_date > recurrence.end_date:
            return True
        if recurrence.max_occurrences and occurrence_count >= recurrence.max_occurrences:
            return True
        return False

    def generate_occurrences_in_range(
        self,
        recurrence: Recurrence,
        base_date: datetime,
        start_range: datetime,
        end_range: datetime,
        max_count: int = 100,
    ) -> List[datetime]:
        """Generate list of occurrence datetimes falling within [start_range, end_range]."""
        occurrences: List[datetime] = []
        curr = base_date
        count = 0

        # If base_date is in range
        if start_range <= curr <= end_range:
            occurrences.append(curr)
            count += 1

        while count < max_count:
            nxt = self.next_occurrence(recurrence, curr)
            if not nxt:
                break
            count += 1
            if self.is_expired(recurrence, count, nxt) or nxt > end_range:
                break
            if nxt >= start_range:
                occurrences.append(nxt)
            curr = nxt

        return occurrences

    def _next_day_of_week(
        self, from_date: datetime, days: List[int], interval_weeks: int
    ) -> datetime:
        """Find next occurrence for days of week (0=Mon, ..., 6=Sun)."""
        current_dow = from_date.weekday()
        # Find next day in the same week
        for d in days:
            if d > current_dow:
                return from_date + timedelta(days=d - current_dow)

        # Roll over to next interval week
        days_to_next_week = (7 - current_dow) + (interval_weeks - 1) * 7 + days[0]
        return from_date + timedelta(days=days_to_next_week)

    def _next_day_of_month(
        self, from_date: datetime, dom_list: List[int], interval_months: int
    ) -> datetime:
        """Find next occurrence for specific days of the month (e.g. [1, 10, 15])."""
        # Look for day in same month
        for d in dom_list:
            if d > from_date.day:
                max_d = self._days_in_month(from_date.year, from_date.month)
                return from_date.replace(day=min(d, max_d))

        # Roll over to next month
        m = from_date.month + interval_months
        y = from_date.year + (m - 1) // 12
        m = (m - 1) % 12 + 1
        target_day = dom_list[0]
        max_d = self._days_in_month(y, m)
        return from_date.replace(year=y, month=m, day=min(target_day, max_d))

    def _days_in_month(self, year: int, month: int) -> int:
        return calendar.monthrange(year, month)[1]
