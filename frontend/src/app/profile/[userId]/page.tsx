'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PostEntity } from '@/entities/post/model/types';
import { User } from '@/entities/user/model/types';
import { AppSidebar } from '@/widgets/app-sidebar/ui/AppSidebar';
import { FeedWidget } from '@/widgets/feed/ui/FeedWidget';
import { apiRequest } from '@/shared/api/http';
import { SiteHeader } from '@/widgets/site-header/ui/SiteHeader';
import { resolvePublicMediaUrl } from '@/shared/lib/mediaUrl';

type PublicUserProfile = {
  id: string;
  fullName: string;
  email?: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const routePeerId = useMemo(() => {
    const p = params?.userId;
    if (p == null) return '';
    return Array.isArray(p) ? (p[0] ?? '') : p;
  }, [params?.userId]);
  const [viewer, setViewer] = useState<User | null>(null);
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [feed, setFeed] = useState<PostEntity[]>([]);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  /** id исходящей заявки в статусе pending (если уже отправили этому пользователю) */
  const [outgoingRequestId, setOutgoingRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    apiRequest<User>(`/social/me?token=${token}`)
      .then((me) => setViewer(me))
      .catch(() => localStorage.removeItem('token'));
  }, []);

  useEffect(() => {
    if (!routePeerId) return;
    setIsLoading(true);
    setError('');
    setProfile(null);
    setFeed([]);
    apiRequest<PublicUserProfile>(`/social/users/${encodeURIComponent(routePeerId)}`)
      .then((data) => setProfile(data))
      .catch(() => setError('Не удалось загрузить профиль пользователя'))
      .finally(() => setIsLoading(false));
  }, [routePeerId]);

  useEffect(() => {
    if (!profile?.id) return;
    apiRequest<PostEntity[]>(
      `/social/users/${encodeURIComponent(profile.id)}/posts`,
    )
      .then(setFeed)
      .catch(() => setFeed([]));
  }, [profile?.id]);

  useEffect(() => {
    if (!viewer?.userId || !profile?.id) {
      setOutgoingRequestId(null);
      return;
    }
    let cancelled = false;
    void apiRequest<Array<{ id: string; receiver: { id: string } }>>(
      `/social/friends/requests/outgoing?userId=${encodeURIComponent(viewer.userId)}`,
    )
      .then((rows) => {
        if (cancelled) return;
        const row = rows.find((r) => r.receiver.id === profile.id);
        setOutgoingRequestId(row?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setOutgoingRequestId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [viewer?.userId, profile?.id]);

  async function sendFriendRequest() {
    if (!viewer || !profile?.id || viewer.userId === profile.id) return;
    const created = await apiRequest<{ id: string }>('/social/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: viewer.userId,
        receiverId: profile.id,
      }),
    });
    setOutgoingRequestId(created.id);
  }

  async function cancelFriendRequest() {
    if (!viewer?.userId || !outgoingRequestId) return;
    try {
      await apiRequest(
        `/social/friends/requests/${encodeURIComponent(outgoingRequestId)}?senderId=${encodeURIComponent(viewer.userId)}`,
        { method: 'DELETE' },
      );
      setOutgoingRequestId(null);
    } catch {
      alert('Не удалось отменить заявку.');
    }
  }

  function openChat() {
    if (!profile?.id) return;
    const peerName = encodeURIComponent(profile.fullName);
    router.push(`/connections?peerId=${encodeURIComponent(profile.id)}&peerName=${peerName}`);
  }

  const canManageProfile = Boolean(viewer && profile && viewer.userId !== profile.id);
  const profileName = profile?.fullName ?? 'Пользователь';
  const profileInitial = profileName.slice(0, 1).toUpperCase();

  return (
    <main className="vkPage">
      <div className="vkLayout">
        <SiteHeader />
        <div className="vkColumns">
          <AppSidebar active="other" />
          <section className="vkMain">
            {!isLoading && !error && profile && (
              <section className="card profileHeroCard">
                <div className="profileCover" />
                <div className="profileHeroContent profileHeroContent--publicUser">
                  <div className="profileAvatar" aria-hidden>
                    {profile.avatarUrl ? (
                      <img
                        src={resolvePublicMediaUrl(profile.avatarUrl)}
                        alt=""
                        className="profileAvatarImg"
                      />
                    ) : (
                      profileInitial
                    )}
                  </div>
                  <div className="profileHeroTextColumn">
                    <div className="profileMainInfo">
                      <h2>{profile.fullName}</h2>
                      <p className="muted">{profile.email ?? 'Email скрыт'}</p>
                      {profile.bio && <p className="muted">{profile.bio}</p>}
                    </div>
                    {canManageProfile && (
                      <div className="profileFriendActions">
                        {!outgoingRequestId ? (
                          <button className="ghost" type="button" onClick={() => void sendFriendRequest()}>
                            Добавить в друзья
                          </button>
                        ) : (
                          <div className="profileOutgoingPending">
                            <span className="muted profileRequestPending">Заявка отправлена</span>
                            <button className="ghost" type="button" onClick={() => void cancelFriendRequest()}>
                              Отменить заявку
                            </button>
                          </div>
                        )}
                        <button className="ghost" type="button" onClick={openChat}>
                          Написать
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
            <section className="feedFullWidth">
              {isLoading && <section className="card">Загрузка профиля...</section>}
              {!isLoading && error && <section className="card">{error}</section>}
              {!isLoading && !error && (
                <FeedWidget
                  title="Посты пользователя"
                  feed={feed}
                  commentMap={commentMap}
                  setCommentValue={(postId, value) =>
                    setCommentMap((prev) => ({
                      ...prev,
                      [postId]: value,
                    }))
                  }
                  toggleLike={async () => undefined}
                  addComment={async () => undefined}
                  canInteract={false}
                />
              )}
            </section>
          </section>
          <aside className="vkAside" aria-hidden />
        </div>
      </div>
    </main>
  );
}
