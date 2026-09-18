export interface Prompt {
  id: string;
  title: string;
  promptText: string;
  imageUrl: string;
  category_id: string;
  categoryName?: string;
  tags: string[];
  isTrending: boolean;
  isNew: boolean;
  outputType: string;
  aiModel: string;
  createdAt: number;
  likeCount: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: number;
}

export interface DashboardStats {
  totalPrompts: number;
  totalCategories: number;
  totalLikes: number;
}

export interface AuthSession {
  authenticated: boolean;
}

export interface UploadResponse {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}
