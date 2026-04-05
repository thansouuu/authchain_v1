const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Mã ID độc nhất do Frontend tạo ra và gửi xuống, dùng chung cho cả Blockchain
  productId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  
  // Thông tin hiển thị cho Client
  name: { type: String, required: true },
  description: { type: String, required: true },
  priceSol: { type: Number, required: true },
  
  // Mảng chứa các URL ảnh trả về từ Cloudinary
  images: {
    type: [String],
    validate: [arrayLimit, 'Không được phép lưu quá 5 ảnh cho một sản phẩm']
  },
  
  // Thông tin NSX
  manufacturerWallet: { type: String, required: true },
  owner: { type: String },                           
  currentCustodian: { type: String },
  
  // Trạng thái kiểm duyệt của Brand
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'delivered', 'in-transit', 'disputed', 'purchased'], 
    default: 'pending',
    index: true
  },
  brandWallet: { 
    type: String, 
    required: true, 
  },
  history: [{
        status: String,
        title: String,
        desc: String,
        txHash: String, 
        date: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

// Hàm logic để Mongoose kiểm tra mảng ảnh trước khi lưu
function arrayLimit(val) {
  return val.length <= 5;
}

module.exports = mongoose.model('Product', productSchema);
