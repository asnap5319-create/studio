import type { Timestamp } from 'firebase/firestore';

export interface Post {
  id: string;
  userId: string;
  mediaUrl: string;
  caption: string;
  hashtags: string[];
  createdAt: Timestamp;
  expiresAt: Timestamp;
  likeCount: number;
  commentCount: number;
  viewCount: number;
}

    