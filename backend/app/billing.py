import math
from datetime import datetime
from decimal import Decimal


def calculate_fee(entry: datetime, exit_: datetime, billing_type: str, amount: Decimal, grace_minutes: int):
    duration = int((exit_ - entry).total_seconds() // 60)
    billable = max(0, duration - grace_minutes)
    unit_size = 1 if billing_type == "per_minute" else 60
    units = math.ceil(billable / unit_size) if billable > 0 else 0
    fee = Decimal(units) * Decimal(amount)
    return duration, units, fee
