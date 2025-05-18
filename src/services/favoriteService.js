// 收藏服务 - 使用 localStorage 存储收藏状态
const FAVORITES_KEY = 'photo_favorites';

// 获取所有收藏的照片ID
export const getFavoriteIds = () => {
  try {
    const favoritesJson = localStorage.getItem(FAVORITES_KEY);
    return favoritesJson ? JSON.parse(favoritesJson) : [];
  } catch (error) {
    console.error('Error getting favorites from localStorage:', error);
    return [];
  }
};

// 添加收藏
export const addFavorite = (photoId) => {
  try {
    const favorites = getFavoriteIds();
    if (!favorites.includes(photoId)) {
      favorites.push(photoId);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
    return true;
  } catch (error) {
    console.error('Error adding favorite to localStorage:', error);
    return false;
  }
};

// 移除收藏
export const removeFavorite = (photoId) => {
  try {
    const favorites = getFavoriteIds();
    const newFavorites = favorites.filter(id => id !== photoId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    return true;
  } catch (error) {
    console.error('Error removing favorite from localStorage:', error);
    return false;
  }
};

// 检查是否已收藏
export const isFavorite = (photoId) => {
  const favorites = getFavoriteIds();
  return favorites.includes(photoId);
};

// 切换收藏状态
export const toggleFavorite = (photoId) => {
  if (isFavorite(photoId)) {
    return removeFavorite(photoId);
  } else {
    return addFavorite(photoId);
  }
};
