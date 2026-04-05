const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../middlewares/uploadMiddleware'); // Dùng lại trạm kiểm soát Cloudinary

// 1. Route Đăng nhập / Xác thực ví (Bất kỳ ai connect ví cũng gọi cái này đầu tiên)
router.post('/auth', userController.authenticateUser);

// 2. Route Admin lấy danh sách các user đang xin quyền
router.get('/role-requests', userController.getPendingRequests);

// 3. Route Nộp đơn xin quyền (Có up ảnh, giới hạn 5 ảnh giống hệt Product)
// Field name gửi từ form-data lên phải là 'proofImages'
router.post('/:walletAddress/request-role', upload.array('proofImages', 5), userController.submitRoleRequest);

// 4. Route Admin duyệt/từ chối đơn
router.patch('/:walletAddress/process-request', userController.processRoleRequest);

module.exports = router;