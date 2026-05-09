
import type { Timestamp } from 'firebase/firestore';

export interface Message {
  id: string;
  senderId: string;
  recipientId: string; // Added to facilitate unread filtering
  text: string;
  createdAt: Timestamp;
  sharedPostId?: string;
  sharedPostMediaUrl?: string;
  sharedPostOwnerId?: string;
  isDeleted?: boolean;
  read?: boolean; // Track if the message has been seen
}
