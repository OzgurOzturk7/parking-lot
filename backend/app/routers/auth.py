from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..database import get_db
from ..models import AdminUser
from ..schemas import LoginIn, TokenOut
from ..auth import verify_password, create_access_token
from ..config import settings

router = APIRouter(prefix="/admin", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(AdminUser).where(AdminUser.username == payload.username))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, detail={"error": "BAD_CREDENTIALS", "message": "wrong username or password"})
    token = create_access_token(user.username)
    return TokenOut(access_token=token, expires_in=settings.jwt_expire_minutes * 60)
