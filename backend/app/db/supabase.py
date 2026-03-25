import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

_url = os.getenv("SUPABASE_URL", "")
_key = os.getenv("SUPABASE_KEY", "")


def get_supabase_client() -> Client:
    return create_client(_url, _key)
