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
  // Text overlay fields
  overlayText?: string;
  overlayColor?: string;
  overlayPosition?: number; // 0 to 100 (percentage from top)
  overlayX?: number; // 0 to 100 (percentage from left)
  // Monetization & Analytics fields
  adImpressions?: number;
  estimatedEarnings?: number; // Total earnings for this post
  dailyEarnings?: Record<string, number>; // Mock tracking for stats
}
