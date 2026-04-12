import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  profilePictureUrl?: string;
  bio?: string;
  totalEarnings: number;
  followerIds: string[];
  followingIds: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type Post = {
  id:string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  viewCount: number;
  postEarnings: number;
  user?: UserProfile; 
  likesCount?: number; 
  comments?: Comment[];
};

export type Story = {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: Timestamp;
  expiresAt: Timestamp;
};

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
  user?: UserProfile;
};

export type Like = {
  id: string;
  postId: string;
  userId:string;
  createdAt: Timestamp;
};
