import type { FriendSummary } from '@/entities/user/model/friend';

export type ChatListItem = {
  peer: FriendSummary;
  lastMessage: {
    content: string;
    createdAt: string;
    isOwn: boolean;
  };
};
