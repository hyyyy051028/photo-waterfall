import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Masonry from 'react-masonry-css';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { getAllPhotos, updatePhotoOrder } from '../services/db';
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

  // 从IndexedDB加载照片
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const photos = await getAllPhotos();
        const sortedPhotos = photos.sort((a, b) => 
          b.uploadDate.localeCompare(a.uploadDate)
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

  // 处理照片排序
  const handleSort = useCallback(async (photoId) => {
    const currentPhoto = displayedPhotos.find(p => p.id === photoId);
    if (!currentPhoto) return;

    // 将选中的照片移到最前面
    const newPhotos = [
      currentPhoto,
      ...displayedPhotos.filter(p => p.id !== photoId)
    ];

    // 更新显示的照片顺序
    setDisplayedPhotos(newPhotos);

    // 更新所有照片的顺序
    const newAllPhotos = [
      currentPhoto,
      ...allPhotos.filter(p => p.id !== photoId)
    ];
    setAllPhotos(newAllPhotos);

    // 保存新的顺序到数据库
    try {
      await updatePhotoOrder(newAllPhotos.map((photo, index) => ({
        id: photo.id,
        order: index
      })));
    } catch (error) {
      console.error('Error updating photo order:', error);
    }
  }, [displayedPhotos, allPhotos, setDisplayedPhotos, setAllPhotos]);

  // 加载更多照片
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    const currentLength = displayedPhotos.length;
    const nextPhotos = allPhotos.slice(currentLength, currentLength + pageSize);
    
    setTimeout(() => {
      setDisplayedPhotos(prev => [...prev, ...nextPhotos]);
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

  // 获取随机的照片样式
  const getPhotoStyle = useCallback(() => {
    const baseStyles = {
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      borderRadius: '8px',
      boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 6px',
      margin: '8px'
    };

    if (selectedSize === 'mixed') {
      const randomSize = Math.random() > 0.5 ? 'large' : 'small';
      return {
        ...baseStyles,
        width: randomSize === 'large' ? '300px' : '200px',
        height: randomSize === 'large' ? '400px' : '300px'
      };
    }

    if (selectedSize === 'large') {
      return {
        ...baseStyles,
        width: '300px',
        height: '400px'
      };
    }

    return {
      ...baseStyles,
      width: '200px',
      height: '300px'
    };
  }, [selectedSize]);

  // 渲染照片项
  const renderPhotoItem = useCallback((photo) => {
    const style = getPhotoStyle();
    
    return (
      <div
        key={photo.id}
        className="photo-item"
        style={style}
        onClick={() => handleSort(photo.id)}
      >
        <LazyLoadImage
          src={photo.url}
          alt={photo.name}
          effect="blur"
          className="photo-image"
        />
        <div className="photo-info">
          <span className="photo-name">{photo.name}</span>
          <span className="photo-date">{new Date(photo.uploadDate).toLocaleDateString()}</span>
        </div>
      </div>
    );
  }, [getPhotoStyle, handleSort]);

  // 渲染照片网格
  const renderPhotoGrid = useCallback(() => {
    if (layout === 'masonry') {
      return (
        <Masonry
          breakpointCols={{
            default: selectedSize === 'small' ? 4 : selectedSize === 'large' ? 2 : 3,
            1800: selectedSize === 'small' ? 3 : selectedSize === 'large' ? 2 : 3,
            1400: selectedSize === 'small' ? 3 : selectedSize === 'large' ? 2 : 2,
            1100: selectedSize === 'small' ? 2 : selectedSize === 'large' ? 1 : 2,
            700: selectedSize === 'small' ? 2 : 1,
            500: 1,
          }}
          className={`photo-grid masonry-layout ${selectedSize}-size`}
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
  }, [layout, selectedSize, displayedPhotos, renderPhotoItem]);

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
          <button className="upload-button" onClick={() => navigate('/')}>
            返回上传
          </button>
        </div>
        <p className="photo-count">{allPhotos.length} 张照片</p>
      </header>

      {allPhotos.length === 0 ? (
        <div className="empty-state">
          <p>还没有上传任何照片</p>
          <button className="upload-button" onClick={() => navigate('/')}>
            去上传照片
          </button>
        </div>
      ) : (
        <>
          {renderPhotoGrid()}
          {hasMore && (
            <div ref={loadMoreRef} className="load-more">
              {loadingMore ? '加载更多...' : ''}
            </div>
          )}
        </>
      )}

      {previewIndex !== null && (
        <ImagePreview
          photos={displayedPhotos}
          currentIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}

export default Gallery;
