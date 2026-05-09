import type { Timestamp } from 'firebase/firestore';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
  sharedPostId?: string;
  sharedPostMediaUrl?: string;
  sharedPostOwnerId?: string;
  isDeleted?: boolean; // Flag to indicate if the message was deleted
}
