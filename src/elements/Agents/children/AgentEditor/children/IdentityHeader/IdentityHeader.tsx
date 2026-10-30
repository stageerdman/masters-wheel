"use client";

import { useWindowFileDrop } from "@/lib/useWindowFileDrop";
import { usePhotoUpload } from "./IdentityHeader.script";
import position from "./IdentityHeader.position.module.css";
import styles from "./IdentityHeader.styles.module.css";

type IdentityHeaderProps = {
  name: string;
  nickname: string;
  description: string;
  photoUrl: string | null;
  onNameChange: (value: string) => void;
  onNicknameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPhotoChange: (url: string | null) => void;
  onFieldFocus: () => void;
  onFieldBlur: () => void;
};

export function IdentityHeader({
  name,
  nickname,
  description,
  photoUrl,
  onNameChange,
  onNicknameChange,
  onDescriptionChange,
  onPhotoChange,
  onFieldFocus,
  onFieldBlur,
}: IdentityHeaderProps) {
  const { isUploading, error, pickPhoto, handleDroppedPaths } = usePhotoUpload(onPhotoChange);
  const isDragActive = useWindowFileDrop(true, handleDroppedPaths);

  return (
    <div className={`${styles.root} ${position.root}`} data-construction>
      <button
        type="button"
        className={`${styles.photo} ${position.photo} ${isDragActive ? styles.photoActive : ""}`}
        data-construction
        onClick={pickPhoto}
        disabled={isUploading}
        aria-label="Change agent photo (click, or drag an image here)"
      >
        {isUploading ? (
          <span className={`${styles.photoPlaceholder} ${position.photoPlaceholder}`} data-construction aria-hidden="true">
            …
          </span>
        ) : photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className={`${styles.photoImage} ${position.photoImage}`} data-construction />
        ) : (
          <span className={`${styles.photoPlaceholder} ${position.photoPlaceholder}`} data-construction aria-hidden="true">
            +
          </span>
        )}
      </button>
      <div className={position.textStack} data-construction>
        <input
          className={`${styles.nameInput} ${position.nameInput}`}
          data-construction
          value={name}
          placeholder="Name your agent"
          onChange={(event) => onNameChange(event.target.value)}
          onFocus={onFieldFocus}
          onBlur={onFieldBlur}
          aria-label="Agent name"
        />
        <div className={`${styles.nicknameRow} ${position.nicknameRow}`} data-construction>
          <span className={styles.nicknamePrefix} data-construction aria-hidden="true">
            @
          </span>
          <input
            className={`${styles.nicknameInput} ${position.nicknameInput}`}
            data-construction
            value={nickname}
            placeholder="nickname"
            onChange={(event) => onNicknameChange(event.target.value)}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            aria-label="Agent nickname"
          />
        </div>
        <input
          className={`${styles.descriptionInput} ${position.descriptionInput}`}
          data-construction
          value={description}
          placeholder="What does this agent do?"
          onChange={(event) => onDescriptionChange(event.target.value)}
          onFocus={onFieldFocus}
          onBlur={onFieldBlur}
          aria-label="Agent description"
        />
        {error && (
          <span className={`${styles.photoError} ${position.photoError}`} data-construction role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
