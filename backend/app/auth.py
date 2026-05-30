from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import settings

security = HTTPBearer(auto_error=False)


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def get_current_admin(creds: HTTPAuthorizationCredentials | None = Depends(security)) -> str:
    if creds is None:
        raise HTTPException(401, detail={"error": "NOT_AUTHENTICATED", "message": "invalid or missing token"})
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])
        username = payload.get("sub")
        if not username:
            raise ValueError
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, detail={"error": "TOKEN_EXPIRED", "message": "session expired, log in again"})
    except Exception:
        raise HTTPException(401, detail={"error": "NOT_AUTHENTICATED", "message": "invalid or missing token"})
