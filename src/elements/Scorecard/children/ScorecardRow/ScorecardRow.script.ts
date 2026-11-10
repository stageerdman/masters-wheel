// A remark plugin that re-splits plain-text mdast nodes on "[MM:SS]" /
// "[HH:MM:SS]" occurrences, same shape as Message.script.ts's
// remarkMentions — replaces each match with a node of its own so it can be
// rendered as a real clickable element instead of plain text. Unlike
// remarkMentions this carries no extra data through mdast→hast properties
// (that round-trip's exact casing isn't worth depending on): the matched
// mm:ss text is simply the node's rendered children, and the `button`
// components override in ScorecardRow.tsx re-parses it back into seconds.
type MdastText = { type: "text"; value: string };
type MdastTimestampLink = { type: "timestampLink"; value: string };
type MdastParent = { type: string; children?: unknown[] };
type MdastRoot = { type: "root"; children: unknown[] };

const TIMESTAMP_PATTERN = /\[(\d{1,2}(?::\d{2}){1,2})\]/g;

export function remarkTimestamps() {
  return function transformer(tree: MdastRoot) {
    function visit(node: MdastParent) {
      if (!node.children) return;
      const nextChildren: unknown[] = [];
      for (const child of node.children) {
        if (isParent(child)) {
          visit(child);
          nextChildren.push(child);
          continue;
        }
        if (!isTextNode(child)) {
          nextChildren.push(child);
          continue;
        }
        nextChildren.push(...splitTextNode(child));
      }
      node.children = nextChildren;
    }

    visit(tree);
  };
}

function isParent(node: unknown): node is MdastParent {
  return typeof node === "object" && node !== null && Array.isArray((node as MdastParent).children);
}

function isTextNode(node: unknown): node is MdastText {
  return typeof node === "object" && node !== null && (node as MdastText).type === "text";
}

function splitTextNode(node: MdastText): (MdastText | MdastTimestampLink)[] {
  const text = node.value;
  const pattern = new RegExp(TIMESTAMP_PATTERN.source, "g");
  const parts: (MdastText | MdastTimestampLink)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "timestampLink", value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (parts.length === 0) return [node];
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}
