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

export interface CategoryDistribution {
  id: string;
  categoryName: string;
  promptCount: number;
}

export interface TopLikedPrompt {
  id: string;
  title: string;
  promptText: string;
  imageUrl: string;
  aiModel: string;
  gender: string;
  outputType: string;
  categoryName: string;
  likeCount: number;
}

export interface DashboardStats {
  totalPrompts: number;
  newPrompts: number;
  trendingPrompts: number;
  totalCategories: number;
  totalLikes: number;
  likesToday: number;
  likes7Days: number;
  likes30Days: number;
  registeredDevices: number;
  newDevices7Days: number;
  categoryDistribution: CategoryDistribution[];
  topLikedPrompts: TopLikedPrompt[];
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

export interface NotificationErrorDetail {
  code: string;
  message: string;
  count: number;
}

export interface NotificationSendResponse {
  success: boolean;
  sent: number;
  failed: number;
  message?: string;
  error?: string;
  errors?: NotificationErrorDetail[];
}
