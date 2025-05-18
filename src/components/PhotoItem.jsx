import React, { useState, useEffect } from 'react';
import { loadAndCacheImage, isImageCached } from '../services/cacheService';
import { StarOutlined, StarFilled } from '@ant-design/icons';
import './PhotoItem.css';

const PhotoItem = ({ photo, onDelete, onClick, onToggleFavorite }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    let mounted = true;
    let retryTimeout = null;

    const loadImage = () => {
      const img = new Image();
      
      img.onload = () => {
        if (mounted) {
          setIsLoaded(true);
          setIsError(false);
          // 后台缓存图片，不阻塞显示
          loadAndCacheImage(photo.public_url).catch(() => {
            // 缓存失败不影响显示
            console.warn('Failed to cache image, continuing without cache');
          });
        }
      };
      
      img.onerror = (event) => {
        if (!mounted) return;

        if (retryCount < MAX_RETRIES) {
          console.log(`图片加载失败 (重试 ${retryCount + 1}/${MAX_RETRIES}):`, photo.public_url);
          // 添加随机延迟，避免同时重试多个图片
          const delay = 1000 * (retryCount + 1) + Math.random() * 1000;
          retryTimeout = setTimeout(() => {
            if (mounted) {
              setRetryCount(prev => prev + 1);
            }
          }, delay);
        } else {
          console.warn(`图片加载失败，已达到最大重试次数:`, photo.public_url);
          setIsError(true);
          setIsLoaded(true);
        }
      };
      
      // 尝试从缓存加载
      const cachedImage = isImageCached(photo.public_url);
      if (cachedImage) {
        img.src = photo.public_url;
      } else {
        // 如果没有缓存，直接从网络加载
        img.src = `${photo.public_url}?t=${Date.now()}`; // 添加时间戳避免浏览器缓存
      }
      
      // 如果图片已经加载完成
      if (img.complete) {
        if (!img.naturalWidth) {
          img.onerror();
        } else {
          img.onload();
        }
      }
      
      return img;
    };

    const img = loadImage();
    
    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
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
      
      {/* 收藏按钮 - 右上角 */}
      <button
        className={`gallery-favorite ${photo.is_favorite ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite && onToggleFavorite(photo.id, !photo.is_favorite);
        }}
      >
        {photo.is_favorite ? <StarFilled style={{ color: '#FFD700' }} /> : <StarOutlined />}
      </button>
      
      {/* 删除按钮 - 右上角 */}
      <button
        className="gallery-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(photo.id);
        }}
      >
        ×
      </button>
      
      <div className="gallery-info">
        <span className="gallery-name">{photo.name}</span>
        <span className="gallery-date">
          {new Date(photo.upload_date).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

export default React.memo(PhotoItem);
