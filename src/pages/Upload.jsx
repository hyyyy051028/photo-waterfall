import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadPhoto } from '../supabase';
import '../styles/Upload.css';

function Upload() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // 处理文件选择
  const handleFileSelect = useCallback((files) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setUploadError('请选择图片文件');
      return;
    }
    setSelectedFiles(prev => [...prev, ...imageFiles]);
    setUploadError(null);
  }, []);

  // 处理文件输入变化
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  // 处理拖放事件
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // 处理拖放文件
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // 处理文件删除
  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 触发文件选择
  const onButtonClick = () => {
    inputRef.current.click();
  };

  // 处理文件上传
  const handleUpload = useCallback(async () => {
    if (!selectedFiles.length) {
      setUploadError('请选择要上传的照片');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const progress = ((i + 1) / selectedFiles.length) * 100;
        setUploadProgress(progress);

        const metadata = {
          name: file.name,
          size: file.size,
          type: file.type,
          upload_date: new Date().toISOString()
        };

        await uploadPhoto(file, metadata);
      }

      setSelectedFiles([]);
      navigate('/gallery');
    } catch (error) {
      console.error('Error uploading photos:', error);
      setUploadError(error.message || '上传照片失败，请稍后重试');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFiles, navigate]);

  // 管理文件预览
  const [previews, setPreviews] = useState({});

  // 加载文件预览
  const loadFilePreview = useCallback((file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({
        ...prev,
        [file.name]: reader.result
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  // 当选中文件变化时加载预览
  useEffect(() => {
    selectedFiles.forEach(file => {
      if (!previews[file.name]) {
        loadFilePreview(file);
      }
    });
  }, [selectedFiles, loadFilePreview, previews]);

  // 渲染文件预览
  const renderFilePreview = useCallback((file, index) => {
    return (
      <div key={index} className="preview-item">
        <div 
          className="preview-image" 
          style={{ 
            backgroundImage: `url(${previews[file.name] || ''})`,
            backgroundColor: previews[file.name] ? 'transparent' : '#f0f0f0'
          }}
        >
          <button 
            className="remove-button"
            onClick={() => handleRemoveFile(index)}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="preview-info">
          <span className="preview-name">{file.name}</span>
          <span className="preview-size">{Math.round(file.size / 1024)} KB</span>
        </div>
      </div>
    );
  }, [previews, handleRemoveFile]);

  return (
    <div className="upload-container">
      <h1>照片上传</h1>
      
      <div 
        className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="file-input"
        />
        <div className="upload-content">
          <div className="upload-icon">📸</div>
          <p>拖放照片到这里，或者</p>
          <button 
            className="select-button" 
            onClick={onButtonClick}
            type="button"
          >
            选择照片
          </button>
          <p className="upload-hint">支持 JPG、PNG 等常见图片格式</p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="preview-container">
          <div className="preview-header">
            <h2>已选择 {selectedFiles.length} 张照片</h2>
            <button
              className="upload-button"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? '正在上传...' : '开始上传'}
            </button>
          </div>
          <div className="preview-grid">
            {selectedFiles.map((file, index) => renderFilePreview(file, index))}
          </div>
        </div>
      )}

      {uploadProgress > 0 && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <span className="progress-text">{Math.round(uploadProgress)}%</span>
        </div>
      )}

      {uploadError && (
        <div className="error-message">
          <p>{uploadError}</p>
        </div>
      )}

      <div className="action-buttons">
        <button
          onClick={() => navigate('/gallery')}
          className="view-gallery-button"
          type="button"
        >
          查看照片库
        </button>
      </div>
    </div>
  );
}

export default Upload;
