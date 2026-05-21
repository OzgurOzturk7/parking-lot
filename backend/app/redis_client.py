import redis
from .config import settings

r = redis.Redis.from_url(settings.redis_url, decode_responses=True)


def zone_key(zone_id: int) -> str:
    return f"zone:{zone_id}:occupied"


def get_zone(zone_id: int) -> int:
    v = r.get(zone_key(zone_id))
    return int(v) if v is not None else 0


def set_zone(zone_id: int, value: int) -> None:
    r.set(zone_key(zone_id), value)


def incr_zone(zone_id: int) -> int:
    return int(r.incr(zone_key(zone_id)))


def decr_zone(zone_id: int) -> int:
    return int(r.decr(zone_key(zone_id)))
