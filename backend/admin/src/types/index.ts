export interface Prompt {
  id: string;
  title: string;
  promptText: string;
  imageUrl: string;
  category: string;
  tags: string[];
  isTrending: boolean;
  isNew: boolean;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: number;
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
