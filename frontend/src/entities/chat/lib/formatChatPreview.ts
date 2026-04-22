import type { ChatListItem } from '@/entities/chat/model/types';

export function formatChatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (Number.isNaN(d.getTime())) return '';
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  const y = d.getFullYear();
  const cy = now.getFullYear();
  if (y === cy) {
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function chatPreviewText(item: ChatListItem, maxLen = 52) {
  const t = item.lastMessage.content.trim();
  const body = t.length > maxLen ? `${t.slice(0, maxLen)}…` : t;
  return item.lastMessage.isOwn ? `Вы: ${body}` : body;
}
