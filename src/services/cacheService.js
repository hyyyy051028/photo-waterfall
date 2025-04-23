// 图片缓存服务
const CACHE_PREFIX = 'photo_cache_';
const CACHE_METADATA_KEY = 'photo_cache_metadata';
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 1天
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_SINGLE_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// 缓存元数据结构
class CacheMetadata {
  constructor() {
    this.items = new Map();
    this.totalSize = 0;
  }

  add(key, size, timestamp) {
    this.items.set(key, { size, timestamp });
    this.totalSize += size;
  }

  remove(key) {
    const item = this.items.get(key);
    if (item) {
      this.totalSize -= item.size;
      this.items.delete(key);
    }
  }

  getOldestKey() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, data] of this.items) {
      if (data.timestamp < oldestTime) {
        oldestTime = data.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
}

// 加载缓存元数据
const loadMetadata = () => {
  try {
    const data = localStorage.getItem(CACHE_METADATA_KEY);
    if (!data) return new CacheMetadata();
    
    const parsed = JSON.parse(data);
    const metadata = new CacheMetadata();
    Object.entries(parsed.items).forEach(([key, value]) => {
      metadata.add(key, value.size, value.timestamp);
    });
    return metadata;
  } catch (e) {
    console.error('Failed to load cache metadata:', e);
    return new CacheMetadata();
  }
};

// 保存缓存元数据
const saveMetadata = (metadata) => {
  try {
    const data = {
      items: Object.fromEntries(metadata.items),
      totalSize: metadata.totalSize
    };
    localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save cache metadata:', e);
  }
};

// 清理所有缓存
const clearAllCache = () => {
  try {
    // 删除所有缓存的图片
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
    
    // 重置元数据
    localStorage.removeItem(CACHE_METADATA_KEY);
  } catch (e) {
    console.error('Failed to clear cache:', e);
  }
};

// 清理过期和超量的缓存
const cleanCache = (metadata) => {
  const now = Date.now();
  let cleaned = false;
  
  // 清理过期缓存
  for (const [key, data] of metadata.items) {
    if (now - data.timestamp > MAX_CACHE_AGE) {
      try {
        localStorage.removeItem(CACHE_PREFIX + key);
        metadata.remove(key);
        cleaned = true;
      } catch (e) {
        console.error('Failed to remove cached item:', key, e);
      }
    }
  }
  
  // 清理超量缓存
  while (metadata.totalSize > MAX_CACHE_SIZE * 0.8 && metadata.items.size > 0) {
    const oldestKey = metadata.getOldestKey();
    if (oldestKey) {
      try {
        localStorage.removeItem(CACHE_PREFIX + oldestKey);
        metadata.remove(oldestKey);
        cleaned = true;
      } catch (e) {
        console.error('Failed to remove oldest item:', oldestKey, e);
        break;
      }
    }
  }
  
  if (cleaned) {
    saveMetadata(metadata);
  }
};

// 缓存图片数据
export const cacheImage = async (url, imageData) => {
  try {
    // 检查单个图片大小
    if (imageData.length > MAX_SINGLE_IMAGE_SIZE) {
      console.warn('Image too large to cache:', url);
      return false;
    }

    const metadata = loadMetadata();
    const key = btoa(url);
    
    // 检查缓存空间
    if (metadata.totalSize + imageData.length > MAX_CACHE_SIZE) {
      // 清理旧缓存
      cleanCache(metadata);
      
      // 如果仍然超出限制，不缓存新图片
      if (metadata.totalSize + imageData.length > MAX_CACHE_SIZE) {
        console.warn('Cache full, skipping:', url);
        return false;
      }
    }
    
    // 存储图片数据
    try {
      localStorage.setItem(CACHE_PREFIX + key, imageData);
    } catch (storageError) {
      // 如果存储失败，清理全部缓存并重试
      console.warn('Storage failed, clearing all cache');
      clearAllCache();
      localStorage.setItem(CACHE_PREFIX + key, imageData);
    }
    
    // 更新元数据
    metadata.add(key, imageData.length, Date.now());
    saveMetadata(metadata);
    
    return true;
  } catch (e) {
    console.error('Failed to cache image:', e);
    return false;
  }
};

// 获取缓存的图片
export const getCachedImage = (url) => {
  try {
    const key = btoa(url);
    const imageData = localStorage.getItem(CACHE_PREFIX + key);
    
    if (imageData) {
      // 更新访问时间
      const metadata = loadMetadata();
      if (metadata.items.has(key)) {
        metadata.items.get(key).timestamp = Date.now();
        saveMetadata(metadata);
      }
    }
    
    return imageData;
  } catch (e) {
    console.error('Failed to get cached image:', e);
    return null;
  }
};

// 检查图片是否已缓存
export const isImageCached = (url) => {
  try {
    const key = btoa(url);
    return localStorage.getItem(CACHE_PREFIX + key) !== null;
  } catch (e) {
    console.error('Failed to check image cache:', e);
    return false;
  }
};

// 从URL加载图片并缓存
export const loadAndCacheImage = async (url) => {
  try {
    // 先检查缓存
    const cachedData = getCachedImage(url);
    if (cachedData) {
      return cachedData;
    }

    // 加载图片
    const response = await fetch(url);
    const blob = await response.blob();
    
    // 转换为 base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result;
        // 缓存图片
        await cacheImage(url, base64data);
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to load and cache image:', e);
    return null;
  }
};
