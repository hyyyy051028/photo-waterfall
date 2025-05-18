import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 表的定义
export const PHOTOS_TABLE = 'photos';
export const FAVORITES_TABLE = 'favorites';

// 上传照片
export const uploadPhoto = async (file, metadata) => {
  try {
    if (!metadata.token) {
      throw new Error('缺少认证信息');
    }

    console.log('开始上传文件:', file.name);
    
    // 验证文件类型和大小
    if (!file.type.startsWith('image/')) {
      throw new Error('只能上传图片文件');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      throw new Error('文件大小不能超过 10MB');
    }

    // 生成唯一的文件名
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const sanitizedName = `${timestamp}.${fileExt}`;
    console.log('生成的文件名:', sanitizedName);
    
    // 上传到存储桶
    console.log('开始上传文件到存储桶...');
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('images')
      .upload(sanitizedName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (storageError) {
      console.error('上传到存储桶失败:', storageError);
      throw storageError;
    }

    console.log('文件上传成功，存储数据:', storageData);

    // 获取公开URL
    console.log('获取公开URL...');
    const { data: publicUrlData } = supabase
      .storage
      .from('images')
      .getPublicUrl(sanitizedName);

    if (!publicUrlData?.publicUrl) {
      throw new Error('无法获取公开URL');
    }

    console.log('获取到公开URL:', publicUrlData.publicUrl);

    // 保存到数据库
    console.log('保存记录到数据库...');
    const { data, error } = await supabase
      .from(PHOTOS_TABLE)
      .insert({
        name: file.name, // 添加必填的name字段
        file_name: sanitizedName,
        original_name: file.name,
        public_url: publicUrlData.publicUrl,
        upload_date: new Date().toISOString(),
        size: file.size,
        type: file.type
      })
      .select()
      .single();

    if (error) {
      console.error('保存到数据库失败:', error);
      throw error;
    }

    console.log('文件上传完成:', data);
    return data;
  } catch (error) {
    console.error('上传过程中出错:', error);
    throw error;
  }
};

// 获取所有照片
export const getAllPhotos = async () => {
  try {
    const { data, error } = await supabase
      .from(PHOTOS_TABLE)
      .select('*')
      .order('upload_date', { ascending: false });

    if (error) throw error;
    
    // 确保返回的是数组
    const photos = Array.isArray(data) ? data : [];
    return { 
      data: photos,
      error: null 
    };
  } catch (error) {
    console.error('Error getting photos:', error);
    return {
      data: [],
      error: error.message || '获取照片失败'
    };
  }
};

// 删除照片
export const deletePhoto = async (id) => {
  try {
    // 先获取照片信息
    const { data: photoData, error: photoError } = await supabase
      .from(PHOTOS_TABLE)
      .select('file_name')
      .eq('id', id)
      .single();

    if (photoError) throw photoError;

    // 删除存储桶中的文件
    const { error: storageError } = await supabase
      .storage
      .from('images')
      .remove([photoData.file_name]);

    if (storageError) throw storageError;

    // 删除数据库记录
    const { error: dbError } = await supabase
      .from(PHOTOS_TABLE)
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    return true;
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
};

// 更新照片信息
export const updatePhoto = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from(PHOTOS_TABLE)
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating photo:', error);
    throw error;
  }
};

// 切换照片收藏状态 - 使用数据库存储
export const toggleFavorite = async (id, isFavorite) => {
  try {
    console.log(`尝试将照片 ${id} 的收藏状态设置为 ${isFavorite}`);
    
    // 先获取照片信息，确保它存在
    const { data: photoData, error: photoError } = await supabase
      .from(PHOTOS_TABLE)
      .select('*')
      .eq('id', id)
      .single();
      
    if (photoError) {
      console.error('获取照片信息失败:', photoError);
      throw photoError;
    }
    
    if (isFavorite) {
      // 添加到收藏表
      const { data: favoriteData, error: favoriteError } = await supabase
        .from(FAVORITES_TABLE)
        .insert({
          photo_id: id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (favoriteError) {
        // 如果是唯一约束错误，说明已经收藏了，可以忽略
        if (favoriteError.code !== '23505') { // PostgreSQL 唯一约束违反的错误代码
          console.error('添加收藏失败:', favoriteError);
          throw favoriteError;
        }
      }
    } else {
      // 从收藏表中移除
      const { error: deleteError } = await supabase
        .from(FAVORITES_TABLE)
        .delete()
        .eq('photo_id', id);
        
      if (deleteError) {
        console.error('移除收藏失败:', deleteError);
        throw deleteError;
      }
    }
    
    // 返回更新后的照片数据，并包含收藏状态
    return { ...photoData, is_favorite: isFavorite };
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    throw error;
  }
};

// 获取所有收藏的照片 - 使用数据库存储
export const getFavoritePhotos = async () => {
  try {
    // 使用连接查询获取所有收藏的照片
    const { data: photosData, error: photosError } = await supabase
      .from(FAVORITES_TABLE)
      .select(`
        photo_id,
        photos:${PHOTOS_TABLE}(*)
      `)
      .order('created_at', { ascending: false });
      
    if (photosError) throw photosError;
    
    // 处理查询结果，提取照片信息并添加 is_favorite 标记
    const photos = (photosData || []).map(item => ({
      ...item.photos,
      is_favorite: true
    }));
    
    return { 
      data: photos,
      error: null 
    };
  } catch (error) {
    console.error('Error getting favorite photos:', error);
    return {
      data: [],
      error: error.message || '获取收藏照片失败'
    };
  }
};

// 获取照片的收藏状态
export const getPhotoWithFavoriteStatus = async (id) => {
  try {
    // 获取照片信息
    const { data: photoData, error: photoError } = await supabase
      .from(PHOTOS_TABLE)
      .select('*')
      .eq('id', id)
      .single();
      
    if (photoError) throw photoError;
    
    // 检查收藏状态
    const isFavorite = await checkIsFavorite(id);
    
    return {
      ...photoData,
      is_favorite: isFavorite
    };
  } catch (error) {
    console.error('Error getting photo with favorite status:', error);
    throw error;
  }
};

// 检查照片是否被收藏
export const checkIsFavorite = async (id) => {
  try {
    const { data, error } = await supabase
      .from(FAVORITES_TABLE)
      .select('photo_id')
      .eq('photo_id', id)
      .single();
      
    if (error) {
      // 如果是找不到记录的错误，说明没有收藏
      if (error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
};

// 获取所有照片并包含收藏状态
export const getAllPhotosWithFavoriteStatus = async () => {
  try {
    // 获取所有照片
    const { data: photosData, error: photosError } = await supabase
      .from(PHOTOS_TABLE)
      .select('*')
      .order('upload_date', { ascending: false });
      
    if (photosError) throw photosError;
    
    // 获取所有收藏的照片ID
    const { data: favoritesData, error: favoritesError } = await supabase
      .from(FAVORITES_TABLE)
      .select('photo_id');
      
    if (favoritesError) throw favoritesError;
    
    // 提取收藏的照片ID
    const favoriteIds = (favoritesData || []).map(fav => fav.photo_id);
    
    // 为每个照片添加收藏状态
    const photosWithFavoriteStatus = (photosData || []).map(photo => ({
      ...photo,
      is_favorite: favoriteIds.includes(photo.id)
    }));
    
    return photosWithFavoriteStatus;
  } catch (error) {
    console.error('Error getting photos with favorite status:', error);
    throw error;
  }
};
