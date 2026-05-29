
import type { Timestamp } from 'firebase/firestore';

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  updatedAt: Timestamp;
  blockedParticipants?: string[]; // Array of user IDs who are blocked in this chat
}
