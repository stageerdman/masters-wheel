import type { Agent } from "@/elements/AIAssistant/AIAssistant.script";
import type { PermissionDecision, PermissionRequestPayload } from "@/lib/mcp/types";
import position from "./PermissionRequest.position.module.css";
import styles from "./PermissionRequest.styles.module.css";

type PermissionRequestProps = {
  request: PermissionRequestPayload;
  agent: Agent | undefined;
  onRespond: (decision: PermissionDecision) => void;
};

// Renders in place of an ordinary Message bubble (see MessageList.tsx)
// whenever message.permissionRequest is set — the inline Decline/Allow/
// Always Allow interaction this update's wiki.md describes. Collapses to
// one line the moment a decision is made; never reappears as the full
// card again once resolved.
export function PermissionRequest({ request, agent, onRespond }: PermissionRequestProps) {
  const agentName = agent?.name ?? "The AI";
  const resourceLabel = request.resourceKind === "trainingSession" ? "Training Room session" : "Performance Review record";

  if (request.status !== "pending") {
    const resolutionText: Record<Exclude<typeof request.status, "pending">, string> = {
      declined: `You declined ${agentName}'s access to "${request.resourceTitle}".`,
      allowed: `You allowed ${agentName} to read "${request.resourceTitle}" once.`,
      "always-allowed": `You always allow ${agentName} to read "${request.resourceTitle}" in this chat.`,
      "timed-out": `No response — ${agentName}'s request to read "${request.resourceTitle}" timed out.`,
    };
    return (
      <p className={`${styles.resolved} ${position.resolved}`} data-construction>
        {resolutionText[request.status]}
      </p>
    );
  }

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <p className={`${styles.prompt} ${position.prompt}`} data-construction>
        {agentName} wants to read the {request.document} from {resourceLabel} &ldquo;{request.resourceTitle}
        &rdquo;.
      </p>
      <div className={`${styles.actions} ${position.actions}`} data-construction>
        <button
          type="button"
          className={`${styles.button} ${position.button}`}
          data-construction
          onClick={() => onRespond("decline")}
        >
          Decline
        </button>
        <button
          type="button"
          className={`${styles.button} ${position.button}`}
          data-construction
          onClick={() => onRespond("allow")}
        >
          Allow
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.primary} ${position.button}`}
          data-construction
          onClick={() => onRespond("always-allow")}
        >
          Always Allow
        </button>
      </div>
    </div>
  );
}
