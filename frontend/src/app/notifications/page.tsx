'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { FriendSummary } from '@/entities/user/model/friend';
import { User } from '@/entities/user/model/types';
import { apiRequest } from '@/shared/api/http';
import { createSocialSocket } from '@/shared/lib/createSocialSocket';
import { AppSidebar } from '@/widgets/app-sidebar/ui/AppSidebar';
import { SOCIAL_FRIENDS_CHANGED_EVENT } from '@/shared/lib/socialEvents';
import { SiteHeader } from '@/widgets/site-header/ui/SiteHeader';

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<
    Array<{ id: string; sender: FriendSummary }>
  >([]);
  const [incomingLoadError, setIncomingLoadError] = useState('');

  const loadIncomingFriendRequests = useCallback(async () => {
    if (!user?.userId) return;
    setIncomingLoadError('');
    try {
      const rows = await apiRequest<Array<{ id: string; sender: FriendSummary }>>(
        `/social/friends/requests/incoming?userId=${encodeURIComponent(user.userId)}`,
      );
      setIncomingFriendRequests(Array.isArray(rows) ? rows : []);
    } catch {
      setIncomingLoadError('Не удалось загрузить заявки. Обновите страницу.');
      setIncomingFriendRequests([]);
    }
  }, [user]);

  const respondIncomingRequest = useCallback(async (requestId: string, accepted: boolean) => {
    try {
      await apiRequest(`/social/friends/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted }),
      });
      setIncomingFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (accepted) {
        window.dispatchEvent(new CustomEvent(SOCIAL_FRIENDS_CHANGED_EVENT));
      }
    } catch {
      alert('Не удалось обработать заявку. Попробуйте ещё раз.');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/auth');
      return;
    }
    apiRequest<User>(`/social/me?token=${token}`)
      .then((me) => setUser(me))
      .catch(() => {
        localStorage.removeItem('token');
        router.replace('/auth');
      });
  }, [router]);

  useEffect(() => {
    void loadIncomingFriendRequests();
  }, [loadIncomingFriendRequests]);

  useEffect(() => {
    if (!user) return;
    const sock: Socket = createSocialSocket();
    sock.on('connect_error', () => undefined);
    sock.emit('join', { userId: user.userId });
    sock.on('friend_request', (payload: { requestId: string; sender: FriendSummary }) => {
      setIncomingFriendRequests((prev) => {
        if (prev.some((r) => r.id === payload.requestId)) return prev;
        return [{ id: payload.requestId, sender: payload.sender }, ...prev];
      });
    });
    sock.on('friend_request_cancelled', (payload: { requestId: string }) => {
      setIncomingFriendRequests((prev) => prev.filter((r) => r.id !== payload.requestId));
    });
    return () => {
      sock.disconnect();
    };
  }, [user]);

  return (
    <main className="vkPage">
      <div className="vkLayout">
        <SiteHeader />
        <div className="vkColumns">
          <AppSidebar active="notifications" />
          <section className="vkMain">
            <div className="notificationsPage card">
              <h1 className="notificationsPageTitle">Уведомления</h1>
              <p className="muted notificationsPageLead">
                Здесь отображаются входящие заявки в друзья. После принятия человек появится в разделе «Друзья и
                чаты».
              </p>

              <section className="notificationsSection" aria-labelledby="friend-requests-heading">
                <h2 id="friend-requests-heading" className="notificationsSectionTitle">
                  Заявки в друзья
                </h2>
                {incomingLoadError ? <p className="notificationsError">{incomingLoadError}</p> : null}
                {!incomingLoadError && incomingFriendRequests.length === 0 ? (
                  <p className="muted notificationsEmpty">Нет новых заявок.</p>
                ) : null}
                {!incomingLoadError && incomingFriendRequests.length > 0 ? (
                  <ul className="tgIncomingRequestsList notificationsList">
                    {incomingFriendRequests.map((req) => (
                      <li key={req.id} className="tgIncomingRequestCard">
                        <div className="tgIncomingRequestMain">
                          <Link
                            href={`/profile/${req.sender.id}`}
                            className="tgChatAvatar tgIncomingRequestAvatar notificationsAvatarLink"
                            aria-label={`Профиль: ${req.sender.fullName}`}
                          >
                            {req.sender.fullName.slice(0, 1).toUpperCase()}
                          </Link>
                          <div className="tgIncomingRequestText">
                            <Link href={`/profile/${req.sender.id}`} className="tgIncomingRequestName">
                              {req.sender.fullName}
                            </Link>
                            <span className="muted tgIncomingRequestHint">хочет стать вашим другом</span>
                          </div>
                        </div>
                        <div className="tgIncomingRequestActions">
                          <button
                            type="button"
                            className="tgIncomingRequestAccept"
                            onClick={() => void respondIncomingRequest(req.id, true)}
                          >
                            Принять
                          </button>
                          <button
                            type="button"
                            className="tgIncomingRequestDecline ghost"
                            onClick={() => void respondIncomingRequest(req.id, false)}
                          >
                            Отклонить
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            </div>
          </section>
          <aside className="vkAside" aria-hidden />
        </div>
      </div>
    </main>
  );
}
