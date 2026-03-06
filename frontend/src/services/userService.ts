import { Post } from "./postService";
import { apiFetch } from "./apiFetch";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export interface User {
  user_id: string;
  username: string;
  email: string;
  image_url?: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  image_url?: string;
}

class UserService {
  async getUser(userId: string): Promise<User> {
    try {
      const response = await apiFetch(`${API_BASE_URL}/users/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch user" }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: User = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred while fetching user");
    }
  }

  async updateUser(userId: string, userData: UpdateUserData): Promise<User> {
    try {
      const response = await apiFetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to update user" }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: User = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred while updating user");
    }
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    try {
      const response = await apiFetch(`${API_BASE_URL}/users/${userId}/posts`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch user posts" }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: Post[] = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred while fetching user posts");
    }
  }

  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      // Must remain "file" because the backend upload endpoint expects this field name.
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      return data.url;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred while uploading image");
    }
  }
}

export const userService = new UserService();
