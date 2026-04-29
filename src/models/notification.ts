import type { Timestamp } from 'firebase/firestore';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  type: 'follow' | 'like' | 'comment';
  read: boolean;
  createdAt: Timestamp;
  postId?: string;
}
