const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Định danh duy nhất bằng ví Phantom
  walletAddress: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  
  // Role hiện tại của User (Ai kết nối lần đầu cũng là Client)
  currentRole: { 
    type: String, 
    enum: ['client', 'manufacturer', 'brand', 'driver', 'admin'], 
    default: 'client' 
  },
  
  // Khu vực lưu trữ hồ sơ khi User nộp đơn xin lên Role (NSX, Brand)
  roleRequest: {
    requestedRole: { 
      type: String, 
      enum: ['client', 'manufacturer', 'brand', 'driver', null], 
      default: null 
    },
    status: { 
      type: String, 
      enum: ['none', 'pending', 'approved', 'rejected'], 
      default: 'none' 
    },
    businessName: { type: String },
    
    // Lưu link ảnh minh chứng (Giấy phép kinh doanh, CMND...)
    proofImages: {
      type: [String],
      validate: [arrayLimit, 'Tối đa 5 ảnh minh chứng']
    }
  }
}, { timestamps: true });

function arrayLimit(val) {
  return val.length <= 5;
}

module.exports = mongoose.model('User', userSchema);