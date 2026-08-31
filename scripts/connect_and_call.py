"""Connect a toolkit for a user, then make one real tool call.

    python app/connect_and_call.py LINKEDIN LINKEDIN_GET_MY_INFO
    python app/connect_and_call.py INSTAGRAM INSTAGRAM_GET_USER_INFO '{"ig_user_id": "..."}'

If the user has not authorized the app yet, this prints a Connect Link and
waits for authorization, then runs the call.
"""

import json
import sys

from composio_session import get_session


def is_connected(session, toolkit: str) -> bool:
    """Check live connection state for one toolkit.

    `toolkits()` returns ToolkitConnectionState items keyed by a lowercase
    `slug`, with the state under `connection.is_active`.
    """
    details = session.toolkits(toolkits=[toolkit])
    for item in details.items or []:
        if (item.slug or "").upper() == toolkit.upper():
            connection = getattr(item, "connection", None)
            return bool(connection and connection.is_active)
    return False


def ensure_connected(session, toolkit: str) -> None:
    if is_connected(session, toolkit):
        print(f"[ok] {toolkit} already connected")
        return

    request = session.authorize(toolkit)
    print(f"\n[action needed] Authorize {toolkit}:\n\n    {request.redirect_url}\n")
    print("Waiting for you to finish authorizing...")
    request.wait_for_connection()
    print(f"[ok] {toolkit} connected")


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2

    toolkit, tool_slug = sys.argv[1], sys.argv[2]
    arguments = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}

    session = get_session()
    print(f"[session] {session.session_id}")

    ensure_connected(session, toolkit)

    print(f"\n[executing] {tool_slug} {arguments or ''}")
    response = session.execute(tool_slug, arguments=arguments)

    payload = response.model_dump() if hasattr(response, "model_dump") else dict(response)
    print("\n[result]")
    print(json.dumps(payload, indent=2, default=str)[:4000])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
