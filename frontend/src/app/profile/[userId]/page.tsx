'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PostEntity } from '@/entities/post/model/types';
import { User } from '@/entities/user/model/types';
import { useAdminModeration } from '@/features/admin/model/useAdminMode';
import { FeedWidget } from '@/widgets/feed/ui/FeedWidget';
import { AppSidebar } from '@/widgets/app-sidebar/ui/AppSidebar';
import { apiRequest } from '@/shared/api/http';
import { SiteHeader } from '@/widgets/site-header/ui/SiteHeader';
import { resolvePublicMediaUrl } from '@/shared/lib/mediaUrl';

type PublicUserProfile = {
  id: string;
  fullName: string;
  email?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  isBanned?: boolean;
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

  async function reloadProfile() {
    if (!routePeerId) return;
    const data = await apiRequest<PublicUserProfile>(
      `/social/users/${encodeURIComponent(routePeerId)}`,
    );
    setProfile(data);
  }

  const reloadFeed = async () => {
    if (!profile?.id) return;
    const posts = await apiRequest<PostEntity[]>(
      `/social/users/${encodeURIComponent(profile.id)}/posts`,
    );
    setFeed(posts);
  };

  const { isAdmin, banUser, unbanUser } = useAdminModeration(async () => {
    await reloadProfile();
    await reloadFeed();
  });

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
          <section className="vkMain profilePage">
            {!isLoading && !error && profile && (
              <section className="card profileHeroCard">
                <div className="profileCover">
                  {profile.coverUrl ? (
                    <img
                      src={resolvePublicMediaUrl(profile.coverUrl)}
                      alt=""
                      className="profileCoverImg"
                    />
                  ) : null}
                </div>
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
                    <div className="profileHeroHead">
                      <div className="profileMainInfo">
                        <h2>{profile.fullName}</h2>
                        <p className="muted profileEmail">{profile.email ?? 'Email скрыт'}</p>
                        {profile.bio && <p className="muted">{profile.bio}</p>}
                        <p className="profilePostCount muted">
                          {feed.length}{' '}
                          {feed.length === 1
                            ? 'публикация'
                            : feed.length >= 2 && feed.length <= 4
                              ? 'публикации'
                              : 'публикаций'}
                        </p>
                        {profile.isBanned && (
                          <p className="profileBannedBadge">Аккаунт заблокирован</p>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="profileFriendActions">
                        {profile.isBanned ? (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => void unbanUser(profile.id, profile.fullName)}
                          >
                            Разблокировать
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="adminModBtn ghost"
                            onClick={() => void banUser(profile.id, profile.fullName)}
                          >
                            Заблокировать пользователя
                          </button>
                        )}
                      </div>
                    )}
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
                  onChanged={reloadFeed}
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
