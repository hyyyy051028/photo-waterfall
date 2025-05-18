import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowUpOutlined } from '@ant-design/icons';
import MusicPlayer from '../components/MusicPlayer';
import { useNavigate } from 'react-router-dom';
import { getAllPhotosWithFavoriteStatus, deletePhoto, toggleFavorite, checkIsFavorite } from '../supabase';
import ImagePreview from '../components/ImagePreview';
import PhotoItem from '../components/PhotoItem';

import './Gallery.css';

function Gallery() {
  const [allPhotos, setAllPhotos] = useState([]);
  const [displayedPhotos, setDisplayedPhotos] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBackTop, setShowBackTop] = useState(false);
  const [sortMode, setSortMode] = useState('date'); // 'date', 'random', 'name'
  const [showSortMenu, setShowSortMenu] = useState(false);
  const PAGE_SIZE = 12;
  const loadMoreRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // 从 Supabase 加载照片
  const loadPhotos = useCallback(async () => {
    if (!hasMore) return;
    
    try {
      // 直接获取带有收藏状态的照片
      const data = await getAllPhotosWithFavoriteStatus();
      if (!data) throw new Error('没有获取到照片数据');
      
      const processedData = Array.isArray(data) ? data : [];
      const filteredData = processedData
        .filter(photo => photo && photo.upload_date && photo.public_url)
        .map(photo => ({
          id: photo.id,
          name: photo.name || '未命名照片',
          upload_date: photo.upload_date,
          public_url: photo.public_url,
          thumbnailUrl: photo.public_url,
          is_favorite: photo.is_favorite, // 从数据库获取收藏状态
          randomSeed: Math.random() // 添加随机种子用于随机排序
        }));

      // 根据当前排序模式对数据进行排序
      const sortedData = sortPhotos(filteredData, sortMode);
      
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
  
  // 处理照片收藏状态切换
  const handleToggleFavorite = useCallback(
    async (photoId, newFavoriteState) => {
      try {
        // 使用 Supabase 切换收藏状态
        await toggleFavorite(photoId, newFavoriteState);
        
        // 更新本地状态
        const updatePhotoState = (photos) => {
          return photos.map(photo => {
            if (photo.id === photoId) {
              return { ...photo, is_favorite: newFavoriteState };
            }
            return photo;
          });
        };
        
        setAllPhotos(updatePhotoState);
        setDisplayedPhotos(updatePhotoState);
      } catch (error) {
        console.error('Error toggling favorite status:', error);
        alert('更新收藏状态失败，请稍后重试');
      }
    },
    []
  );

  // 照片排序函数
  const sortPhotos = useCallback((photos, mode) => {
    switch (mode) {
      case 'random':
        return [...photos].sort((a, b) => a.randomSeed - b.randomSeed);
      case 'name':
        return [...photos].sort((a, b) => a.name.localeCompare(b.name));
      case 'date':
      default:
        return [...photos].sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
    }
  }, []);

  // 切换排序模式
  const handleSortChange = useCallback((newMode) => {
    if (newMode === 'random' && sortMode === 'random') {
      // 如果已经是随机排序模式，则重新随机排序
      setAllPhotos(prev => {
        const newPhotos = prev.map(photo => ({
          ...photo,
          randomSeed: Math.random() // 重新生成随机种子
        }));
        const newSorted = sortPhotos(newPhotos, 'random');
        setDisplayedPhotos(newSorted.slice(0, displayedPhotos.length));
        return newSorted;
      });
    } else {
      setSortMode(newMode);
      setAllPhotos(prev => {
        const newSorted = sortPhotos(prev, newMode);
        setDisplayedPhotos(newSorted.slice(0, displayedPhotos.length));
        return newSorted;
      });
    }
    setShowSortMenu(false); // 选择后关闭菜单
  }, [sortMode, sortPhotos, displayedPhotos.length]);

  // 渲染单个照片项
  const renderPhotoItem = useCallback(
    (photo, index) => (
      <PhotoItem
        key={photo.id}
        photo={photo}
        onDelete={handleDelete}
        onToggleFavorite={handleToggleFavorite}
        onClick={() => setPreviewIndex(index)}
      />
    ),
    [handleDelete, handleToggleFavorite, setPreviewIndex]
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
          <div className="gallery-controls">
            <div className="sort-dropdown">
              <button 
                className="sort-dropdown-button"
                onClick={() => setShowSortMenu(!showSortMenu)}
              >
                <span>
                  {sortMode === 'date' ? '按时间' :
                   sortMode === 'random' ? '随机排序' :
                   '按名称'}
                </span>
                <span className="dropdown-arrow">{showSortMenu ? '▲' : '▼'}</span>
              </button>
              {showSortMenu && (
                <div className="sort-dropdown-menu">
                  <button 
                    className={`sort-menu-item ${sortMode === 'date' ? 'active' : ''}`}
                    onClick={() => handleSortChange('date')}
                  >
                    按时间
                  </button>
                  <button 
                    className={`sort-menu-item ${sortMode === 'random' ? 'active' : ''}`}
                    onClick={() => handleSortChange('random')}
                  >
                    随机排序
                  </button>
                  <button 
                    className={`sort-menu-item ${sortMode === 'name' ? 'active' : ''}`}
                    onClick={() => handleSortChange('name')}
                  >
                    按名称
                  </button>
                </div>
              )}
            </div>
            <p className="gallery-count">{allPhotos.length} 张照片</p>
            {error && <div className="gallery-error">{error}</div>}
            <button className="gallery-button" onClick={() => navigate('/upload')}>
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
