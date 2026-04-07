import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useReceiveQR } from '../hooks/useReceiveQR';

// 👉 THÊM PROP myOrders (Danh sách đơn hàng của Client truyền từ Component cha xuống)
export default function ReceiveParcelCard({ myOrders = [] }) {
    const [pickupProductId, setPickupProductId] = useState('');
    const { qrData, isGenerating, generateQR, resetQR } = useReceiveQR();
    
    // Quản lý thời gian đếm ngược
    const [timeLeft, setTimeLeft] = useState(60);

    // Effect chạy đồng hồ khi có qrData
    useEffect(() => {
        if (!qrData) return;

        setTimeLeft(60);

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0; // Dừng ở 0
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [qrData]);

    const handleGenerate = () => {
        if (!pickupProductId) {
            alert("Vui lòng nhập mã Product ID!");
            return;
        }

        const inputId = pickupProductId.trim();

        // 👉 BƯỚC KIỂM TRA BẢO MẬT: Kiểm tra xem user có phải là owner không
        if (myOrders && myOrders.length > 0) {
            const isOwner = myOrders.some(product => product.productId === inputId);
            if (!isOwner) {
                alert(`❌ Từ chối: Kiện hàng ${inputId} không thuộc quyền quản lý của bạn!`);
                return;
            }
        }

        // Vượt qua kiểm tra thì mới gọi hàm tạo QR
        generateQR(inputId);
    };

    const handleReset = () => {
        resetQR();
        setPickupProductId('');
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-indigo-50">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📦</span>
                <h2 className="text-xl font-bold text-gray-900">Nhận kiện hàng mới</h2>
            </div>

            {!qrData ? (
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Nhập mã Product ID hoặc quét mã vạch trên vỏ thùng để tạo mã nhận hàng.
                    </p>
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            placeholder="Nhập ID (vd: PRD-123...)"
                            value={pickupProductId}
                            onChange={(e) => setPickupProductId(e.target.value.toUpperCase())}
                            className="flex-grow bg-gray-50 border border-gray-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        />
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                            {isGenerating ? "⌛ Đang ký..." : "🔑 Tạo QR"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                    <div className="text-center">
                        <p className="text-sm font-bold text-indigo-700 uppercase mb-1">Mã xác thực nhận hàng</p>
                        <p className="text-xs font-mono text-gray-500 bg-white px-3 py-1 rounded-md border border-gray-200">
                            {JSON.parse(qrData).productId}
                        </p>
                        
                        <div className="mt-3">
                            {timeLeft > 0 ? (
                                <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center justify-center gap-1.5 ${
                                    timeLeft <= 15 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                    <span>⏳</span> Mã có hiệu lực trong: {timeLeft}s
                                </span>
                            ) : (
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center gap-1.5">
                                    <span>❌</span> Mã đã hết hạn! Vui lòng làm mới.
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={`bg-white p-4 rounded-2xl shadow-sm relative transition-opacity duration-300 ${timeLeft === 0 ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                        <QRCodeSVG value={qrData} size={180} />
                        
                        {timeLeft === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-red-500 text-white font-black text-sm px-3 py-1 rounded-lg transform -rotate-12">
                                    EXPIRED
                                </span>
                            </div>
                        )}
                    </div>
                    
                    <p className="text-xs text-gray-500 text-center">Đưa mã này cho người giao hàng quét.</p>
                    
                    <div className="flex items-center gap-6 mt-2">
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={`text-sm font-bold transition-colors flex items-center gap-1.5 ${
                                timeLeft === 0 ? 'text-blue-600 animate-bounce' : 'text-indigo-600 hover:text-indigo-800'
                            }`}
                        >
                            {isGenerating ? (
                                <><span>⌛</span> Đang tạo...</>
                            ) : (
                                <><span>🔄</span> Làm mới mã</>
                            )}
                        </button>

                        <span className="text-gray-300">|</span>

                        <button 
                            onClick={handleReset}
                            className="text-red-500 text-sm font-bold hover:text-red-700 transition-colors flex items-center gap-1.5"
                        >
                            <span>✕</span> Hủy / Xóa
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}