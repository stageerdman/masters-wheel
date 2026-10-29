import type { PointerEvent as ReactPointerEvent } from "react";
import type { ChatMessage, DockState } from "@/elements/AIAssistant/AIAssistant.script";
import { Composer } from "./children/Composer/Composer";
import { MessageList } from "./children/MessageList/MessageList";
import { useWindowEnterTransition } from "./AIAssistantWindow.script";
import position from "./AIAssistantWindow.position.module.css";
import styles from "./AIAssistantWindow.styles.module.css";

type AIAssistantWindowProps = {
  isClosing: boolean;
  onCollapse: () => void;
  onCollapsed: () => void;
  messages: ChatMessage[];
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  density: "compact" | "comfortable";
  dockState: DockState;
  dragOffset: { x: number; y: number } | null;
  onHeaderPointerDown: (event: ReactPointerEvent) => void;
};

const DOCK_CLASS: Record<DockState, string> = {
  left: position.dockLeft,
  center: position.dockCenter,
  hybrid: position.dockHybrid,
};

export function AIAssistantWindow({
  isClosing,
  onCollapse,
  onCollapsed,
  messages,
  composerValue,
  onComposerChange,
  onSend,
  density,
  dockState,
  dragOffset,
  onHeaderPointerDown,
}: AIAssistantWindowProps) {
  const hasEntered = useWindowEnterTransition();

  function handleTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (isClosing) onCollapsed();
  }

  const showCollapsedGeometry = !hasEntered || isClosing;
  const geometryClass = showCollapsedGeometry ? position.enter : DOCK_CLASS[dockState];
  const visibilityClass = showCollapsedGeometry ? styles.hidden : styles.visible;
  const transitionSpeedClass = isClosing ? position.closing : "";
  const draggingClass = dragOffset ? position.dragging : "";
  const dragStyle = dragOffset
    ? ({ "--drag-x": `${dragOffset.x}px`, "--drag-y": `${dragOffset.y}px` } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={`${styles.root} ${position.root} ${geometryClass} ${visibilityClass} ${transitionSpeedClass} ${draggingClass}`}
      style={dragStyle}
      data-construction
      onTransitionEnd={handleTransitionEnd}
    >
      <div className={`${styles.header} ${position.header}`} data-construction>
        <button
          type="button"
          className={`${styles.collapseButton} ${position.collapseButton}`}
          data-construction
          onClick={onCollapse}
          aria-label="Collapse AI assistant"
        >
          <span className={`${styles.collapseGlyph} ${position.collapseGlyph}`} data-construction />
        </button>
        <div
          className={`${styles.dragHandle} ${position.dragHandle}`}
          data-construction
          onPointerDown={onHeaderPointerDown}
        />
      </div>
      <div className={`${styles.content} ${position.content}`} data-construction>
        <MessageList messages={messages} density={density} />
        <Composer value={composerValue} onChange={onComposerChange} onSend={onSend} density={density} />
      </div>
    </div>
  );
}
