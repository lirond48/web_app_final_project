// Likes service for API calls
const API_BASE_URL = 'http://localhost:3000';

export interface LikePostResponseDto {
  message: string;
  liked: boolean; // Always true on success
  like_count: number; // Current like count for the post
  postId?: number; // Optional: can be added if server returns it
}

export interface LikeState {
  postId: number;
  likeCount: number;
  isLikedByCurrentUser: boolean;
}

export interface IsLikedResponse {
  isLiked: boolean;
  postId: number;
}

export interface LikeCountResponse {
  like_count: number;
  postId: number;
}

class LikesService {
  /**
   * Like a post
   * POST /post/:post_id/like
   */
  async likePost(postId: number): Promise<LikeState> {
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        throw new Error('User ID not found. Please log in.');
      }

      const response = await fetch(`${API_BASE_URL}/post/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to like post' }));
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Please log in to like posts');
        } else if (response.status === 404) {
          throw new Error('Post not found');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to perform this action');
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again later');
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: LikePostResponseDto = await response.json();
      const likeState = this.mapToLikeState(postId, data);
      this.setPostLikedLocally(postId, true);
      return likeState;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while liking post');
    }
  }

  /**
   * Unlike a post
   * DELETE /post/:post_id/like
   */
  async unlikePost(postId: number): Promise<LikeState> {
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        throw new Error('User ID not found. Please log in.');
      }

      const response = await fetch(`${API_BASE_URL}/post/${postId}/like`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to unlike post' }));
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Please log in to unlike posts');
        } else if (response.status === 404) {
          throw new Error('Post not found');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to perform this action');
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again later');
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: LikePostResponseDto = await response.json();
      const likeState = this.mapToLikeState(postId, data);
      this.setPostLikedLocally(postId, false);
      return likeState;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while unliking post');
    }
  }

  /**
   * Check if post is liked by current user
   * GET /post/:post_id/like
   */
  async isPostLikedByUser(postId: number): Promise<IsLikedResponse> {
    try {
      const token = localStorage.getItem('accessToken');
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`${API_BASE_URL}/post/${postId}/like?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to check like status' }));
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Please log in to check like status');
        } else if (response.status === 404) {
          throw new Error('Post not found');
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: IsLikedResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while checking like status');
    }
  }

  /**
   * Get like count for a post
   * GET /post/:post_id/likes/count
   */
  async getPostLikesCount(postId: number): Promise<LikeCountResponse> {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/post/${postId}/likes/count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to get like count' }));
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Please log in to get like count');
        } else if (response.status === 404) {
          throw new Error('Post not found');
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: LikeCountResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while getting like count');
    }
  }

  // --- localStorage helpers for persisting liked state across refreshes ---

  private getLikedPostsKey(): string {
    const userId = localStorage.getItem('user_id');
    return `liked_posts_${userId || 'anonymous'}`;
  }

  isPostLikedLocally(postId: number): boolean {
    try {
      const likedPosts = JSON.parse(localStorage.getItem(this.getLikedPostsKey()) || '[]') as number[];
      return likedPosts.includes(postId);
    } catch {
      return false;
    }
  }

  setPostLikedLocally(postId: number, liked: boolean): void {
    try {
      const key = this.getLikedPostsKey();
      const likedPosts = JSON.parse(localStorage.getItem(key) || '[]') as number[];
      if (liked) {
        if (!likedPosts.includes(postId)) {
          likedPosts.push(postId);
        }
      } else {
        const index = likedPosts.indexOf(postId);
        if (index > -1) {
          likedPosts.splice(index, 1);
        }
      }
      localStorage.setItem(key, JSON.stringify(likedPosts));
    } catch {
      // ignore localStorage errors
    }
  }

  /**
   * Map API response to normalized LikeState
   */
  private mapToLikeState(postId: number, response: LikePostResponseDto): LikeState {
    return {
      postId,
      likeCount: response.like_count,
      isLikedByCurrentUser: response.liked
    };
  }
}

export const likesService = new LikesService();
