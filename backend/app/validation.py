"""Pure logic: find common requirements and combine top requirements (ported from lib/validation.ts)."""

import re


def find_common_requirements(reqs1: list[str], reqs2: list[str]) -> list[str]:
    """
    Requirements are "common" if they share at least 2 words (case-insensitive).
    Returns up to 5 items from reqs1 that match some req in reqs2.
    """
    common: list[str] = []
    lower_reqs2 = [r.lower() for r in reqs2]

    for req1 in reqs1:
        lower_req1 = req1.lower()
        words1 = re.split(r"\s+", lower_req1)
        for req2_lower in lower_reqs2:
            words2 = re.split(r"\s+", req2_lower)
            common_words = [w for w in words1 if w in words2]
            if len(common_words) >= 2:
                common.append(req1)
                break

    return common[:5]


def combine_top_requirements(reqs1: list[str], reqs2: list[str]) -> list[str]:
    """First 3 from reqs1, first 2 from reqs2, then take first 5."""
    combined = list(reqs1[:3]) + list(reqs2[:2])
    return combined[:5]