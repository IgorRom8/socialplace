'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { chatPreviewText, formatChatTime } from '@/entities/chat/lib/formatChatPreview';
import { readChatListFromStorage, writeChatListToStorage } from '@/entities/chat/lib/chatListStorage';
import { mergeChatListItems } from '@/entities/chat/lib/mergeChatList';
import type { ChatListItem } from '@/entities/chat/model/types';
import { MessageEntity } from '@/entities/message/model/types';
import { FriendSummary } from '@/entities/user/model/friend';
import { User } from '@/entities/user/model/types';
import { ChatCard } from '@/features/chat/ui/ChatCard';
import { apiFormPost, apiRequest } from '@/shared/api/http';
import { createSocialSocket } from '@/shared/lib/createSocialSocket';
import { AppSidebar } from '@/widgets/app-sidebar/ui/AppSidebar';
import { SOCIAL_FRIENDS_CHANGED_EVENT } from '@/shared/lib/socialEvents';
import { SiteHeader } from '@/widgets/site-header/ui/SiteHeader';

export function ConnectionsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [chatWithId, setChatWithId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<MessageEntity[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peerNameFromUrl, setPeerNameFromUrl] = useState('');
  const chatWithIdRef = useRef('');
  /** Не пишем в localStorage до первой синхронизации с сервером — иначе затрём кэш пустым [] */
  const [chatListPersistReady, setChatListPersistReady] = useState(false);

  const refreshChatList = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiRequest<ChatListItem[]>(`/social/chats?userId=${user.userId}`);
      setChatList((prev) => mergeChatListItems(prev, data));
    } catch {
      /* не очищаем список — иначе пропадут чаты при временной ошибке или старом бэкенде */
    }
  }, [user]);

  function requireAuth(actionLabel: string) {
    if (!user) {
      alert(`${actionLabel} доступно только после входа в аккаунт.`);
      return false;
    }
    return true;
  }

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
    if (!user) return;
    apiRequest<FriendSummary[]>(`/social/friends?userId=${user.userId}`)
      .then(setFriends)
      .catch(() => setFriends([]));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const userId = user.userId;
    function refreshFriendsList() {
      void apiRequest<FriendSummary[]>(`/social/friends?userId=${userId}`)
        .then(setFriends)
        .catch(() => setFriends([]));
    }
    window.addEventListener(SOCIAL_FRIENDS_CHANGED_EVENT, refreshFriendsList);
    return () => window.removeEventListener(SOCIAL_FRIENDS_CHANGED_EVENT, refreshFriendsList);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setChatList([]);
      setChatListPersistReady(false);
      return;
    }
    setChatListPersistReady(false);
    const stored = readChatListFromStorage(user.userId);
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiRequest<ChatListItem[]>(`/social/chats?userId=${user.userId}`);
        if (cancelled) return;
        setChatList(mergeChatListItems(stored, data));
      } catch {
        if (cancelled) return;
        setChatList(stored);
      } finally {
        if (!cancelled) setChatListPersistReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !chatListPersistReady) return;
    writeChatListToStorage(user.userId, chatList);
  }, [user, chatList, chatListPersistReady]);

  useEffect(() => {
    chatWithIdRef.current = chatWithId;
  }, [chatWithId]);

  useEffect(() => {
    if (!searchParams || !user) return;
    const peerId = searchParams.get('peerId');
    const peerName = searchParams.get('peerName');
    if (!peerId) return;
    setChatWithId(peerId);
    if (peerName) {
      try {
        setPeerNameFromUrl(decodeURIComponent(peerName));
      } catch {
        setPeerNameFromUrl(peerName);
      }
    } else {
      setPeerNameFromUrl('');
    }
  }, [searchParams, user]);

  const loadMessages = useCallback(async () => {
    if (!user || !chatWithId) return;
    try {
      const data = await apiRequest<MessageEntity[]>(
        `/social/messages?userA=${encodeURIComponent(user.userId)}&userB=${encodeURIComponent(chatWithId)}`,
      );
      setMessages(data);
    } catch {
      setMessages([]);
    }
  }, [user, chatWithId]);

  useEffect(() => {
    if (!user || !chatWithId) {
      setMessages([]);
      return;
    }
    void loadMessages();
  }, [user, chatWithId, loadMessages]);

  useEffect(() => {
    if (!user) return;
    const sock = createSocialSocket();
    sock.on('connect_error', () => undefined);
    sock.emit('join', { userId: user.userId });
    sock.on('new_message', (msg: MessageEntity) => {
      void refreshChatList();
      const peer = chatWithIdRef.current;
      if (!peer) return;
      if (msg.senderId !== peer && msg.receiverId !== peer) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    setSocket(sock);
    return () => {
      sock.disconnect();
    };
  }, [user, refreshChatList]);

  function sendMessage() {
    if (!requireAuth('Отправка сообщений') || !socket || !user || !chatWithId || !messageText.trim()) {
      return;
    }
    const content = messageText.trim();
    const peerId = chatWithId;

    bumpChatListPreview(peerId, content);

    setMessageText('');

    socket.emit(
      'private_message',
      { senderId: user.userId, receiverId: peerId, content },
      () => {
        void refreshChatList();
      },
    );
  }

  function bumpChatListPreview(peerId: string, previewContent: string) {
    if (!user) return;
    const label =
      chatList.find((c) => c.peer.id === peerId)?.peer.fullName ??
      friends.find((f) => f.id === peerId)?.fullName ??
      (peerNameFromUrl || 'Собеседник');
    const email =
      chatList.find((c) => c.peer.id === peerId)?.peer.email ??
      friends.find((f) => f.id === peerId)?.email ??
      '';

    setChatList((prev) => {
      const others = prev.filter((c) => c.peer.id !== peerId);
      const existingPeer = prev.find((c) => c.peer.id === peerId)?.peer;
      const friendPeer = friends.find((f) => f.id === peerId);
      const peer: FriendSummary = existingPeer ?? friendPeer ?? { id: peerId, fullName: label, email };
      const item: ChatListItem = {
        peer,
        lastMessage: {
          content: previewContent,
          createdAt: new Date().toISOString(),
          isOwn: true,
        },
      };
      return [item, ...others].sort(
        (a, b) =>
          new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime(),
      );
    });
  }

  async function sendAttachmentFile(file: File) {
    if (!requireAuth('Отправка файлов') || !user || !chatWithId) return;
    const okImage = /^image\/(jpeg|png|gif|webp)$/i.test(file.type);
    const okAudio =
      /^audio\//i.test(file.type) ||
      /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name);
    if (!okImage && !okAudio) {
      window.alert('Выберите изображение (JPEG, PNG, GIF, WebP) или аудиофайл.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      window.alert('Файл не больше 50 МБ.');
      return;
    }
    const peerId = chatWithId;
    const fd = new FormData();
    fd.append('senderId', user.userId);
    fd.append('receiverId', peerId);
    fd.append('file', file);
    const caption = messageText.trim();
    if (caption) fd.append('caption', caption);

    try {
      const msg = await apiFormPost<MessageEntity>('/social/messages/upload', fd);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setMessageText('');
      bumpChatListPreview(peerId, msg.content);
      void refreshChatList();
    } catch {
      window.alert('Не удалось отправить файл. Проверьте сеть и размер файла.');
    }
  }

  function openPeerChat(peerId: string, peerName?: string) {
    setChatWithId(peerId);
    setPeerNameFromUrl(peerName ?? '');
  }

  const closeChatModal = useCallback(() => {
    setChatWithId('');
    setPeerNameFromUrl('');
    setMessageText('');
    setMessages([]);
  }, []);

  const friendsWithoutChats = useMemo(() => {
    const inChats = new Set(chatList.map((c) => String(c.peer.id)));
    return friends.filter((f) => !inChats.has(String(f.id)));
  }, [friends, chatList]);

  const peerLabel =
    chatList.find((c) => c.peer.id === chatWithId)?.peer.fullName ??
    friends.find((f) => f.id === chatWithId)?.fullName ??
    peerNameFromUrl;
  const chatOpen = Boolean(chatWithId);

  useEffect(() => {
    if (!chatOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeChatModal();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [chatOpen, closeChatModal]);

  return (
    <main className="vkImPage">
      <div className="vkLayout">
        <SiteHeader />
        <div className="vkColumns">
          <AppSidebar active="connections" />
          <section className={`vkMain vkMainConnections${chatOpen ? ' vkMainConnections--chatOpen' : ''}`}>
            <div className="connectionsMainShell">
              <section className="tgMessenger tgMessengerListOnly">
                <aside className="tgChatSidebar">
                  <div className="card tgChatListCard">
                    <div className="tgChatListHeader">
                      <h2 className="tgChatListTitle">Чаты</h2>
                    </div>

                    <div className="tgChatListScroll">
                      {chatList.length === 0 ? (
                        <p className="muted tgChatListEmpty">
                          Пока нет переписок. Напишите другу из списка ниже или откройте чат с профиля.
                        </p>
                      ) : (
                        <ul className="tgChatList">
                          {chatList.map((item) => (
                            <li key={item.peer.id}>
                              <button
                                type="button"
                                className={`tgChatRow ${chatWithId === item.peer.id ? 'tgChatRowActive' : ''}`}
                                onClick={() => openPeerChat(item.peer.id, item.peer.fullName)}
                              >
                                <span className="tgChatAvatar" aria-hidden>
                                  {item.peer.fullName.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="tgChatRowMain">
                                  <span className="tgChatRowTop">
                                    <span className="tgChatRowName">{item.peer.fullName}</span>
                                    <span className="tgChatRowTime muted">
                                      {formatChatTime(item.lastMessage.createdAt)}
                                    </span>
                                  </span>
                                  <span className="tgChatRowPreview">{chatPreviewText(item)}</span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {friendsWithoutChats.length > 0 ? (
                      <div className="tgFriendsBlock">
                        <h3 className="tgFriendsBlockTitle">Друзья</h3>
                        <ul className="tgChatList">
                          {friendsWithoutChats.map((f) => (
                            <li key={f.id}>
                              <button
                                type="button"
                                className={`tgChatRow tgChatRowFriend ${chatWithId === f.id ? 'tgChatRowActive' : ''}`}
                                onClick={() => openPeerChat(f.id, f.fullName)}
                              >
                                <span className="tgChatAvatar" aria-hidden>
                                  {f.fullName.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="tgChatRowMain">
                                  <span className="tgChatRowTop">
                                    <span className="tgChatRowName">{f.fullName}</span>
                                  </span>
                                  <span className="tgChatRowPreview muted">Написать сообщение</span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </aside>
              </section>

              {chatOpen ? (
                <div
                  className="chatModalOverlay"
                  role="presentation"
                  onClick={closeChatModal}
                >
                  <div
                    className="chatModal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="chat-modal-title"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="chatModalHeader">
                      <Link
                        href={`/profile/${chatWithId}`}
                        className="chatModalPeerLink"
                        aria-label={`Открыть профиль: ${peerLabel || 'собеседник'}`}
                        onClick={closeChatModal}
                      >
                        <span className="chatModalAvatar" aria-hidden>
                          {(peerLabel || 'С').slice(0, 1).toUpperCase()}
                        </span>
                        <h2 id="chat-modal-title" className="chatModalTitle">
                          {peerLabel || 'Собеседник'}
                        </h2>
                      </Link>
                      <button
                        type="button"
                        className="chatModalClose ghost"
                        onClick={closeChatModal}
                        aria-label="Закрыть чат"
                      >
                        Закрыть
                      </button>
                    </div>
                    <div className="chatModalBody">
                      <ChatCard
                        currentUserId={user?.userId}
                        peerLabel={peerLabel || 'Собеседник'}
                        hidePeerHeader
                        messageText={messageText}
                        messages={messages}
                        onMessageTextChange={setMessageText}
                        sendMessage={sendMessage}
                        onAttachmentPicked={(f) => void sendAttachmentFile(f)}
                        canInteract={Boolean(user)}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
          <aside className="vkAside" aria-hidden />
        </div>
      </div>
    </main>
  );
}
