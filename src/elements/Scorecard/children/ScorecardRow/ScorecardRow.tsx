"use client";

import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Handlers, State } from "mdast-util-to-hast";
import { formatTimestamp, parseTimestampToSeconds } from "@/lib/transcript";
import type { ScorecardItem } from "@/lib/scorecard";
import type { ScorecardCriterionDef } from "@/lib/settings";
import { RatingPill } from "../RatingPill/RatingPill";
import { remarkTimestamps } from "./ScorecardRow.script";
import position from "./ScorecardRow.position.module.css";
import styles from "./ScorecardRow.styles.module.css";

type ScorecardRowProps = {
  item: ScorecardItem;
  criteria: ScorecardCriterionDef[];
  isExpanded: boolean;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
};

// remarkTimestamps' "timestampLink" nodes have no standard mdast→hast
// handler; this maps them to a real <button> (no extra data carried
// through properties — the button override below re-parses its own
// rendered mm:ss text back into seconds).
const timestampLinkHandlers = {
  timestampLink: (_state: State, node: unknown) => ({
    type: "element",
    tagName: "button",
    properties: {},
    children: [{ type: "text", value: (node as { value: string }).value }],
  }),
} as unknown as Handlers;

// One criterion: label + rating pill, clickable to expand into the
// timestamp(s) that phase occurred at, the AI's reasoning (itself may
// contain inline [MM:SS] references, also clickable), one row open at a
// time (isExpanded/onToggle are lifted into Scorecard.tsx).
export function ScorecardRow({ item, criteria, isExpanded, onToggle, onSeek }: ScorecardRowProps) {
  const criterion = criteria.find((candidate) => candidate.id === item.criterion);

  const components: ComponentPropsWithoutRef<typeof ReactMarkdown>["components"] = {
    p: (props) => <p className={`${styles.reasoning} ${position.reasoning}`} data-construction {...props} />,
    button: ({ children, ...rest }) => {
      const text = Array.isArray(children) ? children.join("") : String(children ?? "");
      const seconds = parseTimestampToSeconds(text);
      return (
        <button
          type="button"
          className={`${styles.inlineTimestamp} ${position.inlineTimestamp}`}
          data-construction
          onClick={() => {
            if (seconds !== null) onSeek(seconds);
          }}
          {...rest}
        >
          {children}
        </button>
      );
    },
  };

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <button
        type="button"
        className={`${styles.header} ${position.header}`}
        data-construction
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span className={`${styles.label} ${position.label}`} data-construction>
          {criterion?.name || "Untitled score"}
        </span>
        <RatingPill rating={item.rating} />
      </button>
      {isExpanded && (
        <div className={`${styles.panel} ${position.panel}`} data-construction>
          {item.timestamps.length > 0 && (
            <div className={position.timestamps} data-construction>
              {item.timestamps.map((seconds, index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.timestamp} ${position.timestamp}`}
                  data-construction
                  onClick={() => onSeek(seconds)}
                >
                  {formatTimestamp(seconds)}
                </button>
              ))}
            </div>
          )}
          <ReactMarkdown remarkPlugins={[remarkTimestamps]} remarkRehypeOptions={{ handlers: timestampLinkHandlers }} components={components}>
            {item.reasoning}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
