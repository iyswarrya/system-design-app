"""Extract text labels from draw.io (diagrams.net) XML for diagram validation."""

import re
import xml.etree.ElementTree as ET


def _strip_html(text: str) -> str:
    """Remove HTML tags and decode common entities."""
    if not text or not isinstance(text, str):
        return ""
    # Remove tags
    out = re.sub(r"<[^>]+>", " ", text)
    out = re.sub(r"&nbsp;", " ", out)
    out = re.sub(r"&lt;", "<", out)
    out = re.sub(r"&gt;", ">", out)
    out = re.sub(r"&amp;", "&", out)
    out = " ".join(out.split())
    return out.strip()


def extract_text_from_drawio_xml(xml_string: str) -> list[str]:
    """
    Parse draw.io/diagrams.net XML and return a list of non-empty text labels
    from mxCell 'value' attributes. Used to compare user's diagram to LLM expected elements.
    """
    if not xml_string or not xml_string.strip():
        return []
    try:
        root = ET.fromstring(xml_string)
    except ET.ParseError:
        return []
    texts: list[str] = []
    seen: set[str] = set()
    # draw.io uses mxfile > mxGraphModel > root > mxCell; also can be in object tags
    for elem in root.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        if tag != "mxCell":
            continue
        value = elem.get("value")
        if not value:
            continue
        clean = _strip_html(value)
        if not clean or len(clean) < 2:
            continue
        lower = clean.lower()
        if lower not in seen:
            seen.add(lower)
            texts.append(clean)
    print("[diagram] Labels from draw.io xml_string:", texts)
    return texts
