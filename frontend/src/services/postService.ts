// Post service for API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const buildApiUrl = (path: string) => new URL(path, API_BASE_URL).toString();

export interface Post {
  user_id: string | number;
  _id: string | number;
  url_image: string;
  description?: string;
  likes?: number; // Legacy field name
  like_count?: number; // API response field name
  is_liked?: boolean; // Whether current user has liked this post (from API)
  isLikedByCurrentUser?: boolean; // Alternative field name
  comment_count?: number;
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

export interface PaginatedPosts {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

class PostService {
  async getPosts(page = 1, limit = 10): Promise<PaginatedPosts> {
    try {
      const url = buildApiUrl(`/post?page=${page}&limit=${limit}`);
      console.info(`[postService] GET ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch posts' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return response.json() as Promise<PaginatedPosts>;
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

    const url = buildApiUrl("/post");
    console.info(`[postService] POST ${url}`);
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to create post" }));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getPostById(postId: string | number): Promise<Post> {
    const url = buildApiUrl(`/posts/${postId}`);
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to fetch post" }));
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
      formData.append("file", input.image);
    }

    const url = buildApiUrl(`/posts/${postId}`);
    console.info(`[postService] PUT ${url}`);
    const response = await fetch(url, {
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
    const url = buildApiUrl(`/posts/${postId}`);
    console.info(`[postService] DELETE ${url}`);
    const response = await fetch(url, {
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

