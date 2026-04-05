const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected thành công tại: ${conn.connection.host}`);
        console.log("Port đang dùng:", mongoose.connection.port);
        console.log("Host đang dùng:", mongoose.connection.host);
    } catch (error) {
        console.error(`❌ Lỗi kết nối MongoDB: ${error.message}`);
        process.exit(1); // Thoát ứng dụng nếu không kết nối được DB
    }
};

module.exports = connectDB;