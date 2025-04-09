import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Masonry from 'react-masonry-css';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { getAllPhotos, deletePhoto } from '../supabase';
import ImagePreview from '../components/ImagePreview';
import 'react-lazy-load-image-component/src/effects/blur.css';
import '../App.css';

function Gallery() {
  const [allPhotos, setAllPhotos] = useState([]);
  const [displayedPhotos, setDisplayedPhotos] = useState([]);
  const [layout, setLayout] = useState('masonry');
  const [selectedSize, setSelectedSize] = useState('mixed');
  const [previewIndex, setPreviewIndex] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageSize = 12;
  const loadMoreRef = useRef(null);
  const navigate = useNavigate();

  // 从 Supabase 加载照片
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const photos = await getAllPhotos();
        const sortedPhotos = photos.sort((a, b) =>
          b.upload_date.localeCompare(a.upload_date)
        );
        setAllPhotos(sortedPhotos);
        setDisplayedPhotos(sortedPhotos.slice(0, pageSize));
        setHasMore(sortedPhotos.length > pageSize);
      } catch (error) {
        console.error('Error loading photos:', error);
      }
    };

    loadPhotos();
  }, []);

  // 加载更多照片
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const currentLength = displayedPhotos.length;
    const nextPhotos = allPhotos.slice(currentLength, currentLength + pageSize);

    setTimeout(() => {
      setDisplayedPhotos((prev) => [...prev, ...nextPhotos]);
      setHasMore(currentLength + pageSize < allPhotos.length);
      setLoadingMore(false);
    }, 500);
  }, [displayedPhotos.length, allPhotos, hasMore, loadingMore]);

  // 监听滚动
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadMore]);

  // 获取照片样式类名
  const getPhotoClassName = useCallback(() => {
    let className = 'photo-item';
    if (selectedSize === 'large') {
      className += ' large';
    } else if (selectedSize === 'small') {
      className += ' small';
    } else {
      className += Math.random() > 0.5 ? ' large' : ' small';
    }
    return className;
  }, [selectedSize]);

  // 处理照片删除
  const handleDelete = useCallback(
    async (photoId) => {
      if (window.confirm('确定要删除这张照片吗？')) {
        try {
          await deletePhoto(photoId);
          setAllPhotos((prev) => prev.filter((p) => p.id !== photoId));
          setDisplayedPhotos((prev) => prev.filter((p) => p.id !== photoId));
        } catch (error) {
          console.error('Error deleting photo:', error);
          alert('删除照片失败，请稍后重试');
        }
      }
    },
    []
  );

  // 渲染单个照片项
  const renderPhotoItem = useCallback(
    (photo) => {
      return (
        <div 
          key={photo.id}
          className={getPhotoClassName()}
          onClick={() => setPreviewIndex(displayedPhotos.indexOf(photo))}
        >
          <img
            src={photo.public_url}
            alt={photo.name}
            loading="lazy"
            className="photo-image"
          />
          <div className="photo-info">
            <span className="photo-name">{photo.name}</span>
            <span className="photo-date">
              {new Date(photo.upload_date).toLocaleDateString()}
            </span>
            <button
              className="delete-button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(photo.id);
              }}
              title="删除"
            >
              ×
            </button>
          </div>
        </div>
      );
    },
    [displayedPhotos, getPhotoClassName, handleDelete]
  );

  // 渲染照片网格
  const renderPhotoGrid = useCallback(() => {
    if (layout === 'masonry') {
      return (
        <Masonry
          breakpointCols={{
            default: 4,
            1800: 3,
            1400: 2,
            1100: 2,
            700: 1,
            500: 1,
          }}
          className="photo-grid masonry-layout"
          columnClassName="masonry-column"
        >
          {displayedPhotos.map((photo) => renderPhotoItem(photo))}
        </Masonry>
      );
    }

    return (
      <div className={`photo-container ${layout}-layout`}>
        {displayedPhotos.map((photo) => renderPhotoItem(photo))}
      </div>
    );
  }, [layout, displayedPhotos, renderPhotoItem]);

  return (
    <div className="app">
      <header className="header">
        <h1>照片库</h1>
        <div className="controls">
          <div className="layout-buttons">
            <button
              className={`layout-button ${
                layout === 'masonry' ? 'active' : ''
              }`}
              onClick={() => setLayout('masonry')}
            >
              瀑布流
            </button>
            <button
              className={`layout-button ${layout === 'grid' ? 'active' : ''}`}
              onClick={() => setLayout('grid')}
            >
              网格
            </button>
            <button
              className={`layout-button ${layout === 'list' ? 'active' : ''}`}
              onClick={() => setLayout('list')}
            >
              列表
            </button>
          </div>
          {layout === 'masonry' && (
            <div className="size-buttons">
              <button
                className={`size-button ${
                  selectedSize === 'mixed' ? 'active' : ''
                }`}
                onClick={() => setSelectedSize('mixed')}
              >
                混合大小
              </button>
              <button
                className={`size-button ${
                  selectedSize === 'large' ? 'active' : ''
                }`}
                onClick={() => setSelectedSize('large')}
              >
                大图
              </button>
              <button
                className={`size-button ${
                  selectedSize === 'small' ? 'active' : ''
                }`}
                onClick={() => setSelectedSize('small')}
              >
                小图
              </button>
            </div>
          )}
          <button
            className="upload-button"
            onClick={() => navigate('/')}
          >
            返回上传
          </button>
        </div>
        <p className="photo-count">{allPhotos.length} 张照片</p>
      </header>

      {allPhotos.length === 0 ? (
        <div className="empty-state">
          <p>还没有上传任何照片</p>
          <button
            className="upload-button"
            onClick={() => navigate('/')}
          >
            去上传照片
          </button>
        </div>
      ) : (
        <>
          {renderPhotoGrid()}
          {hasMore && (
            <div
              ref={loadMoreRef}
              className="load-more"
            >
              {loadingMore ? '加载更多...' : ''}
            </div>
          )}
        </>
      )}

      {previewIndex !== null && (
        <ImagePreview
          photos={displayedPhotos}
          currentIndex={previewIndex}
          onClose={(newIndex) => {
            if (typeof newIndex === 'number') {
              setPreviewIndex(newIndex);
            } else {
              setPreviewIndex(null);
            }
          }}
        />
      )}
    </div>
  );
}

export default Gallery;
