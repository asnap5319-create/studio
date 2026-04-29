import type { Timestamp } from 'firebase/firestore';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
  likeCount?: number;
}
