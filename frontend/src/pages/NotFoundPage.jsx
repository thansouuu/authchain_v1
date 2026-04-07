import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h1 className="text-9xl font-extrabold text-blue-600">404</h1>
            <p className="text-2xl font-bold text-gray-800 mt-4">Ối! Lạc đường rồi.</p>
            <p className="text-gray-500 mt-2 mb-8">Trang bạn tìm kiếm không tồn tại hoặc đã bị xóa.</p>
            <Link 
                to="/" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
                Quay về Trang chủ
            </Link>
        </div>
    );
}