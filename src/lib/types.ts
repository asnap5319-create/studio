export type UserProfile = {
  id: string;
  username: string;
  profilePictureUrl?: string;
  bio?: string;
  followerIds: string[];
  followingIds: string[];
};

export type Post = {
  id:string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string; // simpler date
  expiresAt: string; // simpler date
  user?: UserProfile;
  likesCount?: number;
  comments?: Comment[];
};

export type Story = {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  user: UserProfile;
};

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string; // simpler date
  user?: UserProfile;
};
