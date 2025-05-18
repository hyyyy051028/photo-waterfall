import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getFavoritePhotos, getAllPhotos, toggleFavorite } from '../supabase';
import './Carousel.css';

function Carousel({ images: defaultImages, interval = 5000 }) {
  const [images, setImages] = useState(defaultImages || []);
  const [favoritePhotos, setFavoritePhotos] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState([]);
  const [carouselHeight, setCarouselHeight] = useState('auto');
  const timerRef = useRef(null);
  const carouselRef = useRef(null);

  const startAutoPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, interval);
  }, [interval, images.length]);

  const handlePrev = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    startAutoPlay();
  }, [images.length, startAutoPlay, currentIndex]);

  const handleNext = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const nextIndex = (currentIndex + 1) % images.length;
    setCurrentIndex(nextIndex);
    startAutoPlay();
  }, [images.length, startAutoPlay, currentIndex]);

  // 加载收藏的照片
  const loadFavoritePhotos = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 从 Supabase 获取收藏的照片
      const { data, error } = await getFavoritePhotos();
      
      if (error) {
        console.error('Error loading favorite photos:', error);
        setFavoritePhotos([]);
        return;
      }
      
      if (data && Array.isArray(data) && data.length > 0) {
        // 保存完整的照片数据
        setFavoritePhotos(data);
        
        // 提取照片的公开URL用于轮播图
        const favoriteUrls = data.map(photo => photo.public_url);
        
        // 如果有收藏的照片，使用它们更新轮播图
        if (favoriteUrls.length > 0) {
          setImages(favoriteUrls);
        }
      } else {
        setFavoritePhotos([]);
      }
    } catch (error) {
      console.error('Error loading favorite photos:', error);
      setFavoritePhotos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化时加载收藏照片
  useEffect(() => {
    loadFavoritePhotos();
  }, [loadFavoritePhotos]);

  // 处理照片选择
  const handleSelectPhoto = async (photoUrl, photoId) => {
    if (!multiSelectMode) {
      // 单选模式，直接添加并关闭模态框
      if (!images.includes(photoUrl)) {
        setImages(prev => [...prev, photoUrl]);
        
        // 自动收藏该照片
        try {
          await toggleFavorite(photoId, true);
          // 更新本地照片数据的收藏状态
          setAllPhotos(prev => prev.map(photo => {
            if (photo.id === photoId) {
              return { ...photo, is_favorite: true };
            }
            return photo;
          }));
        } catch (error) {
          console.error('Error adding photo to favorites:', error);
        }
      }
      setIsModalVisible(false);
    } else {
      // 多选模式，将照片添加到选中列表
      if (selectedPhotos.includes(photoUrl)) {
        setSelectedPhotos(prev => prev.filter(url => url !== photoUrl));
      } else {
        setSelectedPhotos(prev => [...prev, photoUrl]);
      }
    }
  };
  
  // 切换多选模式
  const toggleMultiSelectMode = () => {
    if (multiSelectMode && selectedPhotos.length > 0) {
      // 如果正在退出多选模式且有选中的照片，先清空选中列表
      setSelectedPhotos([]);
    }
    setMultiSelectMode(!multiSelectMode);
  };
  
  // 添加选中的照片到轮播图
  const addSelectedPhotosToCarousel = async () => {
    if (selectedPhotos.length === 0) return;
    
    // 过滤掉已经在轮播图中的照片
    const newPhotos = selectedPhotos.filter(url => !images.includes(url));
    
    if (newPhotos.length > 0) {
      setImages(prev => [...prev, ...newPhotos]);
      
      // 自动收藏添加的照片
      try {
        // 找到选中照片的ID
        const selectedPhotoIds = allPhotos
          .filter(photo => newPhotos.includes(photo.public_url))
          .map(photo => photo.id);
        
        // 将每张照片标记为收藏
        const favoritePromises = selectedPhotoIds.map(id => toggleFavorite(id, true));
        await Promise.all(favoritePromises);
        
        // 更新本地照片数据的收藏状态
        setAllPhotos(prev => prev.map(photo => {
          if (selectedPhotoIds.includes(photo.id)) {
            return { ...photo, is_favorite: true };
          }
          return photo;
        }));
      } catch (error) {
        console.error('Error adding photos to favorites:', error);
      }
    }
    
    // 清空选中列表并关闭模态框
    setSelectedPhotos([]);
    setMultiSelectMode(false);
    setIsModalVisible(false);
  };
  
  // 从轮播图中批量删除照片
  const removeSelectedPhotosFromCarousel = async () => {
    if (selectedPhotos.length === 0) return;
    
    try {
      // 找到要删除的照片对应的ID
      const photosToRemove = [];
      
      // 从收藏照片中找到要删除的照片ID
      for (const photoUrl of selectedPhotos) {
        const photoToRemove = favoritePhotos.find(photo => photo.public_url === photoUrl);
        if (photoToRemove) {
          photosToRemove.push(photoToRemove.id);
        }
      }
      
      // 从所有照片中找到要删除的照片ID
      if (photosToRemove.length === 0) {
        for (const photoUrl of selectedPhotos) {
          const photoToRemove = allPhotos.find(photo => photo.public_url === photoUrl);
          if (photoToRemove) {
            photosToRemove.push(photoToRemove.id);
          }
        }
      }
      
      // 从 favorites 表中删除记录
      for (const photoId of photosToRemove) {
        await toggleFavorite(photoId, false);
      }
      
      // 重新加载收藏照片
      await loadFavoritePhotos();
      
      // 过滤出需要保留的照片
      const remainingPhotos = images.filter(url => !selectedPhotos.includes(url));
      setImages(remainingPhotos);
      
      // 重置当前索引，确保不超过数组范围
      if (currentIndex >= remainingPhotos.length) {
        setCurrentIndex(Math.max(0, remainingPhotos.length - 1));
      }
      
      // 清空选中列表并退出多选模式
      setSelectedPhotos([]);
      setMultiSelectMode(false);
    } catch (error) {
      console.error('删除照片时出错:', error);
      alert('删除照片失败，请重试');
    }
  };

  // 从轮播图中移除照片
  const handleRemovePhoto = async (photoUrl) => {
    try {
      // 找到要删除的照片ID
      let photoId = null;
      
      // 先从收藏照片中查找
      const photoToRemove = favoritePhotos.find(photo => photo.public_url === photoUrl);
      if (photoToRemove) {
        photoId = photoToRemove.id;
      } else {
        // 如果没找到，从所有照片中查找
        const allPhotoToRemove = allPhotos.find(photo => photo.public_url === photoUrl);
        if (allPhotoToRemove) {
          photoId = allPhotoToRemove.id;
        }
      }
      
      // 如果找到了照片ID，从 favorites 表中删除
      if (photoId) {
        await toggleFavorite(photoId, false);
        // 重新加载收藏照片
        await loadFavoritePhotos();
      }
      
      // 从轮播图中移除照片
      setImages(prev => prev.filter(url => url !== photoUrl));
    } catch (error) {
      console.error('删除照片时出错:', error);
      // 即使出错也从轮播图中移除
      setImages(prev => prev.filter(url => url !== photoUrl));
    }
  };

  // 切换照片收藏状态
  const handleToggleFavorite = async (photoId, isFavorite) => {
    try {
      await toggleFavorite(photoId, isFavorite);
      // 刷新收藏照片列表
      loadFavoritePhotos();
    } catch (error) {
      console.error('Error toggling favorite status:', error);
    }
  };

  // 加载所有照片
  const [allPhotos, setAllPhotos] = useState([]);
  const [loadingAllPhotos, setLoadingAllPhotos] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [syncingFavorites, setSyncingFavorites] = useState(false);

  const loadAllPhotos = useCallback(async () => {
    try {
      setLoadingAllPhotos(true);
      const { data, error } = await getAllPhotos();
      if (error) {
        console.error('Error loading all photos:', error);
        return;
      }
      setAllPhotos(data || []);
    } catch (error) {
      console.error('Error loading all photos:', error);
    } finally {
      setLoadingAllPhotos(false);
    }
  }, []);
  
  // 同步收藏状态到数据库
  const syncFavoritesToDatabase = useCallback(async () => {
    try {
      setSyncingFavorites(true);
      
      // 获取本地收藏照片列表
      const { data: favoritePhotosData } = await getFavoritePhotos();
      const favoriteIds = favoritePhotosData.map(photo => photo.id);
      
      // 获取所有照片
      const { data: allPhotosData } = await getAllPhotos();
      
      if (!allPhotosData) {
        console.error('Failed to load photos for syncing');
        return;
      }
      
      // 找出所有未同步的照片（有is_favorite标记但不在收藏列表中）
      const photosToSync = allPhotosData.filter(photo => 
        photo.is_favorite && !favoriteIds.includes(photo.id)
      );
      
      if (photosToSync.length === 0) {
        alert('所有照片已同步，无需操作');
        return;
      }
      
      // 同步每一张照片
      const syncPromises = photosToSync.map(photo => 
        toggleFavorite(photo.id, true)
      );
      
      await Promise.all(syncPromises);
      
      // 重新加载数据
      await loadFavoritePhotos();
      await loadAllPhotos();
      
      alert(`成功同步 ${photosToSync.length} 张照片到收藏列表！`);
    } catch (error) {
      console.error('Error syncing favorites:', error);
      alert('同步收藏失败，请重试');
    } finally {
      setSyncingFavorites(false);
    }
  }, [loadFavoritePhotos, loadAllPhotos]);

  // 打开照片选择模态框
  const showPhotoSelector = () => {
    loadFavoritePhotos(); // 刷新收藏照片列表
    setIsModalVisible(true);
  };

  // 加载图片并获取尺寸信息
  useEffect(() => {
    let mounted = true;

    const loadImages = async () => {
      try {
        const dimensions = [];
        const imagePromises = images.map((src, index) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              if (mounted) {
                // 保存图片尺寸信息
                dimensions[index] = {
                  width: img.width,
                  height: img.height,
                  aspectRatio: img.width / img.height
                };
                
                // 当所有图片都加载完成后，更新尺寸状态
                if (dimensions.filter(Boolean).length === images.length) {
                  setImageDimensions(dimensions);
                  updateCarouselHeight(dimensions, currentIndex);
                }
              }
              resolve(src);
            };
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
          });
        });

        const results = await Promise.allSettled(imagePromises);
        const failedImages = results.filter(r => r.status === 'rejected');
        
        if (failedImages.length > 0) {
          console.warn('Some images failed to load:', 
            failedImages.map(f => f.reason.message));
        }

        if (mounted) {
          setIsLoaded(true);
          startAutoPlay();
        }
      } catch (error) {
        console.error('Failed to load images:', error);
        if (mounted) setIsLoaded(true); // 即使出错也显示轮播图
      }
    };

    loadImages();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [images, startAutoPlay, currentIndex]);
  
  // 根据当前显示的图片更新轮播图高度
  const updateCarouselHeight = useCallback((dimensions, index) => {
    if (!dimensions || !dimensions[index]) return;
    
    const containerWidth = carouselRef.current ? carouselRef.current.offsetWidth : window.innerWidth;
    const imageAspectRatio = dimensions[index].aspectRatio;
    
    // 根据容器宽度和图片宽高比计算合适的高度
    let height;
    if (imageAspectRatio >= 1) {
      // 横向图片，高度为宽度除以宽高比，但最小为400px
      height = Math.max(containerWidth / imageAspectRatio, 400);
    } else {
      // 纵向图片，高度为宽度除以宽高比，但最大为容器宽度的1.2倍
      height = Math.min(containerWidth / imageAspectRatio, containerWidth * 1.2);
    }
    
    setCarouselHeight(`${height}px`);
  }, []);
  
  // 当图片索引变化时更新高度
  useEffect(() => {
    if (imageDimensions.length > 0) {
      updateCarouselHeight(imageDimensions, currentIndex);
    }
  }, [currentIndex, imageDimensions, updateCarouselHeight]);
  
  // 窗口大小变化时重新计算高度
  useEffect(() => {
    const handleResize = () => {
      if (imageDimensions.length > 0) {
        updateCarouselHeight(imageDimensions, currentIndex);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageDimensions, currentIndex, updateCarouselHeight]);

  if (!isLoaded || images.length === 0) {
    return null;
  }

  return (
    <div className="carousel-container">
      <div 
        ref={carouselRef}
        className="carousel"
        style={{ height: carouselHeight }}
        onMouseEnter={() => {
          if (timerRef.current) clearInterval(timerRef.current);
        }}
        onMouseLeave={() => {
          startAutoPlay();
        }}
      >
        <button 
          className="carousel-arrow prev" 
          onClick={handlePrev}
        >
          ‹
        </button>
        <button 
          className="carousel-arrow next" 
          onClick={handleNext}
        >
          ›
        </button>
        {images.map((image, index) => {
          const dimension = imageDimensions[index];
          const isLandscape = dimension ? dimension.aspectRatio >= 1 : true;
          
          return (
            <div
              key={index}
              className={`carousel-slide ${index === currentIndex ? 'active' : ''} ${isLandscape ? 'landscape' : 'portrait'}`}
              style={{
                backgroundImage: `url(${image})`,
                zIndex: index === currentIndex ? 1 : 0
              }}
            />
          );
        })}
        {images.length > 1 && (
          <div className="carousel-indicators">
            {images.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  setCurrentIndex(index);
                  startAutoPlay();
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* 照片选择按钮 */}
      <div className="carousel-controls">
        <button 
          onClick={showPhotoSelector}
          className="photo-selector-button"
        >
          选择照片
        </button>
      </div>
      
      {/* 照片选择模态框 */}
      {isModalVisible && (
        <div className="photo-modal-overlay" onClick={() => setIsModalVisible(false)}>
          <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-header">
              <div className="header-left">
                <h3>选择照片</h3>
              </div>
              <div className="photo-modal-tabs">
                <button 
                  className={`tab-button ${!showAllPhotos ? 'active' : ''}`}
                  onClick={() => setShowAllPhotos(false)}
                >
                  收藏照片
                </button>
                <button 
                  className={`tab-button ${showAllPhotos ? 'active' : ''}`}
                  onClick={() => {
                    setShowAllPhotos(true);
                    loadAllPhotos();
                  }}
                >
                  所有照片
                </button>
              </div>
              <div className="photo-modal-actions">
                {multiSelectMode && selectedPhotos.length > 0 && (
                  <button 
                    className="add-selected-button"
                    onClick={addSelectedPhotosToCarousel}
                  >
                    添加 ({selectedPhotos.length})
                  </button>
                )}
                <button 
                  className={`multi-select-button ${multiSelectMode ? 'active' : ''}`}
                  onClick={toggleMultiSelectMode}
                  title={multiSelectMode ? '取消多选' : '多选模式'}
                >
                  {multiSelectMode ? '取消多选' : '多选'}
                </button>
                {multiSelectMode && selectedPhotos.length > 0 && (
                  <button 
                    className="remove-selected-button"
                    onClick={removeSelectedPhotosFromCarousel}
                  >
                    删除 ({selectedPhotos.length})
                  </button>
                )}
                {!multiSelectMode && images.length > 0 && (
                  <button 
                    className="batch-remove-button"
                    onClick={() => setMultiSelectMode(true)}
                    title="批量删除照片"
                  >
                    批量删除
                  </button>
                )}
                <button className="photo-modal-close" onClick={() => setIsModalVisible(false)}>×</button>
              </div>
            </div>
            <div className="photo-selector-container">
              {showAllPhotos ? (
                // 显示所有照片
                loadingAllPhotos ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>加载照片中...</p>
                  </div>
                ) : allPhotos.length === 0 ? (
                  <div className="empty-photos">
                    <p>暂无照片，请先上传照片</p>
                  </div>
                ) : (
                  <div className="photo-grid">
                    {allPhotos.map(photo => (
                      <div 
                        key={photo.id} 
                        className={`photo-item ${images.includes(photo.public_url) ? 'selected' : ''}`}
                      >
                        <div 
                          className="photo-thumbnail" 
                          style={{ backgroundImage: `url(${photo.public_url})` }}
                          onClick={() => handleSelectPhoto(photo.public_url, photo.id)}
                        />
                        <div className="photo-info">
                          <span className="photo-name">{photo.name || '未命名照片'}</span>
                          <div className="photo-actions">
                            <button 
                              className={`favorite-button ${photo.is_favorite ? 'active' : ''}`}
                              onClick={() => handleToggleFavorite(photo.id, !photo.is_favorite)}
                              title={photo.is_favorite ? '取消收藏' : '收藏'}
                            >
                              {photo.is_favorite ? '★' : '☆'}
                            </button>
                            {images.includes(photo.public_url) && (
                              <button 
                                className="remove-button"
                                onClick={() => handleRemovePhoto(photo.public_url)}
                                title="从轮播图移除"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                // 显示收藏照片
                isLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>加载照片中...</p>
                  </div>
                ) : favoritePhotos.length === 0 ? (
                  <div className="empty-photos">
                    <p>暂无收藏照片，请先在照片库中收藏照片</p>
                  </div>
                ) : (
                  <div className="photo-grid">
                    {favoritePhotos.map(photo => (
                      <div 
                        key={photo.id} 
                        className={`photo-item ${images.includes(photo.public_url) ? 'selected' : ''}`}
                      >
                        <div 
                          className="photo-thumbnail" 
                          style={{ backgroundImage: `url(${photo.public_url})` }}
                          onClick={() => handleSelectPhoto(photo.public_url, photo.id)}
                        />
                        <div className="photo-info">
                          <span className="photo-name">{photo.name || '未命名照片'}</span>
                          <div className="photo-actions">
                            <button 
                              className="favorite-button active"
                              onClick={() => handleToggleFavorite(photo.id, false)}
                              title="取消收藏"
                            >
                              ★
                            </button>
                            {images.includes(photo.public_url) && (
                              <button 
                                className="remove-button"
                                onClick={() => handleRemovePhoto(photo.public_url)}
                                title="从轮播图移除"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Carousel;
