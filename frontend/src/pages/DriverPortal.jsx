import { useState, useEffect } from 'react';
import axios from 'axios';
import ProductDetailModal from '../components/ProductDetailModal';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLocation } from '../hooks/useLocation';
import ReceiveParcelCard from '../components/ReceiveParcelCard';
import TransferCustodyCard from '../components/TransferCustodyCard';

const DriverPortal = () => {
    const wallet = useAnchorWallet();
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const { currentLocation, fetchLocation } = useLocation();
    
    // --- STATE Quản lý UI/UX ---
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [delivery, setDelivery] = useState([]);
    const [isQrMagnified, setIsQrMagnified] = useState(false);
    
    // States cho Giao hàng (Transfer Custody)
    const [nextCustodianAddress, setNextCustodianAddress] = useState('');

    useEffect(() => {
        const fetchDeliveryOrders = async () => {
            if (!publicKey) return;
            try {
                setLoading(true);
                const response = await axios.get(
                    `http://localhost:5000/api/products?currentCustodian=${publicKey.toBase58()}`
                );
                setDelivery(response.data.data);
            } catch (error) {
                console.error("❌ Lỗi khi lấy đơn hàng Driver:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDeliveryOrders();
    }, [publicKey]);

    // Hàm này giúp báo cho DriverPortal biết là component con đã giao xong
    const handleTransferDone = (transferredProductId) => {
        setDelivery((prev) => prev.filter((item) => item.productId !== transferredProductId));
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="p-4 max-w-3xl mx-auto space-y-6">
                
                {/* --- 1. MỤC NHẬN SẢN PHẨM MỚI (Tái sử dụng Component) --- */}
                <ReceiveParcelCard />

                {/* --- 2. MỤC GIAO HÀNG ĐI (Transfer Custody Global Button) --- */}
                <TransferCustodyCard 
                    inventory={delivery} 
                    onTransferSuccess={handleTransferDone} 
                />

                {/* --- 3. MY CUSTODY (Danh sách hàng hóa) --- */}
                <div className="bg-slate-900 p-6 rounded-2xl text-white flex justify-between items-center shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-700 p-4 rounded-full flex-shrink-0 text-xl">🚚</div>
                        <div className="flex flex-col">
                            <div className="text-gray-400 font-medium text-sm">Hàng đang chở (My Custody)</div>
                            <div className="text-2xl font-bold mt-1">ACTIVE PARCELS: {delivery.length}</div>
                        </div>
                    </div>
                    
                    <div 
                      className="flex-shrink-0 bg-white p-2 rounded-xl cursor-pointer hover:scale-105 transition-all"
                      onClick={() => publicKey && setIsQrMagnified(true)}
                    >
                        {publicKey ? <QRCodeSVG value={publicKey.toBase58()} size={50} /> : <div className="w-[50px] h-[50px] bg-gray-200" />}
                    </div>
                </div>

                <div className="space-y-3">
                    {delivery.map((order) => (
                        <div
                            key={order.productId}
                            // 👉 CHỈ CÒN MỘT TÁC DỤNG: CLICK ĐỂ XEM CHI TIẾT
                            onClick={() => setSelectedProduct(order)}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-4 group"
                        >
                            <img
                                src={order.images?.[0] || 'https://via.placeholder.com/150'}
                                alt={order.name}
                                className="w-16 h-16 rounded-xl object-cover bg-gray-100"
                            />
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{order.name}</h3>
                                <p className="text-xs text-gray-500 font-mono mt-1">ID: {order.productId}</p>
                            </div>
                            <div className="text-gray-300">❯</div>
                        </div>
                    ))}
                    {delivery.length === 0 && (
                        <p className="text-center text-gray-400 py-8">Bạn đang không giữ kiện hàng nào.</p>
                    )}
                </div>
            </div>

            {/* Modal phóng to QR */}
            {isQrMagnified && publicKey && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-6" onClick={() => setIsQrMagnified(false)}>
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <QRCodeSVG value={publicKey.toBase58()} size={280} />
                        <p className="text-sm font-mono text-gray-500 break-all">{publicKey.toBase58()}</p>
                    </div>
                </div>
            )}

            {/* Modal Chi Tiết */}
            <ProductDetailModal
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                product={selectedProduct}
            />

            {/* Global Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-emerald-800 font-bold">Đang tương tác Blockchain...</p>
                </div>
            )}
        </div>
    );
};

export default DriverPortal;