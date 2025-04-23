import { supabase } from '../supabase'

/**
 * 上传照片到 Supabase Storage
 * @param {File} file - 要上传的文件
 * @param {Object} metadata - 文件元数据
 * @param {Function} onProgress - 上传进度回调函数
 * @returns {Promise<string>} - 返回上传后的文件URL
 */
export const uploadPhoto = async (file, metadata, onProgress) => {
  try {
    // 生成唯一的文件名
    const timestamp = new Date().getTime()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomString}.${extension}`

    // 创建上传任务
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
        duplex: 'half',
      })

    if (error) {
      throw error
    }

    // 获取公共访问URL
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    // 保存照片元数据到数据库
    const { error: dbError } = await supabase
      .from('photos')
      .insert([{
        file_name: fileName,
        public_url: publicUrl,
        metadata: metadata,
        created_at: new Date().toISOString()
      }])

    if (dbError) {
      throw dbError
    }

    return publicUrl
  } catch (error) {
    console.error('Error uploading photo:', error)
    throw new Error('上传照片失败，请稍后重试')
  }
}

/**
 * 从 Supabase Storage 获取照片列表
 * @returns {Promise<Array>} - 返回照片列表
 */
export const getPhotos = async () => {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching photos:', error)
    throw new Error('获取照片列表失败，请稍后重试')
  }
}

/**
 * 删除照片
 * @param {string} fileName - 要删除的文件名
 * @param {string} id - 数据库记录ID
 * @returns {Promise<void>}
 */
export const deletePhoto = async (fileName, id) => {
  try {
    // 删除存储中的文件
    const { error: storageError } = await supabase.storage
      .from('photos')
      .remove([fileName])

    if (storageError) {
      throw storageError
    }

    // 删除数据库记录
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .match({ id })

    if (dbError) {
      throw dbError
    }
  } catch (error) {
    console.error('Error deleting photo:', error)
    throw new Error('删除照片失败，请稍后重试')
  }
}
