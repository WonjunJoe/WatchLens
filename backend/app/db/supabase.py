import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

_url = os.getenv("SUPABASE_URL", "")
_key = os.getenv("SUPABASE_KEY", "")
_client: Client | None = None


def get_supabase_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(_url, _key)
    return _client
