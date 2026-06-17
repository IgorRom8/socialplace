'use client';

import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { PostEntity } from '@/entities/post/model/types';
import { User } from '@/entities/user/model/types';
import { CreatePostCard } from '@/features/create-post/ui/CreatePostCard';
import { apiFormPost, apiRequest } from '@/shared/api/http';
import { AppSidebar } from '@/widgets/app-sidebar/ui/AppSidebar';
import { FeedWidget } from '@/widgets/feed/ui/FeedWidget';
import { SiteHeader } from '@/widgets/site-header/ui/SiteHeader';
import { resolvePublicMediaUrl } from '@/shared/lib/mediaUrl';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [postContent, setPostContent] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [profileFeed, setProfileFeed] = useState<PostEntity[]>([]);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const authHeaders = useMemo(() => ({ 'Content-Type': 'application/json' }), []);

  async function loadProfileFeed(currentUserId: string) {
    const posts = await apiRequest<PostEntity[]>(
      `/social/users/${encodeURIComponent(currentUserId)}/posts`,
    );
    setProfileFeed(posts);
  }

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.replace('/auth');
      return;
    }

    apiRequest<User>(`/social/me?token=${storedToken}`)
      .then((me) => {
        setUser(me);
      })
      .catch(() => {
        localStorage.removeItem('token');
        router.replace('/auth');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  function logout() {
    localStorage.removeItem('token');
    router.push('/auth');
  }

  async function onCreatePost(e: FormEvent) {
    e.preventDefault();
    if (!user || !postContent.trim()) return;
    const fd = new FormData();
    fd.append('userId', user.userId);
    fd.append('content', postContent.trim());
    imageFiles.forEach((file) => fd.append('images', file));
    if (audioFile) fd.append('audio', audioFile);
    await apiFormPost('/social/posts', fd);
    setPostContent('');
    setImageFiles([]);
    setAudioFile(null);
    setIsCreateOpen(false);
    await loadProfileFeed(user.userId);
  }

  async function toggleLike(postId: string) {
    if (!user) return;
    await apiRequest(`/social/posts/${postId}/likes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ userId: user.userId }),
    });
    await loadProfileFeed(user.userId);
  }

  async function addComment(postId: string) {
    if (!user || !commentMap[postId]) return;
    await apiRequest(`/social/posts/${postId}/comments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ userId: user.userId, content: commentMap[postId] }),
    });
    setCommentMap((prev) => ({ ...prev, [postId]: '' }));
    await loadProfileFeed(user.userId);
  }

  useEffect(() => {
    if (!user) return;
    loadProfileFeed(user.userId).catch(() => setProfileFeed([]));
  }, [user]);

  const displayName =
    (user?.fullName?.trim() ? user.fullName.trim() : null) ??
    user?.email.split('@')[0] ??
    'Пользователь';
  const displayInitial = displayName.slice(0, 1).toUpperCase();

  async function onAvatarFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) {
      window.alert('Выберите изображение JPEG, PNG, GIF или WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert('Файл не больше 5 МБ.');
      return;
    }
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await apiFormPost<{ avatarUrl: string }>(
        `/social/me/avatar?token=${encodeURIComponent(token)}`,
        fd,
      );
      setUser((prev) => (prev ? { ...prev, avatarUrl: res.avatarUrl } : prev));
    } catch {
      window.alert('Не удалось загрузить аватар.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onCoverFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) {
      window.alert('Выберите изображение JPEG, PNG, GIF или WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      window.alert('Файл не больше 10 МБ.');
      return;
    }
    setCoverBusy(true);
    try {
      const fd = new FormData();
      fd.append('cover', file);
      const res = await apiFormPost<{ coverUrl: string }>(
        `/social/me/cover?token=${encodeURIComponent(token)}`,
        fd,
      );
      setUser((prev) => (prev ? { ...prev, coverUrl: res.coverUrl } : prev));
    } catch {
      window.alert('Не удалось загрузить шапку профиля.');
    } finally {
      setCoverBusy(false);
    }
  }

  return (
    <main className="vkPage">
      <div className="vkLayout">
        <SiteHeader />
        <div className="vkColumns">
          <AppSidebar active="profile" />
          <section className="vkMain profilePage">
            <section className="card profileHeroCard">
              <div className="profileCover">
                {user?.coverUrl ? (
                  <img
                    src={resolvePublicMediaUrl(user.coverUrl)}
                    alt=""
                    className="profileCoverImg"
                  />
                ) : null}
                {user && (
                  <>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                      className="profileAvatarFileInput"
                      onChange={(ev) => void onCoverFile(ev)}
                    />
                    <button
                      type="button"
                      className="profileCoverChange ghost"
                      disabled={coverBusy}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {coverBusy ? 'Загрузка…' : 'Сменить шапку'}
                    </button>
                  </>
                )}
              </div>
              <div className="profileHeroContent profileHeroContent--own">
                <div className="profileAvatarColumn">
                  <div className="profileAvatar" aria-hidden>
                    {user?.avatarUrl ? (
                      <img
                        src={resolvePublicMediaUrl(user.avatarUrl)}
                        alt=""
                        className="profileAvatarImg"
                      />
                    ) : (
                      displayInitial
                    )}
                  </div>
                  {user && (
                    <>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                        className="profileAvatarFileInput"
                        onChange={(ev) => void onAvatarFile(ev)}
                      />
                      <button
                        type="button"
                        className="profileAvatarUpload ghost"
                        disabled={avatarBusy}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        {avatarBusy ? 'Загрузка…' : 'Сменить фото'}
                      </button>
                    </>
                  )}
                </div>
                <div className="profileHeroBody">
                  <div className="profileHeroHead">
                    <div className="profileMainInfo">
                      <h2>{displayName}</h2>
                      <p className="muted profileEmail">{user?.email}</p>
                    </div>
                    {user && (
                      <div className="profileHeroActions">
                        <button type="button" className="logoutButton ghost" onClick={logout}>
                          Выйти
                        </button>
                      </div>
                    )}
                  </div>
                  {user && (
                    <p className="profilePostCount muted">
                      {profileFeed.length}{' '}
                      {profileFeed.length === 1
                        ? 'публикация'
                        : profileFeed.length >= 2 && profileFeed.length <= 4
                          ? 'публикации'
                          : 'публикаций'}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="card profileCreateCard">
              {isLoading ? (
                <p className="muted">Загрузка профиля...</p>
              ) : user ? (
                <>
                  <div className="profileSectionHeader">
                    <h2>Публикации</h2>
                    <button type="button" onClick={() => setIsCreateOpen((prev) => !prev)}>
                      {isCreateOpen ? 'Скрыть форму' : 'Новый пост'}
                    </button>
                  </div>
                  {isCreateOpen && (
                    <CreatePostCard
                      postContent={postContent}
                      imageFiles={imageFiles}
                      audioFile={audioFile}
                      onPostContentChange={setPostContent}
                      onImageFilesChange={setImageFiles}
                      onAudioFileChange={setAudioFile}
                      onSubmit={onCreatePost}
                      canCreate
                    />
                  )}
                </>
              ) : (
                <p className="muted">Не удалось загрузить профиль.</p>
              )}
            </section>
            <section className="feedFullWidth vkFeedWrap">
              <FeedWidget
                title="Мои посты"
                feed={profileFeed}
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
                onChanged={() => (user ? loadProfileFeed(user.userId) : undefined)}
              />
            </section>
          </section>
          <aside className="vkAside" aria-hidden />
        </div>
      </div>
    </main>
  );
}
