"""Deterministic API normalization for semantic matching (used when for_apis=True)."""

import re
from typing import TypedDict


class NormalizedApi(TypedDict):
    method: str
    path: str
    tokens: list[str]
    intent: str


# Strip these prefixes (case-insensitive) from paths
PATH_PREFIXES = re.compile(
    r"^/(?:v\d+|api(?:/v\d+)?|rest|graphql|service)(?=/|$)",
    re.IGNORECASE,
)

# Normalize path params: :id, :post_id, <id>, {id} => {id}
PARAM_PATTERN = re.compile(
    r"[:<]([a-zA-Z_][a-zA-Z0-9_]*)[>]?|\{([a-zA-Z_][a-zA-Z0-9_]*)\}"
)
METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}

# Synonym sets for token matching (lowercase)
URL_SHORTENER_TOKENS = {
    "shorten", "short", "tiny", "url", "urls", "link", "links", "redirect", "r",
}
CHAT_TOKENS = {
    "conversation", "conversations", "thread", "threads", "room", "rooms",
    "chat", "chats", "message", "messages", "dm", "dms",
}
FEED_TOKENS = {"feed", "feeds", "timeline", "posts"}
POST_TOKENS = {"post", "posts"}
USER_TOKENS = {"user", "users"}
LIKE_TOKENS = {"like", "likes", "reaction", "reactions"}
NOTIFICATION_TOKENS = {"notification", "notifications", "alert", "alerts"}


def _normalize_param(_m: re.Match[str]) -> str:
    g1, g2 = _m.group(1), _m.group(2)
    name = (g1 or g2 or "id").lower()
    return "{" + name + "}"


def normalize_api(api_line: str) -> NormalizedApi:
    """
    Parse and normalize an API line (e.g. "POST /v1/urls", "POST /shorten – create short URL").
    Returns dict with method, path (stripped, lowercase, params normalized), tokens, and intent.
    """
    line = (api_line or "").strip()
    method = ""
    path = ""
    rest = line

    # Extract method: first word if it's a known HTTP method, or find METHOD before a path
    rest = line
    method = ""
    parts = re.split(r"\s+", line, maxsplit=2)
    if parts and parts[0].upper() in METHODS:
        method = parts[0].upper()
        rest = (parts[1] + " " + parts[2]) if len(parts) > 2 else (parts[1] if len(parts) > 1 else "")
    if not method:
        # e.g. "Create short link POST /v1/urls" -> find POST then path after it
        for m in sorted(METHODS, key=len, reverse=True):
            pat = re.compile(r"\b" + re.escape(m) + r"\b\s+([/\w\-{}:<>]+)", re.IGNORECASE)
            mo = pat.search(line)
            if mo:
                method = m
                rest = mo.group(0).split(m, 1)[1].strip()  # path part after method
                break
    if not method:
        method = ""

    # Extract path: segment starting with / or path-like after method
    path_match = re.search(r"[/](?:[a-zA-Z0-9_\-{}:<>]+/)*[a-zA-Z0-9_\-{}:<>]+", rest)
    if path_match:
        path = path_match.group(0)
    else:
        # e.g. "POST shorten" or "shorten"
        path_match = re.search(r"(?:^|\s)([a-zA-Z0-9_\-/{}:<>]+?)(?:\s+[–-]|\s*$)", rest)
        if path_match:
            path = path_match.group(1).strip()
            if path and not path.startswith("/"):
                path = "/" + path
        if not path or path == "/":
            path = "/" + rest.split()[0] if rest.split() else "/"

    # Strip version/API prefixes
    path = PATH_PREFIXES.sub("", path) or "/"
    path = path.rstrip("/") or "/"
    path = path.lower()

    # Normalize params to {name}
    path = PARAM_PATTERN.sub(_normalize_param, path)

    # Tokens: path segments (skip empty and param-only)
    segments = [s for s in path.split("/") if s and not (s.startswith("{") and s.endswith("}"))]
    tokens = []
    for s in segments:
        if s.startswith("{") and s.endswith("}"):
            continue
        tokens.append(s.lower())
    # Also pull meaningful words from the rest of the line for intent
    desc = re.sub(r"\s+[–-]\s+.*", "", rest).lower()
    desc_words = re.findall(r"[a-zA-Z0-9]+", desc)
    all_tokens = list(dict.fromkeys(tokens + desc_words))

    # Intent heuristics
    intent = _infer_intent(method, path, tokens, all_tokens)

    return {
        "method": method,
        "path": path,
        "tokens": tokens,
        "intent": intent,
    }


