import React, { useState, useEffect } from 'react';
import { loadAndCacheImage, isImageCached } from '../services/cacheService';

const PhotoItem = ({ photo, onDelete, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setIsLoaded(true);
      // 后台缓存图片，不阻塞显示
      loadAndCacheImage(photo.public_url).catch(console.error);
    };
    
    img.onerror = () => {
      setIsError(true);
      setIsLoaded(true);
    };
    
    img.src = photo.public_url;
    
    // 如果图片已经缓存，可能会立即触发 onload
    if (img.complete) {
      setIsLoaded(true);
    }
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [photo.public_url]);

  return (
    <div
      className={`gallery-item ${!isLoaded ? 'loading' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {!isLoaded && !isError && (
        <div className="gallery-placeholder">
          <div className="gallery-spinner"></div>
        </div>
      )}
      <img
        src={photo.public_url}
        alt={photo.name}
        className={`gallery-image ${isLoaded ? 'loaded' : ''}`}
        onError={() => {
          setIsError(true);
          setIsLoaded(true);
        }}
      />
      {isError && (
        <div className="gallery-error">
          <span>加载失败</span>
        </div>
      )}
      <div className="gallery-info">
        <span className="gallery-name">{photo.name}</span>
        <span className="gallery-date">
          {new Date(photo.upload_date).toLocaleDateString()}
        </span>
        <button
          className="gallery-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(photo.id);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default React.memo(PhotoItem);
