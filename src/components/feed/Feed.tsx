import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService, Post } from '../../services/postService';
import { useAuth } from '../../auth/AuthContext';
import PostComponent from '../post/Post';
import './Feed.css';

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, logout, user } = useAuth();
  const userName = user?.username ?? "Guest";
  const token = localStorage.getItem("accessToken");
  // const userName = localStorage.getItem("username");
  const navigate = useNavigate();

  // useEffect(() => {
  //    // string | null
  //   if(!token) {
  //     navigate('/login');
  //     return;
  //   }
  //   fetchPosts();
  // }, []);

  useEffect(() => {
    // Redirect to login if not authenticated
    // Temporarily disabled for testing
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchPosts();
  }, [isAuthenticated, navigate]);

  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedPosts = await postService.getPosts();
      console.log('Fetched posts:', fetchedPosts);
      setPosts(fetchedPosts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load posts';
      setError(errorMessage);
      console.error('Error fetching posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/login');
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="feed-container">
      <header className="feed-header">
        <div className="feed-header-content">
          <h1>Feed</h1>
          <div className="feed-header-actions">
            <span className="welcome-text">Welcome, {userName || 'Guest'}!</span>
            {user && (
              <button 
                onClick={() => navigate(`/user/${user.user_id}`)} 
                className="btn-user-details"
              >
                User Details
              </button>
            )}
            <button 
              onClick={() => navigate('/upload')} 
              className="btn-upload-header"
            >
              + New Post
            </button>
            {isAuthenticated && (
              <button onClick={handleLogout} className="btn-logout-header">
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="feed-main">
        <div className="feed-content">
          {isLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading posts...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p className="error-message">{error}</p>
              <button onClick={fetchPosts} className="btn-retry">
                Try Again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-container">
              <p>No posts available</p>
              <button onClick={fetchPosts} className="btn-retry">
                Refresh
              </button>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map((post) => (
                <PostComponent key={post._id} post={post} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Feed;

