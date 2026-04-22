'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type PostAudioPlayerProps = {
  src: string;
  title: string;
  artist: string;
};

export function PostAudioPlayer({ src, title, artist }: PostAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const draggingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const pauseOthers = useCallback((current: HTMLAudioElement) => {
    document.querySelectorAll('audio.postAudioPlayerNative').forEach((node) => {
      if (node !== current) {
        (node as HTMLAudioElement).pause();
      }
    });
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTime = () => {
      if (!draggingRef.current) setPosition(el.currentTime);
    };
    const onMeta = () => {
      const d = el.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    };
    const onEnded = () => {
      setPlaying(false);
      setPosition(0);
    };
    const onPlay = () => {
      pauseOthers(el);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    el.addEventListener('ended', onEnded);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [src, pauseOthers]);

  useEffect(() => {
    function onGlobalPointerUp() {
      draggingRef.current = false;
    }
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('blur', onGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('blur', onGlobalPointerUp);
    };
  }, []);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }

  function onSeekStart() {
    draggingRef.current = true;
  }

  function onSeekChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current;
    if (!el) return;
    const next = parseFloat(e.target.value);
    if (!Number.isFinite(next)) return;
    el.currentTime = next;
    setPosition(next);
  }

  function onSeekEnd() {
    draggingRef.current = false;
    const el = audioRef.current;
    if (el) setPosition(el.currentTime);
  }

  const max = duration > 0 ? duration : 0;
  const label = `${artist} — ${title}`.trim();

  return (
    <div className="postAudioPlayer">
      <div className="postAudioPlayer__row">
        <div className="postAudioPlayer__cover" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <div className="postAudioPlayer__meta">
          <div className="postAudioPlayer__title" title={title}>
            {title}
          </div>
          <div className="postAudioPlayer__artist">{artist}</div>
        </div>
      </div>

      <div className="postAudioPlayer__controls">
        <button
          type="button"
          className="postAudioPlayer__play"
          aria-label={playing ? 'Пауза' : 'Воспроизвести'}
          onClick={togglePlay}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
              <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="postAudioPlayer__seekCol">
          <input
            type="range"
            className="postAudioPlayer__seek"
            min={0}
            max={max || 0}
            step={0.1}
            value={Math.min(position, max || 0)}
            aria-label={label}
            disabled={!max}
            onPointerDown={onSeekStart}
            onChange={onSeekChange}
            onPointerUp={onSeekEnd}
          />
          <div className="postAudioPlayer__times">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        className="postAudioPlayerNative"
        src={src}
        preload="metadata"
        aria-label={label}
      />
    </div>
  );
}
