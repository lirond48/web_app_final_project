// Post service for API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export interface Post {
  user_id: string | number;
  _id: string | number;
  url_image: string;
  description?: string;
  likes?: number; // Legacy field name
  like_count?: number; // API response field name
  is_liked?: boolean; // Whether current user has liked this post (from API)
  isLikedByCurrentUser?: boolean; // Alternative field name
  created_at: string | Date;
  updated_at?: string | Date;
}

export interface CreatePostInput {
  user_id: string;
  description: string;
  image: File;
}

export interface UpdatePostInput {
  description?: string;
  image?: File;
}

class PostService {
  async getPosts(): Promise<Post[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock data
    // return MOCK_POSTS;
    
    // Original API call (commented out for now)
    try {
      const response = await fetch(`${API_BASE_URL}/post`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch posts' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: Post[] = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching posts');
    }
  }

  async createPost(input: CreatePostInput): Promise<Post> {
    const formData = new FormData();
    formData.append("user_id", input.user_id);
    formData.append("description", input.description);
    formData.append("image", input.image);

    const response = await fetch(`${API_BASE_URL}/post`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to create post" }));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async updatePost(postId: string | number, input: UpdatePostInput): Promise<Post> {
    const token = localStorage.getItem("accessToken");
    const formData = new FormData();

    if (typeof input.description === "string") {
      formData.append("description", input.description);
    }
    if (input.image) {
      formData.append("image", input.image);
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to update post" }));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async deletePost(postId: string | number): Promise<void> {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to delete post" }));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
  }
}

export const postService = new PostService();

