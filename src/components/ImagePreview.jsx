import { useEffect, useState, useCallback } from 'react';
import { loadAndCacheImage, isImageCached } from '../services/cacheService';
import './ImagePreview.css';

function ImagePreview({ photos, currentIndex, onClose }) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentPhoto = photos[currentIndex];

  const onPrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsLoading(true);
      onClose(currentIndex - 1);
    }
  }, [currentIndex, onClose]);

  const onNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setIsLoading(true);
      onClose(currentIndex + 1);
    }
  }, [currentIndex, photos.length, onClose]);

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onPrev()
      } else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        onNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [onClose, onPrev, onNext, currentIndex, photos.length])

  // 加载图片
  useEffect(() => {
    if (!currentPhoto) return;

    setIsLoading(true);
    const img = new Image();

    img.onload = () => {
      setIsLoading(false);
      // 后台缓存图片
      loadAndCacheImage(currentPhoto.public_url).catch(console.error);
    };

    img.onerror = () => {
      console.error('Failed to load image');
      setIsLoading(false);
    };

    img.src = currentPhoto.public_url;

    // 如果图片已经缓存，可能会立即触发 onload
    if (img.complete) {
      setIsLoading(false);
    }

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [currentIndex, currentPhoto])

  // 触摸事件处理
  const handleTouchStart = useCallback((e) => {
    setTouchStart(e.targetTouches[0].clientX)
    setIsLoading(true)
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!touchStart) return
    setTouchEnd(e.targetTouches[0].clientX)
  }, [touchStart])

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentIndex < photos.length - 1) {
      onNext()
    } else if (isRightSwipe && currentIndex > 0) {
      onPrev()
    }

    setTouchStart(null)
    setTouchEnd(null)
  }, [touchStart, touchEnd, currentIndex, photos.length, onNext, onPrev])

  if (!currentPhoto) return null;

  return (
    <div className="image-preview-overlay" onClick={() => onClose()}>
      <div className="image-preview-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={() => onClose()}>×</button>
        
        <div 
          className="image-preview-main"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isLoading && (
            <div className="image-preview-loading">
              <div className="gallery-spinner"></div>
            </div>
          )}

          <img
            key={currentPhoto.public_url}
            src={currentPhoto.public_url}
            alt={currentPhoto.name}
            className={`image-preview-img ${isLoading ? '' : 'loaded'}`}
          />
          
          {currentIndex > 0 && (
            <button className="nav-button prev" onClick={onPrev}>‹</button>
          )}
          
          {currentIndex < photos.length - 1 && (
            <button className="nav-button next" onClick={onNext}>›</button>
          )}
        </div>
        
        <div className="image-info">
          <h3>{currentPhoto.name}</h3>
          <p>{new Date(currentPhoto.upload_date).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

export default ImagePreview
