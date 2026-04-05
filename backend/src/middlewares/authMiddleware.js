const User = require('../models/User');

exports.checkRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            // Trong Web3, thay vì dùng Token, ta thường gửi ví qua Headers
            // Header sẽ có dạng: x-wallet-address: "5A2b..."
            const walletAddress = req.headers['x-wallet-address'];

            if (!walletAddress) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Từ chối truy cập: Không tìm thấy địa chỉ ví!' 
                });
            }

            // Tìm user trong Database
            const user = await User.findOne({ walletAddress });

            // Kiểm tra xem User có tồn tại và Role có nằm trong danh sách cho phép không
            // allowedRoles là 1 mảng. VD: ['manufacturer', 'admin']
            if (!user || !allowedRoles.includes(user.currentRole)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Cấm truy cập! API này chỉ dành cho: ${allowedRoles.join(', ')}` 
                });
            }

            // Mọi thứ hợp lệ -> Mời đi tiếp vào Controller
            next();
        } catch (error) {
            console.error('Lỗi Middleware Check Role:', error);
            res.status(500).json({ success: false, message: 'Lỗi xác thực quyền truy cập' });
        }
    };
};