const ALLOWED_TAGS = new Set([
  "p","br","span","strong","em","b","i","u","s","del","ins","mark",
  "h1","h2","h3","h4","h5","h6",
  "ul","ol","li",
  "blockquote","pre","code",
  "a","img",
  "table","thead","tbody","tr","td","th",
  "hr","div",
]);

const ALLOWED_ATTRS: Record<string, string[]> = {
  "a":   ["href", "title", "target", "rel"],
  "img": ["src", "alt", "title", "width", "height"],
  "*":   ["class"],
};

export function sanitizeHtml(input: string): string {
  if (typeof document === "undefined") return "";
  const doc = new DOMParser().parseFromString(input, "text/html");
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

function sanitizeNode(node: Element) {
  for (const child of Array.from(node.children)) {
    const tag = child.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      child.remove();
      continue;
    }
    const allowed = new Set([
      ...(ALLOWED_ATTRS[tag] ?? []),
      ...(ALLOWED_ATTRS["*"] ?? []),
    ]);
    for (const attr of Array.from(child.attributes)) {
      if (!allowed.has(attr.name.toLowerCase())) {
        child.removeAttribute(attr.name);
        continue;
      }
      if (attr.name === "href" || attr.name === "src") {
        const val = attr.value.trim().toLowerCase();
        if (
          val.startsWith("javascript:") ||
          val.startsWith("data:text/html") ||
          val.startsWith("vbscript:")
        ) {
          child.removeAttribute(attr.name);
        }
      }
    }
    if (tag === "a" && child.getAttribute("href")) {
      child.setAttribute("target", "_blank");
      child.setAttribute("rel", "noopener noreferrer nofollow");
    }
    sanitizeNode(child);
  }
}
