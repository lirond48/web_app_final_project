import React, { useState, useEffect, useRef } from 'react';
import { Post as PostType } from '../../services/postService';
import Comments from '../comments/Comments';
import LikeButton from '../like-button/LikeButton';
import { LikeState, likesService } from '../../services/likes-api.service';
import './Post.css';

interface PostProps {
  post: PostType;
}

const Post: React.FC<PostProps> = ({ post }) => {
  const userIdStr = String(post.user_id);
  const postIdStr = String(post._id);
  
  // Track like state locally - use like_count from API response, fallback to likes
  const initialLikeCount = post.like_count ?? post.likes ?? 0;
  // Check if posts API includes liked status, then localStorage, otherwise false
  const initialIsLiked = post.is_liked ?? post.isLikedByCurrentUser ?? likesService.isPostLikedLocally(post._id);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLikedByCurrentUser, setIsLikedByCurrentUser] = useState(initialIsLiked);
  
  // Use ref to prevent duplicate API calls (e.g., from React StrictMode double-render)
  const hasCheckedLikeStatus = useRef<string | null>(null);
  const isCheckingRef = useRef<boolean>(false);

  // Fetch initial like status if not provided by posts API
  useEffect(() => {
    // If the posts API already includes the liked status, use it and skip the API call
    if (post.is_liked !== undefined || post.isLikedByCurrentUser !== undefined) {
      setIsLikedByCurrentUser(post.is_liked ?? post.isLikedByCurrentUser ?? false);
      hasCheckedLikeStatus.current = null; // Reset for next post
      isCheckingRef.current = false;
      return;
    }

    const postIdStr = String(post._id);
    
    // Prevent duplicate calls for the same post - check and set immediately
    if (hasCheckedLikeStatus.current === postIdStr || isCheckingRef.current) {
      return;
    }
    
    // Mark as checking immediately to prevent duplicate calls (before async operations)
    hasCheckedLikeStatus.current = postIdStr;
    isCheckingRef.current = true;

    // Only fetch if user is logged in
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      setIsLikedByCurrentUser(false);
      hasCheckedLikeStatus.current = null; // Reset since we're not making the call
      isCheckingRef.current = false;
      return;
    }

    const checkLikeStatus = async () => {
      try {
        const likeStatus = await likesService.isPostLikedByUser(post._id);
        // Only update if we're still checking the same post
        if (hasCheckedLikeStatus.current === postIdStr) {
          // Prefer localStorage (set by explicit user action) over API result
          // The API may return stale/incorrect data
          const localLiked = likesService.isPostLikedLocally(post._id);
          setIsLikedByCurrentUser(localLiked || likeStatus.isLiked);
        }
      } catch (error) {
        // Only update if we're still checking the same post
        if (hasCheckedLikeStatus.current === postIdStr) {
          console.error('Error checking like status:', error);
          // Keep the localStorage-based initial state — don't change anything
        }
      } finally {
        // Reset checking flag
        if (hasCheckedLikeStatus.current === postIdStr) {
          isCheckingRef.current = false;
        }
      }
    };

    checkLikeStatus();

    // Cleanup: reset refs when post changes
    return () => {
      if (hasCheckedLikeStatus.current === postIdStr) {
        hasCheckedLikeStatus.current = null;
        isCheckingRef.current = false;
      }
    };
  }, [post._id, post.is_liked, post.isLikedByCurrentUser]);

  // Update likeCount when post prop changes (e.g., after refresh)
  useEffect(() => {
    const newLikeCount = post.like_count ?? post.likes ?? 0;
    setLikeCount(newLikeCount);
  }, [post.like_count, post.likes]);

  // Update isLikedByCurrentUser when post prop changes (e.g., if posts API includes it)
  useEffect(() => {
    if (post.is_liked !== undefined || post.isLikedByCurrentUser !== undefined) {
      setIsLikedByCurrentUser(post.is_liked ?? post.isLikedByCurrentUser ?? false);
    }
  }, [post.is_liked, post.isLikedByCurrentUser]);

  const handleLikeStateChanged = (likeState: LikeState) => {
    // Update local state when like button state changes
    setLikeCount(likeState.likeCount);
    setIsLikedByCurrentUser(likeState.isLikedByCurrentUser);
  };
  
  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-user-info">
          <div className="user-avatar">
            {userIdStr.charAt(0).toUpperCase()}
          </div>
          <span className="user-id">User {post.user_id}</span>
        </div>
        <span className="post-id">#{post._id}</span>
      </div>
      
      {post.url_image && (
        <div className="post-image-container">
          <img 
            src={post.url_image} 
            alt={post.description || 'Post image'} 
            className="post-image"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/500x400?text=Image+Not+Found';
            }}
          />
        </div>
      )}
      
      {post.description && (
        <div className="post-description">
          <p>{post.description}</p>
        </div>
      )}

      <div className="post-actions">
        <LikeButton
          postId={post._id}
          likeCount={likeCount}
          isLikedByCurrentUser={isLikedByCurrentUser}
          onLikeStateChanged={handleLikeStateChanged}
        />
      </div>

      <Comments postId={postIdStr} />
    </div>
  );
};

export default Post;

