import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Handlers, State } from "mdast-util-to-hast";
import type { Agent, ChatMessage } from "@/elements/AIAssistant/AIAssistant.script";
import { AgentAvatar } from "@/elements/AgentAvatar/AgentAvatar";
import { isReplyPending } from "@/lib/assistant/pendingReplies";
import { remarkMentions } from "./Message.script";
import position from "./Message.position.module.css";
import styles from "./Message.styles.module.css";

type MessageProps = {
  message: ChatMessage;
  density: "compact" | "comfortable";
  agents: Agent[];
  respondingAgent: Agent | undefined;
};

// mdast-util-to-hast's Handlers type is keyed to its own known node
// types — "mention" is Message.script.ts's own addition, not one of
// them, so it needs the cast. The handler turns it into a real <mark>
// (carrying the agent id as a data attribute) rather than inventing a
// fictional HTML tag — `components.mark` below is what actually styles it.
const mentionHandlers = {
  mention: (_state: State, node: unknown) => ({
    type: "element",
    tagName: "mark",
    properties: { dataAgentId: (node as { agentId: string }).agentId },
    children: [{ type: "text", value: (node as { value: string }).value }],
  }),
} as unknown as Handlers;

export function Message({ message, density, agents, respondingAgent }: MessageProps) {
  const role = message.role;
  const densityClass = density === "comfortable" ? position.comfortable : "";
  // Which agent you're talking to stays visible on every one of their
  // replies, not just at the top of a fresh chat — a tiny avatar + name
  // row prepended to each assistant bubble.
  const showAgentLabel = role === "assistant" && Boolean(respondingAgent);
  // An assistant reply starts as an empty placeholder the instant it's
  // sent (see AIAssistant.script.ts's sendMessage) and stays actively
  // "pending" (see src/lib/assistant/pendingReplies) for the whole
  // duration of that one reply, including any stretch where the model
  // is mid-tool-call and no text is streaming at all — a model's own
  // preamble text (e.g. "Let me check that...") makes `message.text`
  // non-empty well before the tool call it describes has actually
  // finished, so checking only for empty text stopped showing any
  // "still working" signal the moment that preamble landed, even though
  // the reply was nowhere near done. Checking `isReplyPending` instead
  // keeps the dots visible for the reply's entire real lifetime, not
  // just its first, usually-shortest stretch.
  const isPending = role === "assistant" && isReplyPending(message.id);

  const components: ComponentPropsWithoutRef<typeof ReactMarkdown>["components"] = {
    p: (props) => <p className={`${styles.paragraph} ${position.paragraph}`} data-construction {...props} />,
    h1: (props) => <p className={`${styles.heading} ${position.heading}`} data-construction {...props} />,
    h2: (props) => <p className={`${styles.heading} ${position.heading}`} data-construction {...props} />,
    h3: (props) => <p className={`${styles.heading} ${position.heading}`} data-construction {...props} />,
    ul: (props) => <ul className={`${styles.list} ${position.list}`} data-construction {...props} />,
    ol: (props) => <ol className={`${styles.list} ${position.list}`} data-construction {...props} />,
    li: (props) => <li className={position.listItem} data-construction {...props} />,
    blockquote: (props) => (
      <blockquote className={`${styles.blockquote} ${position.blockquote}`} data-construction {...props} />
    ),
    hr: () => <hr className={`${styles.hr} ${position.hr}`} data-construction />,
    a: (props) => <a className={styles.link} target="_blank" rel="noreferrer" data-construction {...props} />,
    mark: (props) => <mark className={`${styles.mention} ${position.mention}`} data-construction {...props} />,
    code: ({ className, children, ...rest }) => {
      const isBlock = /language-/.test(className ?? "");
      if (!isBlock) {
        return (
          <code className={`${styles.inlineCode} ${position.inlineCode}`} data-construction {...rest}>
            {children}
          </code>
        );
      }
      const language = className?.replace("language-", "") ?? "";
      return (
        <span className={`${styles.codeBlock} ${position.codeBlock}`} data-construction>
          {language && (
            <span className={`${styles.codeLanguage} ${position.codeLanguage}`} data-construction>
              {language}
            </span>
          )}
          <code className={`${styles.codeBlockInner} ${position.codeBlockInner}`} data-construction {...rest}>
            {children}
          </code>
        </span>
      );
    },
    pre: (props) => <pre className={`${styles.pre} ${position.pre}`} data-construction {...props} />,
    table: (props) => (
      <div className={`${styles.tableWrap} ${position.tableWrap}`} data-construction>
        <table className={`${styles.table} ${position.table}`} data-construction {...props} />
      </div>
    ),
    th: (props) => <th className={`${styles.th} ${position.th}`} data-construction {...props} />,
    td: (props) => <td className={`${styles.td} ${position.td}`} data-construction {...props} />,
  };

  return (
    <div
      className={`${styles.root} ${position.root} ${styles[role]} ${position[role]} ${densityClass}`}
      data-construction
    >
      {showAgentLabel && respondingAgent && (
        <span className={`${styles.agentLabel} ${position.agentLabel}`} data-construction>
          <AgentAvatar agent={respondingAgent} size={16} />
          {respondingAgent.name}
        </span>
      )}
      {message.text !== "" && (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, [remarkMentions, agents]]}
          remarkRehypeOptions={{ handlers: mentionHandlers }}
          components={components}
        >
          {message.text}
        </ReactMarkdown>
      )}
      {isPending && (
        <span className={`${styles.thinking} ${position.thinking}`} data-construction aria-label="Still working">
          <span className={`${styles.thinkingDot} ${position.thinkingDot}`} data-construction />
          <span className={`${styles.thinkingDot} ${position.thinkingDot}`} data-construction />
          <span className={`${styles.thinkingDot} ${position.thinkingDot}`} data-construction />
        </span>
      )}
    </div>
  );
}
