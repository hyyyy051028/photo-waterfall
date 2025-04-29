import React, { useState, useEffect } from 'react';
import { loadAndCacheImage, isImageCached } from '../services/cacheService';

const PhotoItem = ({ photo, onDelete, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    let mounted = true;
    const loadImage = () => {
      const img = new Image();
      
      img.onload = () => {
        if (mounted) {
          setIsLoaded(true);
          setIsError(false);
          // 后台缓存图片，不阻塞显示
          loadAndCacheImage(photo.public_url).catch(console.error);
        }
      };
      
      img.onerror = (event) => {
        console.log(`图片加载失败 (重试 ${retryCount + 1}/${MAX_RETRIES}):`, photo.public_url);
        if (mounted) {
          if (retryCount < MAX_RETRIES) {
            // 延迟重试，每次重试间隔增加
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 1000 * (retryCount + 1));
          } else {
            setIsError(true);
            setIsLoaded(true);
          }
        }
      };
      
      img.src = photo.public_url;
      
      // 如果图片已经缓存，可能会立即触发 onload
      if (img.complete && !img.naturalWidth) {
        img.onerror();
      } else if (img.complete) {
        img.onload();
      }
      
      return img;
    };

    const img = loadImage();
    
    return () => {
      mounted = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [photo.public_url, retryCount]);

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
      {isError && (
        <div className="gallery-error-placeholder">
          <span>图片加载失败</span>
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
