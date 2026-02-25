// Post service for API calls
const API_BASE_URL = 'http://localhost:3000';

export interface Post {
  user_id: number;
  _id: number;
  url_image: string;
  description?: string;
  likes?: number; // Legacy field name
  like_count?: number; // API response field name
  is_liked?: boolean; // Whether current user has liked this post (from API)
  isLikedByCurrentUser?: boolean; // Alternative field name
  created_at: string | Date;
  updated_at?: string | Date;
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
}

export const postService = new PostService();

