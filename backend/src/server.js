const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db'); 
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes'); 
const { startListener } = require('../src/utils/blockchainListener.js'); // THÊM DÒNG NÀY 1: Import hàm nghe lén

// 1. Khởi tạo Express app
const app = express();

// 2. Middleware cơ bản
// CẤU HÌNH CORS MỚI: Chỉ định đích danh ai được phép vào nhà
const corsOptions = {
    origin: [
        'https://authchain-v1-gqdr.vercel.app', // Link thực tế trên Vercel của bạn (Không có dấu / ở cuối)
        'http://localhost:5173'                 // Cho phép Frontend chạy ở máy tính gọi lên
    ],
    credentials: true, // Bắt buộc phải có cái này nếu hệ thống có gửi cookie hoặc token
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions)); // Gắn cấu hình vừa tạo vào

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// 3. Gọi kết nối Database
connectDB();

// 4. Gắn các Routes (Đường dẫn API)
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes); 

// Route mặc định kiểm tra server
app.get('/', (req, res) => {
    res.send('AuthChain Backend đang chạy mượt mà 🚀');
});

// 5. Khởi động Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🔥 Server đang chạy tại cổng http://localhost:${PORT}`);
    
    // THÊM DÒNG NÀY 2: Bật máy nghe lén ngay sau khi server chạy
    startListener(); 
});