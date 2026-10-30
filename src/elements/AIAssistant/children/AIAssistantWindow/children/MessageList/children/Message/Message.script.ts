import type { Agent } from "@/elements/AIAssistant/AIAssistant.script";

type MdastText = { type: "text"; value: string };
type MdastMention = { type: "mention"; agentId: string; value: string };
type MdastParent = { type: string; children?: unknown[] };
type MdastRoot = { type: "root"; children: unknown[] };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isParent(node: unknown): node is MdastParent {
  return typeof node === "object" && node !== null && Array.isArray((node as MdastParent).children);
}

// A remark plugin (used in Message.tsx's ReactMarkdown) that re-splits
// every plain-text mdast node on "@AgentName" occurrences, same regex
// AIAssistant.script.ts's findMentionedAgents uses to decide who a
// message brought into the conversation. Replaces the old plain-string
// splitMentions now that message text goes through full markdown
// parsing — a mention has to survive being inside a list item, bold run,
// etc., not just top-level text. The resulting "mention" nodes have no
// standard mdast→hast handler; Message.tsx supplies one via
// react-markdown's remarkRehypeOptions, mapping them to a real HTML tag
// (<mark>) it then overrides in `components`.
export function remarkMentions(agents: Agent[]) {
  return function transformer(tree: MdastRoot) {
    if (agents.length === 0) return;
    const pattern = new RegExp(`@(${agents.map((agent) => escapeRegExp(agent.name)).join("|")})\\b`, "g");

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
        nextChildren.push(...splitTextNode(child, pattern, agents));
      }
      node.children = nextChildren;
    }

    visit(tree);
  };
}

function isTextNode(node: unknown): node is MdastText {
  return typeof node === "object" && node !== null && (node as MdastText).type === "text";
}

function splitTextNode(node: MdastText, pattern: RegExp, agents: Agent[]): (MdastText | MdastMention)[] {
  const text = node.value;
  pattern.lastIndex = 0;
  const parts: (MdastText | MdastMention)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const agent = agents.find((candidate) => candidate.name === match![1]);
    parts.push({ type: "mention", agentId: agent?.id ?? "", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (parts.length === 0) return [node];
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}
