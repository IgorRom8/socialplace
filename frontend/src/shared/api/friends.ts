import type { FriendSummary } from '@/entities/user/model/friend';
import { apiRequest } from './http';

export type IncomingFriendRequestRow = { id: string; sender: FriendSummary };

export function fetchIncomingFriendRequests(userId: string) {
  return apiRequest<IncomingFriendRequestRow[]>(
    `/social/friends/requests/incoming?userId=${encodeURIComponent(userId)}`,
  );
}

export function respondToFriendRequest(requestId: string, accepted: boolean) {
  return apiRequest(`/social/friends/${encodeURIComponent(requestId)}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accepted }),
  });
}
