import { FieldValue } from "firebase/firestore";

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  profilePictureUrl?: string;
  bio?: string;
  followerIds: string[];
  followingIds: string[];
  createdAt?: FieldValue;
  updatedAt?: FieldValue;
};

export type Post = {
  id:string;
  userId: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption?: string;
  likeCount: number;
  commentCount: number;
  createdAt: any; // Using `any` for simplicity with Firestore Timestamps
  user?: UserProfile;
};

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: any;
  user?: UserProfile;
};
