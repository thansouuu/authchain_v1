import React from 'react';
import { formatDateTime } from '../hooks/formatDate'; 

export default function ProductDetailModal({ isOpen, onClose, product }) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Lớp Overlay làm mờ (Backdrop Blur) */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose} 
      ></div>
      
      {/* Nội dung Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        
        {/* Header Modal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-purple-600 text-2xl">📦</span> Product Details
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-800 transition-colors p-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 overflow-y-auto">
          
          {/* --- GALLERY ẢNH (Dạng kéo ngang - Swipeable Carousel) --- */}
          {product.images && product.images.length > 0 && (
            <div className="mb-8 relative group">
              {/* Container chứa các ảnh kéo ngang. Các class [scrollbar-width:none] giúp ẩn thanh cuộn nhưng vẫn kéo được */}
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {product.images.map((img, idx) => (
                  <div 
                    key={idx} 
                    className="w-full flex-shrink-0 snap-center aspect-[21/9] sm:aspect-video rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 relative shadow-sm"
                  >
                    <img src={img} alt={`product-${idx}`} className="w-full h-full object-cover" />
                    
                    {/* Bộ đếm ảnh (Ví dụ: 1/5) */}
                    {product.images.length > 1 && (
                      <div className="absolute bottom-3 right-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-md">
                        {idx + 1} / {product.images.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Dòng chữ hướng dẫn kéo */}
              {product.images.length > 1 && (
                <p className="text-center text-xs text-gray-400 mt-2 font-medium">
                  ↔ Kéo sang trái hoặc phải để xem toàn bộ ảnh
                </p>
              )}
            </div>
          )}

          {/* --- CÁC HÀNG THÔNG TIN CƠ BẢN --- */}
          <div className="bg-gray-50 rounded-2xl p-1 border border-gray-100 mb-8">
            <div className="flex justify-between items-center p-4 border-b border-gray-200/60">
              <span className="text-sm font-semibold text-gray-500">Product Name</span>
              <span className="text-sm font-bold text-gray-900">{product.name}</span>
            </div>
            <div className="flex justify-between items-center p-4 border-b border-gray-200/60">
              <span className="text-sm font-semibold text-gray-500">Product ID</span>
              <span className="text-sm font-mono text-gray-900">{product.productId}</span>
            </div>
            <div className="flex justify-between items-center p-4 border-b border-gray-200/60">
              <span className="text-sm font-semibold text-gray-500">Price</span>
              <span className="text-sm font-bold text-gray-900">◎ {Number(product.priceSol).toFixed(2)} SOL</span>
            </div>
            <div className="flex justify-between items-center p-4 border-b border-gray-200/60">
              <span className="text-sm font-semibold text-gray-500">Created At</span>
              <span className="text-sm font-medium text-gray-900">{formatDateTime(product.createdAt)}</span>
            </div>
            
            {/* Description là 1 hàng */}
            <div className="flex justify-between items-start p-4 border-b border-gray-200/60 gap-4">
              <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">Description</span>
              <span className="text-sm text-gray-900 text-right line-clamp-3" title={product.description}>
                {product.description || "Chưa có mô tả."}
              </span>
            </div>

            <div className="flex justify-between items-center p-4">
              <span className="text-sm font-semibold text-gray-500">Current Status</span>
              <span className="uppercase text-xs font-bold tracking-wider text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
                {product.status}
              </span>
            </div>
          </div>

          {/* --- KHỐI TRACKING HISTORY --- */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="text-lg">📜</span> Tracking History
            </h3>
            
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner">
              {product.history && product.history.length > 0 ? (
                <div className="space-y-0">
                  {/* Đảo mảng để bản ghi mới nhất lên đầu */}
                  {[...product.history].reverse().map((record, index) => {
                    
                    // 👉 Bổ sung đầy đủ các Case trạng thái
                    const getStatusColor = (st) => {
                      switch (st) {
                        case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
                        case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
                        case 'purchased': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
                        case 'in-transit': return 'bg-purple-100 text-purple-700 border-purple-200';
                        case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
                        case 'disputed': return 'bg-orange-100 text-orange-700 border-orange-200';
                        case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
                        default: return 'bg-gray-200 text-gray-700 border-gray-300';
                      }
                    };

                    return (
                      <div 
                        key={record._id || index}
                        // 👉 Dòng kẻ timeline: Chuyển sang xanh lá cho mốc mới nhất
                        className={`relative pl-6 border-l-2 pb-6 last:pb-0 ${
                          index === 0 ? 'border-green-500' : 'border-gray-200'
                        }`}
                      >
                        {/* 👉 Cục tròn timeline: Xanh lá tĩnh (Bỏ animate-pulse) */}
                        <div className={`absolute w-3.5 h-3.5 rounded-full -left-[9px] top-1.5 shadow-[0_0_0_4px_#f9fafb] ${
                          index === 0 ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        
                        <div className="flex justify-between items-start -mt-0.5 mb-1.5">
                          <span className={`text-sm font-bold ${index === 0 ? 'text-green-700' : 'text-gray-800'}`}>
                            {record.title}
                          </span>
                          <span className="text-xs font-semibold text-gray-400 whitespace-nowrap ml-3 bg-white px-2 py-0.5 rounded-md border border-gray-100 shadow-sm">
                            {record.date ? formatDateTime(record.date) : 'N/A'}
                          </span>
                        </div>
                        
                        <div className="mb-2 mt-2">
                          <span className={`inline-block px-2 py-0.5 border rounded uppercase tracking-wider text-[9px] font-bold ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </div>

                        {record.desc && (
                          <p className="text-xs text-gray-500 leading-relaxed bg-white p-3 rounded-xl border border-gray-100 shadow-sm mt-2">
                            {record.desc}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <span className="text-4xl block mb-3 opacity-50">📭</span>
                  <p className="text-sm font-medium">Chưa có dữ liệu hành trình.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}