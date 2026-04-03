"""Supabase token authentication for FastAPI."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.supabase import get_supabase_client

_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Verify Supabase access token and return the user_id.

    Raises 401 if the token is missing, expired, or invalid.
    """
    token = credentials.credentials
    try:
        res = get_supabase_client().auth.get_user(token)
        if not res.user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
        return res.user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
