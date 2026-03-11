import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService, Post } from '../../services/postService';
import { useAuth } from '../../auth/AuthContext';
import PostComponent from '../post/Post';
import BrandLogo from '../ui/BrandLogo';
import './Feed.css';

const LIMIT = 10;

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M10.5 3a7.5 7.5 0 1 1 4.72 13.33l4.22 4.23a.75.75 0 1 1-1.06 1.06l-4.23-4.22A7.5 7.5 0 0 1 10.5 3Zm0 1.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
  </svg>
);

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, logout, user } = useAuth();
  const userName = user?.username ?? 'Guest';
  const navigate = useNavigate();

  // Sentinel div watched by IntersectionObserver to trigger next page load
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Always points to the latest fetchMorePosts — avoids stale closure in observer
  const fetchMoreRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchPosts();
  }, [isAuthenticated, navigate]);

  // Re-attach observer whenever posts change (sentinel enters DOM) or hasMore changes
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreRef.current();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [posts.length, hasMore]);

  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);
    setPosts([]);
    setHasMore(true);

    try {
      const result = await postService.getPosts(1, LIMIT);
      setPosts(result.posts);
      setPage(2);
      setHasMore(result.pagination.hasMore);
      setTotalPosts(result.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMorePosts = async () => {
    if (!hasMore || isFetchingMore) return;
    setIsFetchingMore(true);

    try {
      const result = await postService.getPosts(page, LIMIT);
      setPosts((prev) => [...prev, ...result.posts]);
      setPage((prev) => prev + 1);
      setHasMore(result.pagination.hasMore);
      setTotalPosts(result.pagination.total);
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  // Keep ref in sync with the latest version of fetchMorePosts
  fetchMoreRef.current = fetchMorePosts;

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) navigate('/login');
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((item) => (String(item._id) === String(updatedPost._id) ? updatedPost : item)),
    );
  };

  const handlePostDeleted = (postId: string | number) => {
    setPosts((prev) => prev.filter((item) => String(item._id) !== String(postId)));
    setTotalPosts((prev) => Math.max(0, prev - 1));
  };

  if (!isAuthenticated) return null;

  return (
    <div className="feed-container">
      <header className="feed-header">
        <div className="feed-header-content">
          <BrandLogo showImage={false} showText={true} linkTo="/" className="feed-brand feed-brand-wordmark" />
          <div className="feed-header-actions">
            <span className="welcome-text">Welcome, {userName}!</span>
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
              <strong>{totalPosts}</strong>
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
          ) : error && posts.length === 0 ? (
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
            <div className="posts-column">
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

              {/* Sentinel: becomes visible as the user nears the bottom */}
              <div ref={sentinelRef} className="scroll-sentinel" />

              {isFetchingMore && (
                <div className="loading-more">
                  <div className="spinner-small" />
                  <span>Loading more posts…</span>
                </div>
              )}

              {!hasMore && (
                <p className="end-of-feed">You've seen all posts</p>
              )}
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
