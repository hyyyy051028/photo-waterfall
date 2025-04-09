import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary
cloudinary.config({
  cloud_name: 'YOUR_CLOUD_NAME', // 替换为您的 cloud_name
  api_key: 'YOUR_API_KEY', // 替换为您的 api_key
  api_secret: 'YOUR_API_SECRET', // 替换为您的 api_secret
  secure: true,
});

// Cloudinary 配置
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// 上传图片到 Cloudinary
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('上传失败');
    }

    const data = await response.json();

    return {
      id: data.public_id,
      url: data.secure_url,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadDate: new Date().toISOString(),
      width: data.width,
      height: data.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// 从 Cloudinary 删除图片
export const deleteImage = async (publicId) => {
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/destroy`, // 替换为您的 cloud_name
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          api_key: 'YOUR_API_KEY', // 替换为您的 api_key
          signature: 'YOUR_SIGNATURE', // 需要从服务器端获取签名
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Delete failed');
    }

    return true;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};
