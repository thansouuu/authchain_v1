const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middlewares/uploadMiddleware'); // Trạm kiểm soát ảnh Cloudinary
const { checkRole } = require('../middlewares/authMiddleware');
router.get('/', productController.getProducts);
router.post('/', 
    checkRole(['manufacturer']), // Khóa cửa: Không phải NSX thì cút!
    upload.array('images', 5), 
    productController.createProduct
);
router.patch('/:productId/status', productController.updateProductStatus);
// router.patch('/:productId/transfer', productController.transferProduct);
// router.post('/confirm-purchase',productController.confirmPurchase);
module.exports = router;