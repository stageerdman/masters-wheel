"use client";

import { useState } from "react";
import { SearchBar } from "@/elements/SearchBar/SearchBar";
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
};

export function Navigation({ videos, selectedId, onSelect, onAddRecord }: NavigationProps) {
  const [query, setQuery] = useState("");
  const filtered = videos.filter((video) =>
    `${video.title} ${video.date}`.toLowerCase().includes(query.toLowerCase())
  );

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
            />
          </li>
        ))}
        <li>
          <AddRecordListItem onFilesPicked={onAddRecord} />
        </li>
      </ul>
    </nav>
  );
}
