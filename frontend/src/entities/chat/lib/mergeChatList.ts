import type { ChatListItem } from '@/entities/chat/model/types';

function peerKey(id: string): string {
  return String(id);
}

/**
 * Объединяет ответ `/social/chats` с уже показанным списком.
 * Ответ API имеет приоритет по общим peer id; записи только из prev сохраняются,
 * если бэкенд их не вернул (гонка после отправки, временный сбой, рассинхрон id).
 */
export function mergeChatListItems(prev: ChatListItem[], fromApi: ChatListItem[]): ChatListItem[] {
  const byId = new Map<string, ChatListItem>();
  for (const item of fromApi) {
    byId.set(peerKey(item.peer.id), item);
  }
  for (const item of prev) {
    const k = peerKey(item.peer.id);
    if (!byId.has(k)) {
      byId.set(k, item);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime(),
  );
}
