import type { ChatListItem } from '@/entities/chat/model/types';

const PREFIX = 'social:chatList:v1:';

export function chatListStorageKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

function coerceChatListItem(raw: unknown): ChatListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const peer = item.peer as Record<string, unknown> | undefined;
  const lm = item.lastMessage as Record<string, unknown> | undefined;
  if (!peer || !lm) return null;
  const id = peer.id != null ? String(peer.id) : '';
  if (!id) return null;
  const fullName = typeof peer.fullName === 'string' ? peer.fullName : '';
  const email = typeof peer.email === 'string' ? peer.email : '';
  const content = typeof lm.content === 'string' ? lm.content : '';
  const createdAt = typeof lm.createdAt === 'string' ? lm.createdAt : '';
  const isOwn = Boolean(lm.isOwn);
  if (!createdAt) return null;
  return {
    peer: { id, fullName: fullName || 'Собеседник', email },
    lastMessage: { content, createdAt, isOwn },
  };
}

export function readChatListFromStorage(userId: string): ChatListItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(chatListStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(coerceChatListItem).filter((x): x is ChatListItem => x !== null);
  } catch {
    return [];
  }
}

export function writeChatListToStorage(userId: string, list: ChatListItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(chatListStorageKey(userId), JSON.stringify(list));
  } catch {
    /* квота, приватный режим */
  }
}

export function clearChatListStorage(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(chatListStorageKey(userId));
  } catch {
    /* ignore */
  }
}
