import type { Timestamp } from 'firebase/firestore';

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: Timestamp;
  sharedPostId?: string;
  sharedPostMediaUrl?: string;
  sharedPostOwnerId?: string;
  read?: boolean;
  // Instagram Style Features
  replyToId?: string;
  replyToText?: string;
  replyToSenderName?: string;
  reactions?: Record<string, string>; // userId -> emoji
}
