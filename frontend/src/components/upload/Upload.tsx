import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { postService } from '../../services/postService';
import './Upload.css';

const Upload: React.FC = () => {
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setSelectedImage(null);
      setPreviewUrl('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setError(null);
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    if (!selectedImage) {
      setError('Please select an image');
      return;
    }

    if (!user?.user_id) {
      setError('User is not authenticated');
      return;
    }

    setIsSubmitting(true);

    try {
      await postService.createPost({
        user_id: user.user_id,
        description,
        image: selectedImage,
      });
      navigate('/feed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload post';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/feed');
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <div className="upload-header">
          <h2>Create New Post</h2>
          <p>Share a photo and write a description</p>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label>Image</label>
            <div
              className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFileSelect(e.dataTransfer.files?.[0] || null);
              }}
            >
              <input
                type="file"
                accept="image/*"
                disabled={isSubmitting}
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                className="file-input"
                id="image"
              />
              <label htmlFor="image" className="file-input-label">
                Drag and drop an image here, or click to choose
              </label>
            </div>
            {selectedImage && <small className="form-hint">Selected: {selectedImage.name}</small>}
          </div>

          {previewUrl && (
            <div className="image-preview">
              <img 
                src={previewUrl} 
                alt="Preview" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's on your mind?"
              disabled={isSubmitting}
              required
              rows={4}
              className="form-textarea"
              maxLength={500}
            />
            <small className="form-hint">{description.length}/500 characters</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim() || !selectedImage}
              className="btn-submit"
            >
              {isSubmitting ? 'Uploading...' : 'Upload Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Upload;

