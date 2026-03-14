import React, { useState, useEffect } from 'react';
import { commentService, Comment } from '../../services/comment.service';
import { useAuth } from '../../auth/AuthContext';
import './Comments.css';

interface CommentsProps {
  postId: string;
}

const Comments: React.FC<CommentsProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const fetchedComments = await commentService.getPostComments(postId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !user) {
      return;
    }

    setIsSubmitting(true);
    try {
      const addedComment = await commentService.createPostComment(
        postId,
        newComment.trim(),
        user.user_id
      );
      setComments([...comments, addedComment]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="comments-container">
      <div className="comments-header">
        <h3>Comments ({comments.length})</h3>
      </div>

      {isLoading ? (
        <div className="comments-loading">
          <p>Loading comments...</p>
        </div>
      ) : (
        <>
          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => {
                const userIdStr = String(comment.user_id);
                return (
                  <div key={comment._id} className="comment-item">
                    <div className="comment-user-avatar">
                      {userIdStr.charAt(0).toUpperCase()}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-user-id">User {comment.user_id}</span>
                        {comment.created_at && (
                          <span className="comment-date">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="comment-text">{comment.comment}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSubmit} className="comment-form">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="comment-input"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="comment-submit-btn"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default Comments;

