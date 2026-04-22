'use client';

import { ClipboardEvent, DragEvent, FormEvent, useRef, useState } from 'react';

type CreatePostCardProps = {
  postContent: string;
  imageFiles: File[];
  audioFile: File | null;
  onPostContentChange: (value: string) => void;
  onImageFilesChange: (files: File[]) => void;
  onAudioFileChange: (file: File | null) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  canCreate: boolean;
};

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i;

const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;

function isAcceptedImageFile(f: File): boolean {
  if (/^image\/(jpeg|jpg|png|gif|webp)$/i.test(f.type)) return true;
  return !f.type && IMAGE_EXT.test(f.name);
}

function isAcceptedAudioFile(f: File): boolean {
  const okMime = /^audio\/(mpeg|mp3|wav|webm|ogg|x-m4a|aac|flac|x-flac)$/i.test(f.type);
  return okMime || AUDIO_EXT.test(f.name);
}

function filesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const fromFiles = Array.from(data.files ?? []);
  if (fromFiles.length > 0) return fromFiles;
  const out: File[] = [];
  if (data.items) {
    for (const it of Array.from(data.items)) {
      if (it.kind === 'file') {
        const f = it.getAsFile();
        if (f) out.push(f);
      }
    }
  }
  return out;
}

export function CreatePostCard(props: CreatePostCardProps) {
  const [dropActive, setDropActive] = useState(false);
  const dragDepth = useRef(0);

  function applyIncomingFiles(raw: File[]) {
    const accepted = raw.filter((f) => isAcceptedImageFile(f) || isAcceptedAudioFile(f));
    if (accepted.length === 0) return;
    const tooLarge = accepted.find((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (tooLarge) {
      window.alert(`Файл «${tooLarge.name}» больше 100 МБ.`);
      return;
    }
    const imgs = accepted.filter(isAcceptedImageFile);
    const audios = accepted.filter(isAcceptedAudioFile);
    if (imgs.length > 0) {
      props.onImageFilesChange([...props.imageFiles, ...imgs].slice(0, 10));
    }
    if (audios.length > 0) {
      props.onAudioFileChange(audios[0]);
    }
  }

  function onMediaPaste(e: ClipboardEvent) {
    if (!props.canCreate) return;
    const files = filesFromClipboard(e.clipboardData);
    const accepted = files.filter((f) => isAcceptedImageFile(f) || isAcceptedAudioFile(f));
    if (accepted.length === 0) return;
    e.preventDefault();
    applyIncomingFiles(accepted);
  }

  function onTextareaPaste(e: ClipboardEvent) {
    if (!props.canCreate) return;
    const files = filesFromClipboard(e.clipboardData);
    const accepted = files.filter((f) => isAcceptedImageFile(f) || isAcceptedAudioFile(f));
    if (accepted.length === 0) return;
    e.preventDefault();
    applyIncomingFiles(accepted);
  }

  function onDragEnter(e: DragEvent) {
    if (!props.canCreate) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    if (dragDepth.current === 1) setDropActive(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDropActive(false);
    }
  }

  function onDrop(e: DragEvent) {
    if (!props.canCreate) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDropActive(false);
    applyIncomingFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <section className="card">
      <h2>Новый пост</h2>
      <form onSubmit={props.onSubmit} className="grid">
        <textarea
          placeholder="Что нового?"
          value={props.postContent}
          disabled={!props.canCreate}
          onChange={(e) => props.onPostContentChange(e.target.value)}
          onPaste={onTextareaPaste}
        />
        <div
          className={`createPostFileDropzone createPostMediaDropzone${
            dropActive ? ' createPostFileDropzone--active' : ''
          }`}
          tabIndex={props.canCreate ? 0 : undefined}
          role="group"
          aria-label="Прикрепить фото или аудио: перетащите файлы или вставьте из буфера обмена"
          onDragEnter={onDragEnter}
          onDragOver={(e) => {
            if (!props.canCreate) return;
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onPaste={onMediaPaste}
        />
        {props.imageFiles.length > 0 || props.audioFile ? (
          <div className="createPostFileHint createPostMediaSummary muted">
            {props.imageFiles.length > 0 ? (
              <span>Картинок: {props.imageFiles.length}. </span>
            ) : null}
            {props.audioFile ? <span>Аудио: {props.audioFile.name}</span> : null}
          </div>
        ) : null}
        <button type="submit" disabled={!props.canCreate}>
          Опубликовать
        </button>
      </form>
      {!props.canCreate && <p>Публикация доступна только авторизованным пользователям.</p>}
    </section>
  );
}
