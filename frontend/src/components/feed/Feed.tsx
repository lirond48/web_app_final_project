import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService, Post } from '../../services/postService';
import { useAuth } from '../../auth/AuthContext';
import PostComponent from '../post/Post';
import './Feed.css';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M10.5 3a7.5 7.5 0 1 1 4.72 13.33l4.22 4.23a.75.75 0 1 1-1.06 1.06l-4.23-4.22A7.5 7.5 0 0 1 10.5 3Zm0 1.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
  </svg>
);

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, logout, user } = useAuth();
  const userName = user?.username ?? "Guest";
  const navigate = useNavigate();

  useEffect(() => {
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
      setPosts(fetchedPosts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load posts';
      setError(errorMessage);
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

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) => prev.map((item) => (String(item._id) === String(updatedPost._id) ? updatedPost : item)));
  };

  const handlePostDeleted = (postId: string | number) => {
    setPosts((prev) => prev.filter((item) => String(item._id) !== String(postId)));
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="feed-container">
      <header className="feed-header">
        <div className="feed-header-content">
          <h1>StyleShare</h1>
          <div className="feed-header-actions">
            <span className="welcome-text">Welcome, {userName || 'Guest'}!</span>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="btn-search-header"
              aria-label="Open Search Looks"
            >
              <SearchIcon />
              <span>Search</span>
            </button>
            {user && (
              <button onClick={() => navigate(`/user/${user.user_id}`)} className="btn-user-details">
                User Details
              </button>
            )}
            <button onClick={() => navigate('/upload')} className="btn-upload-header">
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
        <section className="feed-hero ui-card">
          <div className="feed-hero-copy">
            <h2>Build a better looking feed</h2>
            <p>Share image-first posts, keep your profile updated, and discover looks by season, event, or vibe.</p>
            <div className="feed-hero-actions">
              <button onClick={() => navigate('/upload')} className="btn-upload-header btn-primary">
                Upload New Post
              </button>
              <button onClick={() => navigate('/search')} className="btn-search-header btn-search-hero" type="button">
                <SearchIcon />
                <span>Search Looks</span>
              </button>
              {user && (
                <button onClick={() => navigate(`/user/${user.user_id}`)} className="btn-user-details">
                  Open Profile
                </button>
              )}
            </div>
          </div>
          <div className="feed-hero-metrics">
            <article>
              <strong>{posts.length}</strong>
              <span>Total posts</span>
            </article>
            <article>
              <strong>Fast upload</strong>
              <span>Drag and drop image support</span>
            </article>
            <article>
              <strong>Search-ready</strong>
              <span>Find outfits by season, style, or occasion</span>
            </article>
          </div>
        </section>

        <div className="feed-layout">
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
                <PostComponent
                  key={post._id}
                  post={post}
                  onPostUpdated={handlePostUpdated}
                  onPostDeleted={handlePostDeleted}
                />
              ))}
            </div>
          )}

          <aside className="feed-sidebar ui-card">
            <h3>Quick Actions</h3>
            <button onClick={() => navigate('/upload')} className="btn-primary sidebar-btn">
              Create Post
            </button>
            <button onClick={() => navigate('/search')} className="btn-secondary sidebar-btn" type="button">
              Search Looks
            </button>
            {user && (
              <button onClick={() => navigate(`/user/${user.user_id}`)} className="btn-secondary sidebar-btn">
                Edit Profile
              </button>
            )}
            <button onClick={fetchPosts} className="btn-ghost sidebar-btn">
              Refresh Feed
            </button>
            <p>Tip: keyboard users can Tab through every button and link with visible focus rings.</p>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Feed;
