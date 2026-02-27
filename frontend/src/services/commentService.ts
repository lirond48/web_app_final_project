// Comment service for API calls
const API_BASE_URL = 'http://localhost:3000';

export interface Comment {
  post_id: string | number;
  user_id: number;
  comment: string;
  _id: string;
  created_at: string;
}

class CommentService {
  async getComments(postId: string | number): Promise<Comment[]> {
    // Simulate API delay
    // await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const response = await fetch(`${API_BASE_URL}/comment/${postId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch comments' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: Comment[] = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching comments');
    }
  }

  async addComment(postId: string | number, comment: string, userId: number): Promise<Comment> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // API call
    try {
      const response = await fetch(`${API_BASE_URL}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post_id: postId, comment, user_id: userId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to add comment' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: Comment = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while adding comment');
    }
  }
}

export const commentService = new CommentService();

