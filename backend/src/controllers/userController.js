const User = require('../models/User');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const nacl = require('tweetnacl');
const { PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
exports.authenticateUser = async (req, res) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ success: false, message: 'Thiếu địa chỉ ví!' });
        }

        // Tìm user, nếu chưa có thì tạo mới với role mặc định là 'client'
        let user = await User.findOne({ walletAddress });
        console.log("Mongoose đang kết nối đến DB:", mongoose.connection.name);
        if (!user) {
            user = new User({ walletAddress });
            console.log("Đang chờ save account !!!");
            await user.save();
            console.log("=> Đã tạo user mới thành công:", walletAddress);
        }

        res.status(200).json({
            success: true,
            message: 'Xác thực thành công',
            data: user
        });
    } catch (error) {
        console.error('Lỗi xác thực ví:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// [POST] Nộp đơn xin cấp quyền (Kèm upload tối đa 5 ảnh minh chứng)
exports.submitRoleRequest = async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const { requestedRole, businessName } = req.body;

        // Lấy link ảnh từ Cloudinary (do uploadMiddleware xử lý)
        let proofImageUrls = [];
        if (req.files && req.files.length > 0) {
            proofImageUrls = req.files.map(file => file.path);
        }

        // Cập nhật thông tin request vào User
        const updatedUser = await User.findOneAndUpdate(
            { walletAddress },
            {
                roleRequest: {
                    requestedRole,
                    businessName,
                    proofImages: proofImageUrls,
                    status: 'pending' // Chuyển trạng thái sang chờ duyệt
                }
            },
            { new: true } // Trả về data mới sau khi update
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy user này' });
        }

        res.status(200).json({
            success: true,
            message: 'Đã gửi yêu cầu cấp quyền thành công. Vui lòng chờ Admin duyệt!',
            data: updatedUser
        });
    } catch (error) {
        console.error('Lỗi nộp đơn xin quyền:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// [GET] Lấy danh sách các đơn đang chờ duyệt (Dành cho Admin Dashboard)
exports.getPendingRequests = async (req, res) => {
    try {
        const pendingUsers = await User.find({ 'roleRequest.status': 'pending' });
        
        res.status(200).json({
            success: true,
            count: pendingUsers.length,
            data: pendingUsers
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách chờ duyệt:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

exports.processRoleRequest = async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const { action, adminAddress, signature } = req.body; // 'approve' hoặc 'reject'

        // --- 1. BẢO MẬT: KIỂM TRA CHỮ KÝ WEB3 ---
        const ADMIN_WALLET = process.env.ADMIN_WALLET || "GH85GXm9GTopqbAwTXyhuQgQzE2pS2JAwsyaqydfRfhn";
        
        if (!adminAddress || adminAddress !== ADMIN_WALLET) {
            return res.status(403).json({ success: false, message: 'Từ chối truy cập: Bạn không phải Admin!' });
        }

        if (!signature) {
             return res.status(400).json({ success: false, message: 'Yêu cầu chữ ký xác thực!' });
        }

        // Xác minh chữ ký
        try {
            const message = new TextEncoder().encode(`admin_action_${action}_${walletAddress}`);
            const signatureUint8 = bs58.decode(signature);
            const adminPubkeyUint8 = new PublicKey(adminAddress).toBytes();

            const isValid = nacl.sign.detached.verify(message, signatureUint8, adminPubkeyUint8);
            if (!isValid) {
                return res.status(401).json({ success: false, message: "Chữ ký không hợp lệ hoặc bị giả mạo!" });
            }
        } catch (signError) {
             console.error("Lỗi giải mã chữ ký:", signError);
             return res.status(400).json({ success: false, message: "Định dạng chữ ký sai!" });
        }
        // --- KẾT THÚC BẢO MẬT ---

        const user = await User.findOne({ walletAddress });
        if (!user || user.roleRequest.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Đơn không hợp lệ hoặc không tồn tại' });
        }

        // 👉 LOGIC KIỂM TRA TRÁCH NHIỆM NẾU ADMIN DUYỆT (APPROVE)
        if (action === 'approve') {
            const currentRole = user.currentRole;

            // 1. Kiểm tra Driver
            if (currentRole === 'driver') {
                const holdingProducts = await Product.countDocuments({ 
                    currentCustodian: walletAddress, 
                    status: 'in-transit' 
                });
                if (holdingProducts > 0) {
                    return res.status(400).json({ success: false, message: `Tài xế này vẫn đang giữ ${holdingProducts} kiện hàng chưa giao!` });
                }
            }

            // 2. Kiểm tra Nhà sản xuất (NSX)
            if (currentRole === 'manufacturer') {
                const activeProducts = await Product.countDocuments({
                    manufacturerWallet: walletAddress,
                    status: { $in: ['purchased', 'in-transit', 'disputed'] }
                });
                if (activeProducts > 0) {
                    return res.status(400).json({ success: false, message: `NSX này còn ${activeProducts} đơn hàng đang lưu thông hoặc tranh chấp!` });
                }
            }

            // 3. Kiểm tra Brand
            if (currentRole === 'brand') {
                const disputedProducts = await Product.countDocuments({
                    brandWallet: walletAddress,
                    status: 'disputed'
                });
                if (disputedProducts > 0) {
                    return res.status(400).json({ success: false, message: `Brand này chưa giải quyết xong ${disputedProducts} tranh chấp!` });
                }
            }

            // 4. Kiểm tra Client
            if (currentRole === 'client') {
                const activeOrders = await Product.countDocuments({
                    owner: walletAddress,
                    status: { $in: ['purchased', 'in-transit', 'disputed'] }
                });
                if (activeOrders > 0) {
                    return res.status(400).json({ success: false, message: `Client này còn ${activeOrders} đơn hàng chưa hoàn tất nhận hàng/tranh chấp!` });
                }
            }

            // Vượt qua mọi bài test -> Cho phép lên Role
            user.currentRole = user.roleRequest.requestedRole; 
            user.roleRequest.status = 'approved';
            
        } else if (action === 'reject') {
            user.roleRequest.status = 'rejected';
        } else {
            return res.status(400).json({ success: false, message: 'Hành động không hợp lệ' });
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: `Đã ${action === 'approve' ? 'phê duyệt' : 'từ chối'} quyền thành công.`,
            data: user
        });
    } catch (error) {
        console.error('Lỗi xử lý đơn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xử lý đơn.' });
    }
};