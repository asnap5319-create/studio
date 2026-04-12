import type { ImagePlaceholder } from './placeholder-images';

export type User = {
  id: string;
  name: string;
  username: string;
  avatar: ImagePlaceholder;
  followers: number;
  following: number;
};

export type Story = {
  id: string;
  user: User;
  image: ImagePlaceholder;
  createdAt: string; // ISO string
};

export type Post = {
  id: string;
  user: User;
  image: ImagePlaceholder;
  caption: string;
  likes: number;
  comments: { user: User; text: string }[];
  createdAt: string; // ISO string
};
