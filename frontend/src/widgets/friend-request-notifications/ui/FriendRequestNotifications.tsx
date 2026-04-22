'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { FriendSummary } from '@/entities/user/model/friend';
import type { User } from '@/entities/user/model/types';
import { apiRequest } from '@/shared/api/http';
import { createSocialSocket } from '@/shared/lib/createSocialSocket';
import { SOCIAL_AUTH_SESSION_BUMP } from '@/shared/lib/authSession';
import { SOCIAL_FRIENDS_CHANGED_EVENT } from '@/shared/lib/socialEvents';

type PendingRequest = { requestId: string; sender: FriendSummary };

type IncomingApiRow = { id: string; sender: FriendSummary };

export function FriendRequestNotifications() {
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [session, setSession] = useState(0);

  useEffect(() => {
    function onBump() {
      setSession((n) => n + 1);
    }
    window.addEventListener(SOCIAL_AUTH_SESSION_BUMP, onBump);
    return () => window.removeEventListener(SOCIAL_AUTH_SESSION_BUMP, onBump);
  }, []);

  const mergeIncoming = useCallback((rows: IncomingApiRow[]) => {
    setPending((prev) => {
      const map = new Map(prev.map((p) => [p.requestId, p]));
      for (const r of rows) {
        map.set(r.id, { requestId: r.id, sender: r.sender });
      }
      return Array.from(map.values());
    });
  }, []);

  const addOne = useCallback((requestId: string, sender: FriendSummary) => {
    setPending((prev) => {
      if (prev.some((p) => p.requestId === requestId)) return prev;
      return [...prev, { requestId, sender }];
    });
  }, []);

  const remove = useCallback((requestId: string) => {
    setPending((prev) => prev.filter((p) => p.requestId !== requestId));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setPending([]);
      return;
    }
    setPending([]);

    let cancelled = false;
    let sock: Socket | null = null;

    void (async () => {
      let me: User;
      try {
        me = await apiRequest<User>(`/social/me?token=${token}`);
      } catch {
        return;
      }
      if (cancelled) return;

      try {
        const rows = await apiRequest<IncomingApiRow[]>(
          `/social/friends/requests/incoming?userId=${encodeURIComponent(me.userId)}`,
        );
        if (cancelled) return;
        mergeIncoming(rows);
      } catch {
        /* ignore */
      }

      sock = createSocialSocket();
      sock.on('connect_error', () => {
        /* тихо: бэкенд выключен или неверный NEXT_PUBLIC_API_BASE */
      });
      sock.emit('join', { userId: me.userId });
      sock.on('friend_request', (payload: { requestId: string; sender: FriendSummary }) => {
        addOne(payload.requestId, payload.sender);
      });
      sock.on('friend_request_cancelled', (payload: { requestId: string }) => {
        remove(payload.requestId);
      });
    })();

    return () => {
      cancelled = true;
      sock?.disconnect();
    };
  }, [session, mergeIncoming, addOne]);

  const respond = async (requestId: string, accepted: boolean) => {
    try {
      await apiRequest(`/social/friends/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted }),
      });
      remove(requestId);
      if (accepted) {
        window.dispatchEvent(new CustomEvent(SOCIAL_FRIENDS_CHANGED_EVENT));
      }
    } catch {
      alert('Не удалось обработать заявку. Попробуйте ещё раз.');
    }
  };

  if (pending.length === 0) return null;

  return (
    <div className="friendReqToastStack" role="region" aria-label="Заявки в друзья">
      {pending.map((item) => (
        <div key={item.requestId} className="friendReqToast card">
          <div className="friendReqToastText">
            <strong className="friendReqToastName">{item.sender.fullName}</strong>
            <span className="muted friendReqToastHint">хочет добавиться в друзья</span>
          </div>
          <div className="friendReqToastActions">
            <button type="button" className="friendReqToastAccept" onClick={() => void respond(item.requestId, true)}>
              Принять
            </button>
            <button
              type="button"
              className="friendReqToastDecline ghost"
              onClick={() => void respond(item.requestId, false)}
            >
              Отклонить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
