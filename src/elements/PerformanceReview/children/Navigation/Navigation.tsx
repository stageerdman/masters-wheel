"use client";

import { useState } from "react";
import { SearchBar } from "@/elements/SearchBar/SearchBar";
import { ContextMenu, type ContextMenuItem } from "@/elements/ContextMenu/ContextMenu";
import type { VideoRecord } from "@/elements/PerformanceReview/PerformanceReview.data";
import { VideoListItem } from "./children/VideoListItem/VideoListItem";
import { AddRecordListItem } from "./children/AddRecordListItem/AddRecordListItem";
import position from "./Navigation.position.module.css";
import styles from "./Navigation.styles.module.css";

type NavigationProps = {
  videos: VideoRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddRecord: (paths: string[]) => void;
  onRemoveRecord: (id: string) => void;
  onRemoveMedia: (id: string) => void;
  onOpenFolder: (id: string) => void;
};

type MenuTarget = { video: VideoRecord; x: number; y: number };

export function Navigation({
  videos,
  selectedId,
  onSelect,
  onAddRecord,
  onRemoveRecord,
  onRemoveMedia,
  onOpenFolder,
}: NavigationProps) {
  const [query, setQuery] = useState("");
  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);
  const filtered = videos
    .filter((video) => `${video.title} ${video.date}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <nav className={`${styles.root} ${position.root}`} data-construction>
      <div className={position.searchSlot} data-construction>
        <SearchBar value={query} onChange={setQuery} placeholder="Search sessions" />
      </div>
      <ul className={`${styles.list} ${position.list}`} data-construction>
        {filtered.map((video) => (
          <li key={video.id}>
            <VideoListItem
              video={video}
              active={video.id === selectedId}
              onClick={() => onSelect(video.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                setMenuTarget({ video, x: event.clientX, y: event.clientY });
              }}
            />
          </li>
        ))}
        <li>
          <AddRecordListItem onFilesPicked={onAddRecord} />
        </li>
      </ul>
      {menuTarget && (
        <ContextMenu
          x={menuTarget.x}
          y={menuTarget.y}
          onClose={() => setMenuTarget(null)}
          items={buildMenuItems(menuTarget.video, { onRemoveRecord, onRemoveMedia, onOpenFolder })}
        />
      )}
    </nav>
  );
}

function buildMenuItems(
  video: VideoRecord,
  handlers: {
    onRemoveRecord: (id: string) => void;
    onRemoveMedia: (id: string) => void;
    onOpenFolder: (id: string) => void;
  }
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    { id: "open-folder", label: "Open folder in Finder", onSelect: () => handlers.onOpenFolder(video.id) },
  ];
  if (video.heroFileName) {
    items.push({
      id: "remove-media",
      label: "Remove video",
      onSelect: () => handlers.onRemoveMedia(video.id),
      destructive: true,
    });
  }
  items.push({
    id: "remove-record",
    label: "Remove record",
    onSelect: () => handlers.onRemoveRecord(video.id),
    destructive: true,
  });
  return items;
}
