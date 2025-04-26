import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowUpOutlined } from '@ant-design/icons';
import MusicPlayer from '../components/MusicPlayer';
import { useNavigate } from 'react-router-dom';
import { getAllPhotos, deletePhoto } from '../supabase';
import ImagePreview from '../components/ImagePreview';
import PhotoItem from '../components/PhotoItem';

import './Gallery.css';

function Gallery() {
  const [allPhotos, setAllPhotos] = useState([]);
  const [displayedPhotos, setDisplayedPhotos] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true); // 初始状态设置为 true
  const [error, setError] = useState(null);
  const [showBackTop, setShowBackTop] = useState(false);
  const PAGE_SIZE = 12;
  const loadMoreRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // 从 Supabase 加载照片
  const loadPhotos = useCallback(async () => {
    if (!hasMore) return;
    
    try {
      const { data, error } = await getAllPhotos();
      if (error) throw error;
      if (!data) throw new Error('没有获取到照片数据');
      
      const processedData = Array.isArray(data) ? data : [];
      const sortedData = processedData
        .filter(photo => photo && photo.upload_date && photo.public_url)
        .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date))
        .map(photo => ({
          id: photo.id,
          name: photo.name || '未命名照片',
          upload_date: photo.upload_date,
          public_url: photo.public_url,
          thumbnailUrl: photo.public_url
        }));
      
      // 使用函数式更新确保状态一致性
      setAllPhotos(sortedData);
      setDisplayedPhotos(prev => {
        if (prev.length === 0) {
          return sortedData.slice(0, PAGE_SIZE);
        }
        return prev;
      });
      setHasMore(sortedData.length > displayedPhotos.length);
      setError(null);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError(err.message || '加载照片失败');
    } finally {
      // 使用 setTimeout 避免状态更新过快
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, 300);
    }
  }, [hasMore, PAGE_SIZE, displayedPhotos.length]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // 初始加载
  useEffect(() => {
    loadPhotos();
  }, []);

  // 加载更多照片
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    
    const currentLength = displayedPhotos.length;
    const nextPhotos = allPhotos.slice(currentLength, currentLength + PAGE_SIZE);
    
    // 使用 setTimeout 避免状态更新过快
    setTimeout(() => {
      setDisplayedPhotos(prev => [...prev, ...nextPhotos]);
      setHasMore(currentLength + PAGE_SIZE < allPhotos.length);
      setLoadingMore(false);
    }, 100);
  }, [loadingMore, hasMore, loading, displayedPhotos.length, allPhotos, PAGE_SIZE]);

  // 监听滚动
  // 监听滚动，控制返回顶部按钮显示
  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 返回顶部功能
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

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
    (photo, index) => (
      <PhotoItem
        key={photo.id}
        photo={photo}
        onDelete={handleDelete}
        onClick={() => setPreviewIndex(index)}
      />
    ),
    [handleDelete, setPreviewIndex]
  );

  // 渲染照片网格
  const renderPhotoGrid = useCallback(() => {
    return (
      <div className="gallery-grid">
        {displayedPhotos.map((photo, index) => renderPhotoItem(photo, index))}
      </div>
    );
  }, [displayedPhotos, renderPhotoItem]);

  if (error) {
    return (
      <div className="gallery-error">
        <h2>加载失败</h2>
        <p>{error}</p>
        <button className="gallery-button" onClick={loadPhotos}>重试</button>
      </div>
    );
  }

  return (
    <div className="gallery-page">
      <MusicPlayer />
      <div className="gallery-container">
        {showBackTop && (
          <button
            className="back-to-top"
            onClick={scrollToTop}
            aria-label="返回顶部"
          >
            <ArrowUpOutlined />
          </button>
        )}
        <div className="gallery-header">
          <h1>山茶花开</h1>
          <br/>
          <h2>众里嫣然通一顾，人间颜色如尘土</h2>
          <p className="gallery-count">{allPhotos.length} 张照片</p>
          <div className="gallery-controls">
            {error && <div className="gallery-error">{error}</div>}
            <button className="gallery-button" onClick={() => navigate('/')}>
              来上传更多的美丽吧~
            </button>
          </div>
        </div>

        {loading && displayedPhotos.length === 0 ? (
          <div className="gallery-loading">
            <div className="gallery-spinner"></div>
            <p>正在加载照片...</p>
          </div>
        ) : allPhotos.length === 0 ? (
          <div className="gallery-empty">
            <p>还没有上传任何照片</p>
            <button className="gallery-button" onClick={() => navigate('/')}>
              去上传照片
            </button>
          </div>
        ) : (
          <>
            {renderPhotoGrid()}
            {hasMore && (
              <div ref={loadMoreRef} className="gallery-load-more">
                {loadingMore ? '加载更多...' : '向下滚动加载更多'}
              </div>
            )}
          </>
        )}

        {previewIndex !== null && displayedPhotos[previewIndex] && (
          <ImagePreview
            photos={displayedPhotos}
            currentIndex={previewIndex}
            onClose={(newIndex) => {
              if (typeof newIndex === 'number' && newIndex >= 0 && newIndex < displayedPhotos.length) {
                setPreviewIndex(newIndex);
              } else {
                setPreviewIndex(null);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

export default Gallery;
