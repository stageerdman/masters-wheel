"use client";

import { useState, type MouseEvent } from "react";
import { AnchoredPopup } from "@/elements/AnchoredPopup/AnchoredPopup";
import { ContextMenu, type ContextMenuItem } from "@/elements/ContextMenu/ContextMenu";
import { SpaceIcon } from "@/elements/SpaceIcon/SpaceIcon";
import { useAnchoredPopup } from "@/lib/useAnchoredPopup";
import { useSpaces, type Space } from "@/lib/spaces";
import { CreateSpaceModal } from "./children/CreateSpaceModal/CreateSpaceModal";
import { DeleteSpaceModal } from "./children/DeleteSpaceModal/DeleteSpaceModal";
import { EditSpaceModal } from "./children/EditSpaceModal/EditSpaceModal";
import { SpaceRow } from "./children/SpaceRow/SpaceRow";
import position from "./SpaceSwitcher.position.module.css";
import styles from "./SpaceSwitcher.styles.module.css";

type ContextMenuState = { space: Space; x: number; y: number };

// The top-right corner control on Main Menu: current Space's icon + name,
// opens a dropdown of every Space (+ "Add Space"). Right-clicking a row
// offers "Delete Space" — omitted entirely rather than shown disabled
// when it's the last remaining Space, since there's nothing a tooltip
// would need to explain that the row's absence doesn't already say.
export function SpaceSwitcher() {
  const { spaces, activeSpace, switchSpace, createSpace, renameSpace, deleteSpace } = useSpaces();
  const { anchorRef, open, anchorRect, toggleOpen, close } = useAnchoredPopup<HTMLButtonElement>();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Space | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Space | null>(null);

  function handleSelect(space: Space) {
    close();
    if (space.id !== activeSpace.id) void switchSpace(space.id);
  }

  function handleRowContextMenu(event: MouseEvent<HTMLButtonElement>, space: Space) {
    event.preventDefault();
    setContextMenu({ space, x: event.clientX, y: event.clientY });
  }

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? [
        { id: "edit", label: "Edit Space", onSelect: () => setEditTarget(contextMenu.space) },
        ...(spaces.length > 1
          ? [{ id: "delete", label: "Delete Space", destructive: true, onSelect: () => setDeleteTarget(contextMenu.space) }]
          : []),
      ]
    : [];

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`${styles.trigger} ${position.trigger}`}
        data-construction
        onClick={toggleOpen}
        aria-label={`Switch Space — currently ${activeSpace.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <SpaceIcon icon={activeSpace.icon} size={22} />
      </button>

      {open && anchorRect && (
        <AnchoredPopup anchorRect={anchorRect} onClose={close}>
          <div className={`${styles.list} ${position.list}`} data-construction role="menu">
            {spaces.map((space) => (
              <SpaceRow
                key={space.id}
                space={space}
                active={space.id === activeSpace.id}
                onClick={() => handleSelect(space)}
                onContextMenu={(event) => handleRowContextMenu(event, space)}
              />
            ))}
            <button
              type="button"
              className={`${styles.addRow} ${position.addRow}`}
              data-construction
              onClick={() => {
                close();
                setIsCreateOpen(true);
              }}
            >
              <span className={`${styles.addGlyph} ${position.addGlyph}`} data-construction aria-hidden="true">
                +
              </span>
              Add Space
            </button>
          </div>
        </AnchoredPopup>
      )}

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenuItems} onClose={() => setContextMenu(null)} />
      )}

      {isCreateOpen && (
        <CreateSpaceModal
          onClose={() => setIsCreateOpen(false)}
          onCreate={async (name, icon) => {
            await createSpace(name, icon);
            setIsCreateOpen(false);
          }}
        />
      )}

      {editTarget && (
        <EditSpaceModal
          space={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={async (name, icon) => {
            await renameSpace(editTarget.id, name, icon);
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteSpaceModal
          space={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteSpace(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </>
  );
}
