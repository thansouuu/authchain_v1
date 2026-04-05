const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary'); // File config bạn vừa tạo

// 1. Cấu hình kho lưu trữ trên Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'authchain_uploads', // Tên thư mục sẽ tự động tạo trên tài khoản Cloudinary của bạn
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // Chỉ cho phép các định dạng ảnh này
    // Bạn có thể thêm tính năng tự động nén/resize ảnh ở đây để web load nhanh hơn:
    // transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  },
});

// 2. Khởi tạo Multer với giới hạn dung lượng (Bảo vệ server khỏi file rác quá lớn)
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // Giới hạn mỗi ảnh tối đa 5MB
  }
});

// Xuất ra biến upload để các file Routes có thể sử dụng linh hoạt
module.exports = upload;