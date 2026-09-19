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
  gender: string;
  createdAt: number;
  likeCount: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  displayOrder: number;
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

export interface DeviceRegistration {
  id: string;
  installation_id: string;
  created_at: number;
  updated_at: number;
}

export interface NotificationSendRequest {
  title: string;
  body: string;
  imageUrl?: string;
  deepLink?: string;
  audience: 'all' | 'installation';
  installation_id?: string;
}

export interface NotificationSendResponse {
  success: boolean;
  sent: number;
  failed: number;
  message?: string;
  error?: string;
}
