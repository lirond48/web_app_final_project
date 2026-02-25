import React, { useState, useEffect } from 'react';
import { likesService, LikeState } from '../../services/likes-api.service';
import './LikeButton.css';

interface LikeButtonProps {
  postId: number;
  likeCount: number;
  isLikedByCurrentUser: boolean;
  onLikeStateChanged?: (likeState: LikeState) => void;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  postId,
  likeCount: initialLikeCount,
  isLikedByCurrentUser: initialIsLiked,
  onLikeStateChanged
}) => {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLikedByCurrentUser, setIsLikedByCurrentUser] = useState(initialIsLiked);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update state when props change
  useEffect(() => {
    setLikeCount(initialLikeCount);
    setIsLikedByCurrentUser(initialIsLiked);
  }, [initialLikeCount, initialIsLiked]);

  const handleLikeClick = async () => {
    // Prevent double-click spamming
    if (isPending) {
      return;
    }

    // Store previous state for rollback
    const previousLikeCount = likeCount;
    const previousIsLiked = isLikedByCurrentUser;

    // Optimistic update
    setIsPending(true);
    setError(null);
    const newIsLiked = !isLikedByCurrentUser;
    const newLikeCount = newIsLiked
      ? Math.max(0, likeCount + 1)
      : Math.max(0, likeCount - 1);

    setIsLikedByCurrentUser(newIsLiked);
    setLikeCount(newLikeCount);

    try {
      // Make API call
      const response = await (newIsLiked
        ? likesService.likePost(postId)
        : likesService.unlikePost(postId));

      // Update with server response
      setLikeCount(response.likeCount);
      setIsLikedByCurrentUser(response.isLikedByCurrentUser);
      setIsPending(false);

      // Notify parent component
      if (onLikeStateChanged) {
        onLikeStateChanged(response);
      }
    } catch (err) {
      // Rollback to previous state on error
      setLikeCount(previousLikeCount);
      setIsLikedByCurrentUser(previousIsLiked);
      setIsPending(false);

      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error toggling like:', errorMessage);
      
      // Show error message (you can replace with your notification service)
      alert(errorMessage);
    }
  };

  const getAriaLabel = (): string => {
    if (isPending) {
      return 'Processing...';
    }
    return isLikedByCurrentUser
      ? `Unlike this post (${likeCount} likes)`
      : `Like this post (${likeCount} likes)`;
  };

  return (
    <button
      type="button"
      className={`like-button ${isLikedByCurrentUser ? 'liked' : ''} ${isPending ? 'loading' : ''}`}
      disabled={isPending}
      aria-pressed={isLikedByCurrentUser}
      aria-label={getAriaLabel()}
      onClick={handleLikeClick}
    >
      <span className="like-icon">
        {isPending ? (
          <span className="spinner"></span>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={isLikedByCurrentUser ? '#ff6b6b' : 'none'}
            stroke={isLikedByCurrentUser ? '#ff6b6b' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        )}
      </span>
      <span className="like-count">{likeCount}</span>
    </button>
  );
};

export default LikeButton;

