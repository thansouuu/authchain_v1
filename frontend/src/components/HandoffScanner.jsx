import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner'; // 👉 Dùng lõi thư viện hiện đại

const HandoffScanner = ({ onScanSuccess, onCancel }) => {
  const [error, setError] = useState(null);

  const handleScan = (result) => {
    // Thư viện mới trả về mảng các kết quả
    if (result && result.length > 0) {
      try {
        // rawValue là chuỗi string chứa trong mã QR
        const parsedData = JSON.parse(result[0].rawValue);
        
        // Kiểm tra sơ bộ các trường bắt buộc
        if (parsedData.signature && parsedData.receiverWallet && parsedData.productId) {
          // 👉 Tối ưu: Trả về luôn object đã parse để component cha khỏi parse lại
          onScanSuccess(parsedData); 
        } else {
          setError("Mã QR không đúng định dạng hệ thống!");
        }
      } catch (e) {
        setError("Không thể đọc dữ liệu từ mã QR này!");
      }
    }
  };

  const handleError = (err) => {
    console.error(err);
    setError("Không thể truy cập Camera. Vui lòng kiểm tra quyền trình duyệt!");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-6 text-center border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Quét mã nhận hàng</h3>
          <p className="text-sm text-gray-500 mt-1">Căn chỉnh mã QR vào giữa khung hình</p>
        </div>

        {/* Scanner Area */}
        <div className="relative aspect-square bg-black">
          <Scanner
            onScan={handleScan}
            onError={handleError}
            formats={['qr_code']} // Chỉ tập trung quét QR code cho nhanh
            components={{
              audio: true, // Tắt tiếng bíp nếu không cần
              zoom: true,
              torch: true, // Bật đèn flash (nếu thiết bị hỗ trợ)
            }}
          />
          {/* Overlay khung ngắm của bạn giữ nguyên */}
          <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
             <div className="w-full h-full border-2 border-indigo-400 rounded-lg"></div>
          </div>
        </div>

        {/* Footer & Error */}
        <div className="p-6 bg-white">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium text-center animate-pulse">
              ⚠️ {error}
            </div>
          )}
          
          <button
            onClick={onCancel}
            className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-colors"
          >
            Đóng Camera
          </button>
        </div>
      </div>
    </div>
  );
};

export default HandoffScanner;