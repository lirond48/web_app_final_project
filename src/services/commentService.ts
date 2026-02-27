const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const buildApiUrl = (path: string) => new URL(path, API_BASE_URL).toString();

export interface Comment {
  post_id: string | number;
  user_id: string | number;
  comment: string;
  _id: string;
  created_at: string;
}

class CommentService {
  async getPostComments(postId: string | number): Promise<Comment[]> {
    const response = await fetch(buildApiUrl(`/posts/${postId}/comments`), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to fetch comments" }));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async createPostComment(postId: string | number, comment: string, userId?: string): Promise<Comment> {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(buildApiUrl(`/posts/${postId}/comments`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ comment, user_id: userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to add comment" }));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getPostCommentsCount(postId: string | number): Promise<number> {
    const response = await fetch(buildApiUrl(`/posts/${postId}/comments/count`), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to fetch comments count" }));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.count ?? 0;
  }
}

export const commentService = new CommentService();
