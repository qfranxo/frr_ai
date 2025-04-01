import { Comment } from './post';

export type GeneratedImage = {
  id: number;
  imageUrl: string;
  style: string;
  prompt: string;
  likes: number;
  isLiked?: boolean;
  comments: Comment[];
};

export type StyleOption = {
  id: string;
  name: string;
  icon: string;
  description: string;
};

export type Option = {
  id: string;
  name: string;
  icon: string;
}; 