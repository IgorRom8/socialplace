'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { UserSearchHit } from '@/entities/user/model/search';
import { apiRequest } from '@/shared/api/http';
import { resolvePublicMediaUrl } from '@/shared/lib/mediaUrl';

export function HeaderUserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<UserSearchHit[]>(
        `/social/users/search?q=${encodeURIComponent(trimmed)}`,
      );
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runSearch(query);
    }, 280);
    return () => window.clearTimeout(t);
  }, [query, runSearch]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className="headerSearch" ref={wrapRef}>
      <input
        className="headerSearchInput"
        type="search"
        placeholder="Поиск пользователей…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Поиск пользователей"
        autoComplete="off"
      />
      {open && (query.trim().length >= 2 || loading) && (
        <div className="headerSearchResults" role="listbox">
          {loading && <p className="headerSearchHint">Поиск…</p>}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <p className="headerSearchHint">Никого не найдено</p>
          )}
          {!loading &&
            results.map((u) => (
              <Link
                key={u.id}
                className="headerSearchItem"
                href={`/profile/${u.id}`}
                role="option"
                onClick={() => {
                  setOpen(false);
                  setQuery('');
                  setResults([]);
                }}
              >
                <div className="headerSearchItemRow">
                  {u.avatarUrl ? (
                    <img
                      className="headerSearchAvatar"
                      src={resolvePublicMediaUrl(u.avatarUrl)}
                      alt=""
                    />
                  ) : (
                    <span
                      className="headerSearchAvatar headerSearchAvatar--placeholder"
                      aria-hidden
                    >
                      {u.fullName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="headerSearchItemText">
                    <span className="headerSearchName">{u.fullName}</span>
                    <span className="headerSearchEmail muted">{u.email}</span>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
