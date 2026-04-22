'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PostEntity } from '@/entities/post/model/types';
import { resolvePublicMediaUrl } from '@/shared/lib/mediaUrl';
import { PostAudioPlayer } from '@/shared/ui/PostAudioPlayer';

type FeedWidgetProps = {
  title?: string;
  feed: PostEntity[];
  commentMap: Record<string, string>;
  setCommentValue: (postId: string, value: string) => void;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string) => Promise<void>;
  canInteract: boolean;
};

export function FeedWidget({
  title = 'Лента',
  feed,
  commentMap,
  setCommentValue,
  toggleLike,
  addComment,
  canInteract,
}: FeedWidgetProps) {
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

  async function submitComment(postId: string) {
    await addComment(postId);
    if (!commentMap[postId]) {
      setActiveCommentPostId(null);
    }
  }

  return (
    <section className="card">
      <h2>{title}</h2>
      {feed.map((post) => (
        <article key={post.id} className="post">
          <Link className="author authorLink postAuthorLink" href={`/profile/${post.author.id}`}>
            {post.author.avatarUrl ? (
              <img
                src={resolvePublicMediaUrl(post.author.avatarUrl)}
                alt=""
                className="postAuthorAvatar"
              />
            ) : (
              <span className="postAuthorAvatar postAuthorAvatar--placeholder" aria-hidden>
                {post.author.fullName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="postAuthorName">{post.author.fullName}</span>
          </Link>
          <p>{post.content}</p>
          {post.images.map((img) => (
            <img
              src={resolvePublicMediaUrl(img.url)}
              key={img.id}
              alt=""
              className="postImage"
            />
          ))}
          {post.musicTracks.map((track) => (
            <PostAudioPlayer
              key={track.id}
              src={resolvePublicMediaUrl(track.audioUrl)}
              title={track.title}
              artist={track.artist}
            />
          ))}
          <div className="postActions">
            <button
              className="postActionButton"
              aria-label="Поставить лайк"
              disabled={!canInteract}
              onClick={() => void toggleLike(post.id)}
            >
              <span aria-hidden>♡</span>
              <span>{post.likes.length}</span>
            </button>
            <button
              className="postActionButton"
              aria-label="Открыть комментарии"
              onClick={() =>
                setActiveCommentPostId((prev) => (prev === post.id ? null : post.id))
              }
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
              </svg>
              <span>{post.comments.length}</span>
            </button>
          </div>
          {activeCommentPostId === post.id && (
            <div className="postComments">
              <ul className="postCommentsList">
                {post.comments.length === 0 ? (
                  <li className="postCommentsEmpty">Пока нет комментариев</li>
                ) : (
                  post.comments.map((comment) => {
                    const initial = comment.author.fullName.slice(0, 1).toUpperCase();
                    return (
                      <li key={comment.id} className="postComment">
                        <Link
                          href={`/profile/${comment.author.id}`}
                          className="postCommentAvatarLink"
                          aria-label={`Профиль: ${comment.author.fullName}`}
                        >
                          {comment.author.avatarUrl ? (
                            <img
                              src={resolvePublicMediaUrl(comment.author.avatarUrl)}
                              alt=""
                              className="postCommentAvatar"
                            />
                          ) : (
                            <span
                              className="postCommentAvatar postCommentAvatar--placeholder"
                              aria-hidden
                            >
                              {initial}
                            </span>
                          )}
                        </Link>
                        <div className="postCommentMain">
                          <Link
                            href={`/profile/${comment.author.id}`}
                            className="postCommentAuthor"
                          >
                            {comment.author.fullName}
                          </Link>
                          <p className="postCommentText">{comment.content}</p>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
              <div className="postCommentComposer">
                <input
                  type="text"
                  className="postCommentInput"
                  placeholder="Написать комментарий..."
                  value={commentMap[post.id] ?? ''}
                  disabled={!canInteract}
                  onChange={(e) => setCommentValue(post.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (canInteract && (commentMap[post.id] ?? '').trim()) {
                        void submitComment(post.id);
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="postCommentSend"
                  disabled={!canInteract || !(commentMap[post.id] ?? '').trim()}
                  onClick={() => void submitComment(post.id)}
                >
                  Отправить
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
      {!canInteract && <p>Лайки и комментарии доступны только авторизованным пользователям.</p>}
    </section>
  );
}
