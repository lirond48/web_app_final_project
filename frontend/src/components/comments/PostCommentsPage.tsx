import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { commentService, Comment } from "../../services/comment.service";
import { postService, Post } from "../../services/post.service";
import "./PostCommentsPage.css";

const PostCommentsPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  const loadData = async () => {
    if (!postId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [postData, commentsData] = await Promise.all([
        postService.getPostById(postId),
        commentService.getPostComments(postId),
      ]);
      setPost(postData);
      setComments(commentsData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load comments";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId || !newComment.trim()) return;

    setIsPosting(true);
    setError(null);
    try {
      await commentService.createPostComment(postId, newComment.trim(), user?.user_id);
      setNewComment("");
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post comment";
      setError(msg);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="post-comments-page ui-shell">
      <div className="post-comments-card ui-card">
        <div className="post-comments-header">
          <button className="btn-ghost" type="button" onClick={() => navigate(-1)}>
            Back
          </button>
          <h2>Post Comments</h2>
        </div>

        {isLoading ? (
          <p className="post-comments-info">Loading comments...</p>
        ) : error ? (
          <p className="post-comments-error">{error}</p>
        ) : (
          <>
            {post?.url_image && (
              <img
                className="post-comments-image"
                src={post.url_image.startsWith("http") ? post.url_image : `${apiBaseUrl}${post.url_image}`}
                alt={post.description || "Post image"}
              />
            )}

            <p className="post-comments-description">{post?.description || "No description"}</p>
            <p className="post-comments-info">Comments ({comments.length})</p>

            <div className="post-comments-list">
              {comments.length === 0 ? (
                <p className="post-comments-empty">No comments yet.</p>
              ) : (
                comments.map((item) => (
                  <article key={item._id} className="post-comment-item">
                    <div className="post-comment-top">
                      <span>User {item.user_id}</span>
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <p>{item.comment}</p>
                  </article>
                ))
              )}
            </div>

            <form className="post-comment-form" onSubmit={handleSubmit}>
              <input
                className="ui-input"
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                maxLength={500}
              />
              <button className="btn-primary" type="submit" disabled={isPosting || !newComment.trim()}>
                {isPosting ? "Posting..." : "Post"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default PostCommentsPage;
