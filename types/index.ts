export interface IFeature {
  id: number;
  title: string;
  description: string;
  icon: string;
}

export interface IHeroSection {
  title: string;
  subtitle: string;
  searchPlaceholder?: string;
  ctaText: string;
}

export interface IPost {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  author: string;
  likes: number;
  comments: number;
}

export interface IComment {
  id: number | string;
  text: string;
  content?: string;
  author: string;
  createdAt: string;
  userId?: string;
  userName?: string;
}

export interface IUser {
  id: string;
  email: string;
  name: string;
}

// InteractionButtons 인터페이스
export interface IInteractionButtons {
  likes?: number;
  comments: IComment[];
  isLiked?: boolean;
  onLike?: () => void;
  onComment: () => void;
}

// ResultCard 인터페이스
export interface IResultCard {
  image: {
    id: string;
    imageUrl: string;
    prompt: string;
    style: string;
    author: string;
    createdAt: string;
    renderingStyle?: string;
    gender?: string;
    age?: string;
    aspectRatio?: string;
    category?: string;
    userId?: string;
  };
}

// Layout 인터페이스
export interface ILayout {
  children: React.ReactNode;
  withBlob?: boolean;
}

// PostCard 인터페이스
export interface IPostCard {
  post: {
    id: number | string;
    title: string;
    description: string;
    imageUrl: string;
    author: string;
    userId?: string;
    aspectRatio?: string;
    style?: {
      id: string;
      name: string;
      icon: string;
    } | string;
    category?: string;
    tags?: string[];
    likes?: number;
    comments: IComment[];
    createdAt: string;
    prompt?: string;
    userImage?: string;
    userName?: string;
    timestamp?: string;
    selectedCategory?: string;
  };
  onLike?: (postId: number | string) => void;
  onComment: (text: string) => void;
  onDeleteComment: (postId: number | string, commentId: number | string) => void;
  isLiked?: boolean;
  likesCount?: number;
  currentComments: IComment[];
  imageClassName?: string;
  currentUser?: {
    id: string;
    name: string;
    username: string;
    imageUrl?: string;
  };
  handleShare?: () => void;
}

// FeatureSection 인터페이스
export interface IFeatureSection {
  features?: IFeature[];
}

export interface IModelOptions {
  style?: string;
  renderStyle?: string;
  size?: string;
  negativePrompt?: string;
}

export interface IGenerateRequest {
  prompt: string;
  modelOptions: IModelOptions;
  productImage?: string;
}

export interface IGenerateResponse {
  success: true;
  imageUrl: string;
  quality: {
    faceQuality: number;
    poseAccuracy: number;
    professionalismScore: number;
  }
}

export type ErrorCode = 'INVALID_PROMPT' | 'GENERATION_FAILED' | 'SERVER_ERROR';

export interface IErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
} 