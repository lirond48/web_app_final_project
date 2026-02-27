import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { userService, User as UserType } from "../../services/userService";
import { Post } from "../../services/postService";
import PostComponent from "../post/Post";
import "./User.css";

const User: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { isAuthenticated, user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const defaultImage = "/src/assets/male-avatar-boy-face-man-user-7.svg";

  const isCurrentUser = useMemo(() => {
    const loggedInUserId = currentUser?.user_id || localStorage.getItem("user_id");
    const profileUserId = user?.user_id || userId;
    return !!(loggedInUserId && profileUserId && String(loggedInUserId) === String(profileUserId));
  }, [currentUser?.user_id, user?.user_id, userId]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (userId) {
      fetchUserData();
      fetchUserPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchUserData = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const userData = await userService.getUser(userId);
      setUser(userData);
      setEditUsername(userData.username);
      setEditEmail(userData.email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load user data";
      setError(errorMessage);
      console.error("Error fetching user:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!userId) return;

    setIsLoadingPosts(true);

    try {
      const userPosts = await userService.getUserPosts(userId);
      setPosts(userPosts);
    } catch (err) {
      console.error("Error fetching user posts:", err);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleEdit = () => {
    if (!user) return;
    setEditUsername(user.username);
    setEditEmail(user.email);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (!user) return;
    setEditUsername(user.username);
    setEditEmail(user.email);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!userId || !user) return;

    setIsSaving(true);
    setError(null);

    try {
      const updatedUser = await userService.updateUser(userId, {
        username: editUsername.trim(),
        email: editEmail.trim(),
      });

      setUser(updatedUser);
      setIsEditing(false);

      if (currentUser && String(currentUser.user_id) === String(userId)) {
        localStorage.setItem("username", updatedUser.username);
        localStorage.setItem("email", updatedUser.email);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update user";
      setError(errorMessage);
      console.error("Error updating user:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      return;
    }

    setPreviewUrl(null);
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile || !userId || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      const url = await userService.uploadImage(selectedFile);
      const updatedUser = await userService.updateUser(userId, {
        username: user.username,
        email: user.email,
        image_url: url,
      });

      setUser(updatedUser);
      setSelectedFile(null);
      setPreviewUrl(null);

      if (currentUser && String(currentUser.user_id) === String(userId)) {
        localStorage.setItem("image", url);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload image";
      setError(errorMessage);
      console.error("Error uploading image:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) => prev.map((item) => (String(item._id) === String(updatedPost._id) ? updatedPost : item)));
    setSelectedPost((prev) => (prev && String(prev._id) === String(updatedPost._id) ? updatedPost : prev));
  };

  const handlePostDeleted = (postId: string | number) => {
    setPosts((prev) => prev.filter((item) => String(item._id) !== String(postId)));
    setSelectedPost((prev) => (prev && String(prev._id) === String(postId) ? null : prev));
  };

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="user-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="user-container">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => navigate("/feed")} className="btn-retry">
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="user-container">
      <header className="user-header">
        <div className="user-header-content">
          <button onClick={() => navigate("/feed")} className="btn-back">
            Back to Feed
          </button>
          <h1>User Details</h1>
        </div>
      </header>

      <main className="user-main">
        <div className="user-profile-section">
          <div className="user-profile-card ui-card">
            <div className="user-image-container">
              <img
                src={previewUrl || user.image_url || defaultImage}
                alt={user.username}
                className="user-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = defaultImage;
                }}
              />

              {isCurrentUser && (
                <div className="avatar-upload-panel">
                  <label htmlFor="avatar-upload" className="avatar-upload-label">
                    Choose profile image
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="avatar-upload-input"
                  />
                  <button onClick={handleUploadAvatar} disabled={!selectedFile || isUploading} className="btn-save btn-primary">
                    {isUploading ? "Uploading..." : "Upload Image"}
                  </button>
                </div>
              )}
            </div>

            <div className="user-info">
              {isEditing ? (
                <div className="user-edit-form">
                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                      type="text"
                      id="username"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      disabled={isSaving}
                      className="form-input ui-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      disabled={isSaving}
                      className="form-input ui-input"
                    />
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <div className="form-actions">
                    <button onClick={handleCancel} disabled={isSaving} className="btn-cancel btn-secondary">
                      Cancel
                    </button>

                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editUsername.trim() || !editEmail.trim()}
                      className="btn-save btn-primary"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="user-info-item">
                    <span className="user-info-label">Username:</span>
                    <span className="user-info-value">{user.username}</span>
                  </div>
                  <div className="user-info-item">
                    <span className="user-info-label">Email:</span>
                    <span className="user-info-value">{user.email}</span>
                  </div>

                  {isCurrentUser ? (
                    <button onClick={handleEdit} className="btn-edit btn-secondary">
                      Edit Profile
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="user-posts-section ui-card">
          <h2>User Posts ({posts.length})</h2>

          {isLoadingPosts ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-container">
              <p>No posts available</p>
            </div>
          ) : (
            <div className="user-posts-grid">
              {posts.map((post) => (
                <button
                  key={post._id}
                  type="button"
                  className="user-post-thumb"
                  onClick={() => setSelectedPost(post)}
                  aria-label={`Open post ${post._id}`}
                >
                  <img
                    src={
                      post.url_image.startsWith("http")
                        ? post.url_image
                        : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}${post.url_image}`
                    }
                    alt={post.description || "Post image"}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedPost && (
        <div className="profile-post-modal-backdrop" role="dialog" aria-modal="true">
          <div className="profile-post-modal ui-card">
            <div className="profile-post-modal-header">
              <h3>Post Details</h3>
              <button type="button" className="btn-ghost" onClick={() => setSelectedPost(null)}>
                Close
              </button>
            </div>
            <PostComponent
              post={selectedPost}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default User;
