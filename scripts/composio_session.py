"""Composio session wiring for this project.

One place that builds a user-scoped Composio session. Import `get_session`
from your agent/request path instead of constructing Composio inline.
"""

import os
from pathlib import Path

from composio import Composio
from dotenv import load_dotenv

# `composio dev init` writes COMPOSIO_API_KEY / COMPOSIO_TEST_USER_ID to
# .env.local, which python-dotenv does not pick up by default.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env.local")
load_dotenv(PROJECT_ROOT / ".env")

def _check_api_key() -> None:
    """Fail fast on a missing or masked key.

    `composio dev init` can persist the dashboard's masked display form
    (e.g. "ak_ab**wxyz"), which the API rejects with a confusing 401.
    """
    key = os.environ.get("COMPOSIO_API_KEY")
    if not key:
        raise RuntimeError(
            "COMPOSIO_API_KEY is not set. Add it to .env.local from "
            "Dashboard -> Platform -> project -> Settings -> API keys."
        )
    if "*" in key or len(key) < 10:
        raise RuntimeError(
            "COMPOSIO_API_KEY looks masked or truncated. Copy the full "
            "revealed key from the dashboard into .env.local."
        )


_check_api_key()

composio = Composio()


def default_user_id() -> str:
    """The application user this session acts for.

    Replace with your real authenticated user/tenant ID once this project has
    one -- Composio scopes connections per user_id.
    """
    user_id = os.environ.get("COMPOSIO_TEST_USER_ID")
    if not user_id:
        raise RuntimeError(
            "No user id. Set COMPOSIO_TEST_USER_ID in .env.local, or pass one explicitly."
        )
    return user_id


def get_session(user_id: str | None = None):
    """Create a session for one user. Persist `session.session_id` and resume
    with `composio.sessions.get(...)` for multi-turn conversations."""
    return composio.sessions.create(user_id=user_id or default_user_id())