def _infer_intent(method: str, path: str, tokens: list[str], all_tokens: list[str]) -> str:
    """Heuristic intent from method + path/tokens."""
    tset = set(tokens) | set(all_tokens)
    path_lower = path.lower()

    # URL shortener
    if method == "POST" and (tset & URL_SHORTENER_TOKENS):
        return "shorten_url"
    if method == "GET" and ("redirect" in path_lower or "r" in path_lower or (tset & {"r", "redirect", "url", "urls", "link", "links"})):
        if "{" in path or ":id" in path.lower() or "id" in tset:
            return "resolve_short_url"
    if (tset & URL_SHORTENER_TOKENS) and not (tset & CHAT_TOKENS):
        if method == "POST":
            return "shorten_url"
        if method == "GET" and (re.search(r"\{[^}]+\}", path) or "r" in tset or "redirect" in tset):
            return "resolve_short_url"

    # Chat / messaging
    if method == "POST" and (tset & {"message", "messages"}):
        return "send_message"
    if method == "GET" and (tset & {"message", "messages"}):
        return "list_messages"
    if method == "POST" and (tset & CHAT_TOKENS - {"message", "messages"}):
        return "create_conversation"
    if method == "GET" and (tset & CHAT_TOKENS - {"message", "messages"}):
        return "list_conversations"

    # Feed / posts
    if method == "GET" and (tset & FEED_TOKENS):
        return "get_feed"
    if method == "POST" and (tset & POST_TOKENS):
        return "create_post"
    if method == "GET" and (tset & POST_TOKENS):
        return "get_post"

    # Likes / reactions
    if method == "POST" and (tset & LIKE_TOKENS):
        return "like"
    if method == "GET" and (tset & NOTIFICATION_TOKENS):
        return "list_notifications"

    return ""


def api_match_by_normalization(
    expected_norm: NormalizedApi,
    user_norm: NormalizedApi,
) -> bool:
    """
    True if expected and user APIs match by method + intent.
    Fallback: token overlap when intent is missing.
    """
    if expected_norm["method"] and user_norm["method"]:
        if expected_norm["method"] != user_norm["method"]:
            return False
    if expected_norm["intent"] and user_norm["intent"]:
        if expected_norm["intent"] == user_norm["intent"]:
            return True
    # Fallback: token similarity (e.g. both have "urls" or "shorten" for shorten_url)
    if not expected_norm["intent"] or not user_norm["intent"]:
        overlap = set(expected_norm["tokens"]) & set(user_norm["tokens"])
        if overlap and expected_norm["method"] == user_norm["method"]:
            return True
        # Same intent family by tokens
        for group in (URL_SHORTENER_TOKENS, CHAT_TOKENS, FEED_TOKENS, POST_TOKENS):
            if set(expected_norm["tokens"]) & group and set(user_norm["tokens"]) & group:
                if expected_norm["method"] == user_norm["method"]:
                    return True
    return False


def compute_api_auto_matches(
    reference: list[str],
    user_answers: list[str],
) -> tuple[list[tuple[str, str]], list[str], list[str]]:
    """
    Normalize reference and user APIs; return (auto_matched_pairs, unmatched_reference, unmatched_user).
    Each pair is (expected_str, user_str).
    """
    ref_norms: list[tuple[str, NormalizedApi]] = [(r, normalize_api(r)) for r in reference]
    user_norms: list[tuple[str, NormalizedApi]] = [(u, normalize_api(u)) for u in user_answers]

    matched_pairs: list[tuple[str, str]] = []
    used_user = set()

    for ref_str, ref_n in ref_norms:
        for i, (user_str, user_n) in enumerate(user_norms):
            if i in used_user:
                continue
            if api_match_by_normalization(ref_n, user_n):
                matched_pairs.append((ref_str, user_str))
                used_user.add(i)
                break

    unmatched_ref = [ref_str for ref_str, _ in ref_norms if ref_str not in {p[0] for p in matched_pairs}]
    unmatched_user = [user_str for i, (user_str, _) in enumerate(user_norms) if i not in used_user]

    return matched_pairs, unmatched_ref, unmatched_user
