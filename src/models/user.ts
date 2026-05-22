
export type UserProfile = {
  id: string;
  name: string;
  username: string;
  username_lowercase?: string; // Field for case-insensitive search
  profileImageUrl: string;
  email: string;
  bio?: string;
  fcmToken?: string; // Token for push notifications
  updatedAt?: any;
};
