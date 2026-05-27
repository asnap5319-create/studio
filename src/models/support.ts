
import type { Timestamp } from 'firebase/firestore';

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  query: string;
  aiResponse: string;
  status: 'pending' | 'resolved';
  createdAt: Timestamp;
  statsAtTime: {
    followers: number;
    posts: number;
    views: number;
  };
}
