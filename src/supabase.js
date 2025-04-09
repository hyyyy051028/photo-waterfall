import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 照片表的定义
export const PHOTOS_TABLE = 'photos';

// 上传照片
export const uploadPhoto = async (file, metadata) => {
  try {
    console.log('开始上传文件:', file.name);
    
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
        upsert: true
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
        ...metadata,
        file_name: sanitizedName,
        original_name: file.name,
        public_url: publicUrlData.publicUrl,
        upload_date: new Date().toISOString()
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
    return data;
  } catch (error) {
    console.error('Error getting photos:', error);
    throw error;
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
      .from('photos')
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
