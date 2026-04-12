import type { User, Story, Post } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => {
  const img = PlaceHolderImages.find((p) => p.id === id);
  if (!img) {
    throw new Error(`Image with id ${id} not found`);
  }
  return img;
};

export const users: User[] = [
  { id: 'u1', name: 'Sarah Lee', username: 'sarah_lee', avatar: getImage('user-1'), followers: 1204, following: 345 },
  { id: 'u2', name: 'Tom Chen', username: 'tomchen', avatar: getImage('user-2'), followers: 856, following: 102 },
  { id: 'u3', name: 'Maria Garcia', username: 'mariag', avatar: getImage('user-3'), followers: 2345, following: 543 },
  { id: 'u4', name: 'David Kim', username: 'davidkim_art', avatar: getImage('user-4'), followers: 567, following: 890 },
  { id: 'u5', name: 'Chloe Dubois', username: 'chloe_cooks', avatar: getImage('user-5'), followers: 4100, following: 210 },
  { id: 'u6', name: 'Kenji Tanaka', username: 'kenji_music', avatar: getImage('user-6'), followers: 980, following: 150 },
];

export const stories: Story[] = users.map((user, index) => ({
  id: `s${index + 1}`,
  user: user,
  image: getImage(`story-${index + 1}`),
  createdAt: new Date(Date.now() - (index + 1) * 2 * 60 * 60 * 1000).toISOString(), // 2, 4, 6... hours ago
}));

const getHoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

export const posts: Post[] = [
  {
    id: 'p1',
    user: users[0],
    image: getImage('post-1'),
    caption: 'My new best friend! Meet Cooper.',
    likes: 152,
    comments: [
      { user: users[1], text: 'So cute!' },
      { user: users[2], text: 'Aww what a fluffball!' },
    ],
    createdAt: getHoursAgo(2),
  },
  {
    id: 'p2',
    user: users[1],
    image: getImage('post-2'),
    caption: 'Perfect start to the morning. #matcha #latteart',
    likes: 88,
    comments: [],
    createdAt: getHoursAgo(8),
  },
  {
    id: 'p3',
    user: users[2],
    image: getImage('post-3'),
    caption: 'Love the lines on this building.',
    likes: 234,
    comments: [{ user: users[3], text: 'Great shot!' }],
    createdAt: getHoursAgo(15),
  },
  {
    id: 'p4',
    user: users[4],
    image: getImage('post-4'),
    caption: 'Wish I was back here right now...',
    likes: 543,
    comments: [],
    createdAt: getHoursAgo(25),
  },
    {
    id: 'p5',
    user: users[3],
    image: getImage('post-5'),
    caption: 'Concrete jungle where dreams are made of.',
    likes: 301,
    comments: [],
    createdAt: getHoursAgo(38),
  },
  {
    id: 'p6',
    user: users[5],
    image: getImage('post-6'),
    caption: 'Spotted this classic beauty today.',
    likes: 411,
    comments: [],
    createdAt: getHoursAgo(47),
  },
];

export const mainUser = users[0];
