export type PostEntity = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; fullName: string; avatarUrl?: string | null };
  likes: { id: string; userId: string }[];
  comments: {
    id: string;
    content: string;
    author: { id: string; fullName: string; avatarUrl?: string | null };
  }[];
  images: { id: string; url: string }[];
  musicTracks: { id: string; title: string; artist: string; audioUrl: string }[];
};
