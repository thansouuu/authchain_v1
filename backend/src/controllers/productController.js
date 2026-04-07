const Product = require('../models/Product');
const User = require('../models/User');
// [POST] Tạo sản phẩm mới (Dành cho NSX)
exports.createProduct = async (req, res) => {
    try {
        const { productId, name, description, priceSol, manufacturerWallet,brandWallet, txHash } = req.body;

        // Kiểm tra xem ID đã tồn tại chưa (tránh trùng lặp do spam click)
        const existingProduct = await Product.findOne({ productId });
        if (existingProduct) {
            return res.status(400).json({ 
                success: false,
                message: 'Mã sản phẩm này đã tồn tại!' 
            });
        }

        // Multer Cloudinary sẽ tự động upload và trả về mảng file trong req.files
        // Ta lặp qua để lấy đường link (path) của từng ảnh
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(file => file.path);
        }

        // Tạo document mới lưu vào MongoDB
        const newProduct = new Product({
            productId,
            name,
            description,
            priceSol,
            manufacturerWallet,
            images: imageUrls,
            currentCustodian: req.body.manufacturerWallet,
            brandWallet:brandWallet,
            history: [{
                status: 'pending',
                title: 'Batch Initialized',
                desc: `Sản phẩm được khởi tạo bởi nhà sản xuất. ${req.body.manufacturerWallet}`,
                txHash: txHash,
            }]
        });

        await newProduct.save();

        res.status(201).json({
            success: true,
            message: 'Tạo sản phẩm thành công!',
            data: newProduct
        });
    } catch (error) {
        console.error('Lỗi khi tạo sản phẩm:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// [GET] Lấy danh sách sản phẩm (Dành cho Trang Home)
// Hỗ trợ query: /api/products?status=approved hoặc /api/products?status=pending
exports.getProducts = async (req, res) => {
    try {
        const { status, manufacturerWallet, owner, currentCustodian, brandWallet, productId } = req.query;
        let query = {};
        
        if (status) query.status = status;
        if (manufacturerWallet) query.manufacturerWallet = manufacturerWallet;
        if (owner) query.owner = owner; 
        if (currentCustodian) query.currentCustodian = currentCustodian;
        if (brandWallet) query.brandWallet = brandWallet;
        if (productId) query.productId = productId;

        // 👉 LOGIC BẢO VỆ CHO HOMEPAGE: LỌC ROLE NSX
        // Nhận diện Homepage: Thường chỉ truyền mỗi status='approved' hoặc 'pending'
        if (status && !manufacturerWallet && !owner && !currentCustodian && !brandWallet && !productId) {
            
            // 1. Tìm tất cả các ví đang có role là 'manufacturer'
            const activeManufacturers = await User.find({ currentRole: 'manufacturer' }).select('walletAddress');
            const validWallets = activeManufacturers.map(u => u.walletAddress);

            // 2. Thêm điều kiện vào query: manufacturerWallet của SP phải nằm trong danh sách ví hợp lệ
            query.manufacturerWallet = { $in: validWallets };
        }

        // 3. Truy vấn Database với query đã được chốt chặn
        const products = await Product.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: 'Lấy sản phẩm thành công!',
            data: products
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách sản phẩm:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// [PATCH] Cập nhật trạng thái sản phẩm (Dành cho Brand khi duyệt hàng)
exports.updateProductStatus = async (req, res) => {
    try {
        const { productId } = req.params;
        const { status } = req.body; // 'approved' hoặc 'rejected'

        // 1. Khởi tạo nội dung hiển thị trên Timeline tùy theo trạng thái
        let historyTitle = '';
        let historyDesc = '';

        if (status === 'approved') {
            historyTitle = 'Approved';
            historyDesc = 'Brand verified authenticity';
        } else if (status === 'rejected') {
            historyTitle = 'Rejected';
            historyDesc = 'Brand rejected authenticity';
        } else {
            historyTitle = 'Status Updated';
            historyDesc = `Trạng thái được cập nhật thành: ${status}`;
        }

        // 2. Tạo record lịch sử mới
        const newHistoryEntry = {
            status: status,
            title: historyTitle,
            desc: historyDesc,
            date: new Date() // Ghi nhận thời gian ngay lúc duyệt
        };

        // 3. Update DB: Vừa đổi status hiện tại, vừa đẩy thêm lịch sử vào mảng
        const product = await Product.findOneAndUpdate(
            { productId }, 
            { 
                $set: { status: status }, 
                $push: { history: newHistoryEntry } // Lệnh $push cực kỳ quan trọng ở đây
            }, 
            { returnDocument: 'after' } // Trả về object sau khi đã update
        );

        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        res.status(200).json({
            success: true,
            message: `Đã cập nhật trạng thái thành ${status} và lưu lịch sử`,
            data: product
        });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

exports.confirmPurchase = async (req, res) => {
    try {
        const { productId, txHash, buyerWallet, newStatus, title, desc } = req.body;

        // 1. Kiểm tra đầu vào cơ bản
        if (!productId || !txHash) {
            return res.status(400).json({ message: "Thiếu productId hoặc txHash!" });
        }

        // 2. (Nâng cao) Xác thực giao dịch trên Blockchain để tránh gian lận
        // Bước này giúp đảm bảo txHash này là thật và đã thành công
        const transaction = await connection.getTransaction(txHash, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!transaction) {
            return res.status(400).json({ message: "Giao dịch không tồn tại trên Solana!" });
        }

        // 3. Tìm sản phẩm và cập nhật
        const product = await Product.findOne({ productId: productId });

        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm trong database!" });
        }

        // 4. Cấu trúc lại dữ liệu cập nhật
        // Mặc định nếu không truyền title/desc thì tự sinh dựa trên status
        const historyEntry = {
            status: newStatus || 'approved',
            title: title || `Cập nhật trạng thái: ${newStatus}`,
            desc: desc || `Giao dịch xác nhận trên chuỗi với mã: ${txHash}`,
        };

        // 5. Thực hiện Update
        const updatedProduct = await Product.findOneAndUpdate(
            { productId: productId },
            { 
                $set: { 
                    status: newStatus || 'approved',
                    owner: buyerWallet // Cập nhật chủ sở hữu mới
                },
                $push: { history: historyEntry } // Đẩy thêm vào mảng history
            },
            { returnDocument: 'after' } // Trả về object sau khi đã update
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật trạng thái và lịch sử thành công!",
            data: updatedProduct
        });

    } catch (error) {
        console.error("Lỗi Server:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Lỗi hệ thống khi cập nhật sản phẩm",
            error: error.message 
        });
    }
};
exports.transferProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { newCustodian, status, historyTitle, historyDesc, txHash } = req.body;

        const historyEntry = {
            status: status, // 'in-transit'
            title: historyTitle,
            desc: `${historyDesc}. (Mã TX: ${txHash})`,
        };

        const updatedProduct = await Product.findOneAndUpdate(
            { productId: productId },
            { 
                $set: { 
                    status: status,
                    currentCustodian: newCustodian // Cập nhật người giữ hàng hiện tại
                },
                $push: { history: historyEntry }
            },
            { returnDocument: 'after' }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Sản phẩm không tồn tại" });
        }

        res.status(200).json({ success: true, data: updatedProduct });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};