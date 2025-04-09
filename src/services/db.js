import { openDB } from 'idb';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';

const dbName = 'PhotoGalleryDB';
const storeName = 'photos';
const version = 2; // 增加版本号

// 使用 localStorage 作为临时存储，同时支持云存储
const CLOUD_STORAGE_URL = 'https://api.example.com/photos'; // 替换为您的云存储 API 地址

async function initDB() {
  return openDB(dbName, version, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (oldVersion < 1) {
        // 创建初始数据库
        const store = db.createObjectStore(storeName, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('uploadDate', 'uploadDate');
      }

      if (oldVersion < 2) {
        // 版本2：添加order索引
        const store = transaction.objectStore(storeName);
        if (!store.indexNames.contains('order')) {
          store.createIndex('order', 'order');
        }

        // 为现有照片添加order字段
        store.openCursor().then(function addOrder(cursor) {
          if (!cursor) return;

          const photo = cursor.value;
          if (!photo.order) {
            photo.order = cursor.key;
            cursor.update(photo);
          }

          return cursor.continue().then(addOrder);
        });
      }
    },
  });
}

// 从云存储获取照片
export const getAllPhotos = async () => {
  try {
    // 首先尝试从云存储获取
    const response = await fetch(CLOUD_STORAGE_URL);
    if (response.ok) {
      const photos = await response.json();
      // 同时更新本地存储
      localStorage.setItem('photos', JSON.stringify(photos));
      return photos;
    }

    // 如果云存储获取失败，尝试从本地存储获取
    const localPhotos = localStorage.getItem('photos');
    if (localPhotos) {
      return JSON.parse(localPhotos);
    }

    return [];
  } catch (error) {
    console.error('Error fetching photos:', error);
    // 如果出错，返回本地存储的照片
    const localPhotos = localStorage.getItem('photos');
    return localPhotos ? JSON.parse(localPhotos) : [];
  }
};

// 添加照片到云存储
export const addPhoto = async (photo) => {
  try {
    // 上传到云存储
    const response = await fetch(CLOUD_STORAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photo),
    });

    if (response.ok) {
      const savedPhoto = await response.json();
      // 更新本地存储
      const photos = await getAllPhotos();
      photos.unshift(savedPhoto);
      localStorage.setItem('photos', JSON.stringify(photos));
      return savedPhoto;
    }
    throw new Error('Failed to upload photo');
  } catch (error) {
    console.error('Error adding photo:', error);
    // 如果云存储失败，只保存到本地
    const photos = JSON.parse(localStorage.getItem('photos') || '[]');
    photos.unshift(photo);
    localStorage.setItem('photos', JSON.stringify(photos));
    return photo;
  }
};

export async function addPhotos(photos) {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);

  // 获取当前最大的order值
  const allPhotos = await store.getAll();
  const maxOrder = allPhotos.reduce(
    (max, p) => Math.max(max, p.order || 0),
    -1
  );

  // 批量添加照片，设置递增的order
  await Promise.all(
    photos.map(async (photo, index) => {
      await store.add({
        ...photo,
        order: maxOrder + index + 1,
      });
    })
  );

  await tx.done;
}

// 更新照片顺序
export const updatePhotoOrder = async (photoOrders) => {
  try {
    // 更新云存储中的顺序
    const response = await fetch(`${CLOUD_STORAGE_URL}/order`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photoOrders),
    });

    if (response.ok) {
      // 更新本地存储
      const photos = await getAllPhotos();
      const updatedPhotos = photoOrders
        .map((order) => {
          const photo = photos.find((p) => p.id === order.id);
          return { ...photo, order: order.order };
        })
        .sort((a, b) => a.order - b.order);
      localStorage.setItem('photos', JSON.stringify(updatedPhotos));
      return updatedPhotos;
    }
    throw new Error('Failed to update photo order');
  } catch (error) {
    console.error('Error updating photo order:', error);
    // 如果云存储失败，只更新本地存储
    const photos = JSON.parse(localStorage.getItem('photos') || '[]');
    const updatedPhotos = photoOrders
      .map((order) => {
        const photo = photos.find((p) => p.id === order.id);
        return { ...photo, order: order.order };
      })
      .sort((a, b) => a.order - b.order);
    localStorage.setItem('photos', JSON.stringify(updatedPhotos));
    return updatedPhotos;
  }
};

// 删除照片
export const deletePhoto = async (photoId) => {
  try {
    // 从云存储删除
    const response = await fetch(`${CLOUD_STORAGE_URL}/${photoId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      // 更新本地存储
      const photos = await getAllPhotos();
      const updatedPhotos = photos.filter((p) => p.id !== photoId);
      localStorage.setItem('photos', JSON.stringify(updatedPhotos));
      return true;
    }
    throw new Error('Failed to delete photo');
  } catch (error) {
    console.error('Error deleting photo:', error);
    // 如果云存储失败，只从本地存储删除
    const photos = JSON.parse(localStorage.getItem('photos') || '[]');
    const updatedPhotos = photos.filter((p) => p.id !== photoId);
    localStorage.setItem('photos', JSON.stringify(updatedPhotos));
    return true;
  }
};

export async function clearPhotos() {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await store.clear();
  await tx.done;
}

// 添加照片到数据库
export const addPhotoToFirestore = async (photoData) => {
  try {
    const docRef = await addDoc(collection(db, 'photos'), photoData);
    return {
      id: docRef.id,
      ...photoData,
    };
  } catch (error) {
    console.error('Error adding photo:', error);
    throw error;
  }
};

// 获取所有照片
export const getPhotos = async () => {
  try {
    const q = query(collection(db, 'photos'), orderBy('uploadDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting photos:', error);
    throw error;
  }
};
