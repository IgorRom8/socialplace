export type MessageEntity = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  createdAt?: string;
};
