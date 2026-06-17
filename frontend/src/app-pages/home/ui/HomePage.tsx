'use client';

import { useEffect, useMemo, useState } from 'react';
import { PostEntity } from '@/entities/post/model/types';
import { User } from '@/entities/user/model/types';
import { apiRequest } from '@/shared/api/http';
import { FeedWidget } from '@/widgets/feed/ui/FeedWidget';
import { AppSidebar } from '@/widgets/app-sidebar/ui/AppSidebar';
import { SiteHeader } from '@/widgets/site-header/ui/SiteHeader';

export function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [feed, setFeed] = useState<PostEntity[]>([]);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});

  const authHeaders = useMemo(() => ({ 'Content-Type': 'application/json' }), []);

  async function loadFeed() {
    const data = await apiRequest<PostEntity[]>('/social/feed');
    setFeed(data);
  }

  function requireAuth(actionLabel: string) {
    if (!user) {
      alert(`${actionLabel} доступно только после входа в аккаунт.`);
      return false;
    }
    return true;
  }

  useEffect(() => {
    const stored = localStorage.getItem('token');
    loadFeed().catch(() => undefined);
    if (!stored) return;
    apiRequest<User>(`/social/me?token=${stored}`)
      .then((me) => {
        setUser(me);
      })
      .catch(() => localStorage.removeItem('token'));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadFeed().catch(() => undefined);
  }, [user]);

  async function toggleLike(postId: string) {
    if (!requireAuth('Лайк') || !user) return;
    await apiRequest(`/social/posts/${postId}/likes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ userId: user.userId }),
    });
    await loadFeed();
  }

  async function addComment(postId: string) {
    if (!requireAuth('Комментарий') || !user || !commentMap[postId]) return;
    await apiRequest(`/social/posts/${postId}/comments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ userId: user.userId, content: commentMap[postId] }),
    });
    setCommentMap((prev) => ({ ...prev, [postId]: '' }));
    await loadFeed();
  }

  return (
    <main className="vkPage">
      <div className="vkLayout">
        <SiteHeader />

        <div className="vkColumns">
          <AppSidebar active="feed" />

          <section className="vkMain">
            <div className="feedFullWidth vkFeedWrap">
              <FeedWidget
                title="Лента"
                feed={feed}
                commentMap={commentMap}
                setCommentValue={(postId, value) =>
                  setCommentMap((prev) => ({
                    ...prev,
                    [postId]: value,
                  }))
                }
                toggleLike={toggleLike}
                addComment={addComment}
                canInteract={Boolean(user)}
                onChanged={loadFeed}
              />
            </div>
          </section>
          <aside className="vkAside" aria-hidden />
        </div>
      </div>
    </main>
  );
}
