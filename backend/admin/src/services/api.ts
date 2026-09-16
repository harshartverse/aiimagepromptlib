import { Prompt, Category, UploadResponse } from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // Required to send HttpOnly session cookies
    credentials: 'same-origin', 
  });

  if (response.status === 401) {
    window.dispatchEvent(new Event('unauthorized'));
  }

  if (!response.ok) {
    let message = 'API Error';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch (e) {
      // Not JSON
    }
    throw new ApiError(message, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  login: (password: string) => fetchApi('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => fetchApi('/auth/logout', { method: 'POST' }),
  getSession: () => fetchApi<{ authenticated: boolean }>('/auth/session'),
  
  createPrompt: (data: Omit<Prompt, 'id' | 'createdAt'>) => fetchApi<Prompt>('/prompts', { method: 'POST', body: JSON.stringify(data) }),
  updatePrompt: (id: string, data: Omit<Prompt, 'id' | 'createdAt'>) => fetchApi('/prompts/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deletePrompt: (id: string) => fetchApi('/prompts/' + id, { method: 'DELETE' }),

  createCategory: (data: Omit<Category, 'id' | 'createdAt'>) => fetchApi<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Omit<Category, 'id' | 'createdAt'>) => fetchApi('/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => fetchApi('/categories/' + id, { method: 'DELETE' }),

  uploadImage: (imageBase64: string) => fetchApi<UploadResponse>('/upload', { method: 'POST', body: JSON.stringify({ imageBase64 }) }),
  
  getPrompts: () => fetchApi<Prompt[]>('/prompts', { method: 'GET' }),
  getCategories: () => fetchApi<Category[]>('/categories', { method: 'GET' })
};
