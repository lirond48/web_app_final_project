import React, { useEffect, useState } from "react";
import { Post as PostType, postService } from "../../services/postService";
import LikeButton from "../like-button/LikeButton";
import { LikeState, likesService } from "../../services/likes-api.service";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Post.css";

interface PostProps {
  post: PostType;
  onPostUpdated?: (post: PostType) => void;
  onPostDeleted?: (postId: string | number) => void;
  hideActions?: boolean;
}

const Post: React.FC<PostProps> = ({ post, onPostUpdated, onPostDeleted, hideActions = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
  const imageSrc = post.url_image?.startsWith("http") ? post.url_image : `${apiBaseUrl}${post.url_image}`;
  const userIdStr = String(post.user_id);
  const isOwner = String(user?.user_id ?? "") === String(post.user_id);
  const commentCount = post.comment_count ?? 0;

  const initialLikeCount = post.like_count ?? post.likes ?? 0;
  const initialIsLiked = post.is_liked ?? post.isLikedByCurrentUser ?? likesService.isPostLikedLocally(post._id);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLikedByCurrentUser, setIsLikedByCurrentUser] = useState(initialIsLiked);

  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(post.description ?? "");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLikeCount(post.like_count ?? post.likes ?? 0);
    setDescription(post.description ?? "");
  }, [post.like_count, post.likes, post.description]);

  useEffect(() => {
    if (post.is_liked !== undefined || post.isLikedByCurrentUser !== undefined) {
      setIsLikedByCurrentUser(post.is_liked ?? post.isLikedByCurrentUser ?? false);
    }
  }, [post.is_liked, post.isLikedByCurrentUser]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleLikeStateChanged = (likeState: LikeState) => {
    setLikeCount(likeState.likeCount);
    setIsLikedByCurrentUser(likeState.isLikedByCurrentUser);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setNewImage(file);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview("");
    }
  };

  const handleSaveEdit = async () => {
    if (!description.trim() && !newImage) {
      setEditError("Please update description or choose a new image.");
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      const updated = await postService.updatePost(post._id, {
        description: description.trim(),
        image: newImage ?? undefined,
      });
      onPostUpdated?.(updated);
      setIsEditing(false);
      setNewImage(null);
      setPreview("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to update post";
      setEditError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this post? This action cannot be undone."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await postService.deletePost(post._id);
      onPostDeleted?.(post._id);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to delete post";
      window.alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-user-info">
          <div className="user-avatar">{userIdStr.charAt(0).toUpperCase()}</div>
          <span className="user-id">User {post.user_id}</span>
        </div>
        <span className="post-id">#{post._id}</span>
      </div>

      {post.url_image && (
        <div className="post-image-container">
          <img
            src={imageSrc}
            alt={post.description || "Post image"}
            className="post-image"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://via.placeholder.com/500x400?text=Image+Not+Found";
            }}
          />
        </div>
      )}

      {post.description && (
        <div className="post-description">
          <p>{post.description}</p>
        </div>
      )}

      {!hideActions && (
        <div className="post-actions">
          <LikeButton
            postId={post._id}
            likeCount={likeCount}
            isLikedByCurrentUser={isLikedByCurrentUser}
            onLikeStateChanged={handleLikeStateChanged}
          />
          {isOwner && (
            <div className="post-owner-actions">
              <button className="post-action-btn" type="button" onClick={() => setIsEditing(true)}>
                Edit
              </button>
              <button className="post-action-btn danger" type="button" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          )}
          <button
            className="post-action-btn"
            type="button"
            onClick={() => navigate(`/posts/${post._id}/comments`)}
          >
            Comments ({commentCount})
          </button>
        </div>
      )}

      {isEditing && (
        <div className="post-modal-backdrop" role="dialog" aria-modal="true">
          <div className="post-modal">
            <h3>Edit Post</h3>
            <label htmlFor={`post-desc-${post._id}`}>Description</label>
            <textarea
              id={`post-desc-${post._id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="post-modal-input"
              rows={4}
              maxLength={500}
            />

            <label htmlFor={`post-image-${post._id}`}>Replace image</label>
            <input id={`post-image-${post._id}`} type="file" accept="image/*" onChange={handleImageChange} />

            {(preview || post.url_image) && (
              <img className="post-modal-preview" src={preview || imageSrc} alt="Edit preview" />
            )}

            {editError && <p className="post-modal-error">{editError}</p>}

            <div className="post-modal-actions">
              <button className="btn-secondary" type="button" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </button>
              <button className="btn-primary" type="button" onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Post;
