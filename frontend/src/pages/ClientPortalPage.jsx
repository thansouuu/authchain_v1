import { useState, useEffect } from 'react';
import axios from 'axios';
import ProductDetailModal from '../components/ProductDetailModal';
import ReceiveParcelCard from '../components/ReceiveParcelCard';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProvider, getProgram, PROGRAM_ID } from '../utils/anchorSetup';
import { formatDateTime } from '../hooks/formatDate';
import { checkTimeoutCondition } from '../hooks/timeoutChecker';

export default function ClientPortalPage() {
  const [orders, setOrders] = useState([]);
  const { publicKey } = useWallet();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  
  // 👉 SỬA Ở ĐÂY: Thay boolean bằng việc lưu lại Product ID đang được xử lý
  const [processingConfirmId, setProcessingConfirmId] = useState(null);
  const [processingReportId, setProcessingReportId] = useState(null);

  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'in-transit': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-emerald-100 text-emerald-700';
      case 'disputed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatStatusText = (status) => {
    switch (status) {
      case 'in-transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'disputed': return 'Disputed';
      default: return status;
    }
  };

  const fetchOrders = async () => {
    if (!publicKey) return; 

    try {
      const response = await axios.get(`https://authchain-v1.onrender.com/api/products?owner=${publicKey.toBase58()}`);
      setOrders(response.data.data);
    } catch (error) {
      console.error("❌ Lỗi lấy danh sách đơn hàng:", error);
    } 
  };

  useEffect(() => {
    fetchOrders();
  }, [publicKey]);

  const handleConfirmReceipt = async (order) => {
    if (!wallet || !publicKey) {
      alert("Vui lòng kết nối ví trước khi thao tác!");
      return;
    }

    if (!window.confirm(`Bạn xác nhận đã nhận thành công đơn hàng ${order.productId}?`)) return;

    try {
      // 👉 Ghi nhận ID đang xử lý
      setProcessingConfirmId(order.productId); 
      
      const nsxPublicKey = new PublicKey(order.manufacturerWallet);
      const brandPublicKey = new PublicKey(order.brandWallet);
      const [productPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("PRODUCT_SEED"),
          nsxPublicKey.toBuffer(),
          Buffer.from(order.productId)
        ],
        PROGRAM_ID
      );

      const provider = getProvider(wallet, connection);
      const program = getProgram(provider);

      const tx = await program.methods
        .finishProduct()
        .accounts({
          currentAuthority: publicKey,
          product: productPda,
          brandPubkey: brandPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert("🎉 Bạn đã xác nhận nhận hàng thành công!");
      const newHistoryEvent = {
        title: "Thanh toán thành công",
        desc: "Giao hàng thành công. Đã hoàn cọc cho Brand !",
        date: new Date().toISOString()
      };

      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.productId === order.productId 
            ? { 
                ...o, 
                status: 'delivered',
                history: [...(o.history || []), newHistoryEvent] 
              } 
            : o
        )
      );

    } catch (error) {
      console.error("Lỗi khi Confirm:", error);
      if (error.message.includes("User rejected")) {
        console.log("Người dùng đã hủy giao dịch trên ví."); 
      } else if (error.message.includes("NotCurrentAuthority")) {
        alert("Lỗi: Bạn không phải là người đang giữ kiện hàng này!");
      } else {
        alert(`Giao dịch thất bại: ${error.message}`);
      }
    } finally {
      // 👉 Xóa ID khỏi trạng thái xử lý
      setProcessingConfirmId(null); 
    }
  };

  const handleReportIssue = async (order) => {
    if (!wallet || !publicKey) {
      alert("Vui lòng kết nối ví trước khi thao tác!");
      return;
    }

    const reason = window.prompt("Vui lòng nhập lý do báo cáo sự cố (vd: Hàng bị vỡ, sai sản phẩm...):");
    if (!reason) return;

    try {
      // 👉 Ghi nhận ID đang xử lý
      setProcessingReportId(order.productId); 

      const nsxPublicKey = new PublicKey(order.manufacturerWallet);
      const [productPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("PRODUCT_SEED"),
          nsxPublicKey.toBuffer(),
          Buffer.from(order.productId)
        ],
        PROGRAM_ID
      );

      const provider = getProvider(wallet, connection);
      const program = getProgram(provider);

      const txHash = await program.methods
        .reportError(reason) 
        .accounts({
          currentAuthority: publicKey,
          product: productPda,
        })
        .rpc();

      alert("🚨 Đã gửi báo cáo sự cố lên Blockchain thành công!");
      const newHistoryEvent = {
        title: "DISPUTED",
        desc: `${reason}`,
        date: new Date().toISOString()
      };

      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.productId === order.productId 
            ? { 
                ...o, 
                status: 'disputed',
                history: [...(o.history || []), newHistoryEvent] 
              } 
            : o
        )
      );
    } catch (error) {
      console.error("Lỗi khi Report Issue:", error);
      if (error.message.includes("User rejected")) {
        console.log("Người dùng đã hủy giao dịch báo cáo lỗi.");
      } else if (error.message.includes("NotCurrentAuthority")) {
        alert("Lỗi: Bạn không có quyền báo cáo cho đơn hàng này!");
      } else {
        alert(`Lỗi hệ thống: ${error.message}`);
      }
    } finally {
      // 👉 Xóa ID khỏi trạng thái xử lý
      setProcessingReportId(null); 
    }
  };

  const handleResolveTimeout = async (order) => {
    if (!wallet || !publicKey) {
      alert("Vui lòng kết nối ví trước khi thao tác!");
      return;
    }

    if (!window.confirm("Brand đã quá 7 ngày không phán xử. Bạn có chắc chắn muốn Force Claim để lấy lại tiền thanh toán?")) return;

    try {
      const nsxPublicKey = new PublicKey(order.manufacturerWallet);
      const brandPublicKey = new PublicKey(order.brandWallet);

      const [productPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("PRODUCT_SEED"),
          nsxPublicKey.toBuffer(),
          Buffer.from(order.productId)
        ],
        PROGRAM_ID
      );

      const provider = getProvider(wallet, connection);
      const program = getProgram(provider);

      const txHash = await program.methods
        .resolveTimeout()
        .accounts({
          caller: publicKey,
          product: productPda,
          buyerPubkey: publicKey, 
          nsxPubkey: nsxPublicKey,
          brandPubkey: brandPublicKey
        })
        .rpc();

      alert("🎉 Force Claim thành công! Đã lấy lại tiền hoàn cọc.");
      
      const newHistoryEvent = {
        title: "DISPUTED",
        desc: "Brand quá hạn phân xử. Hoàn tiền cho Client, tịch thu cọc của Brand trả cho nhà sản xuất.",
        date: new Date().toISOString()
      };

      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.productId === order.productId 
            ? { 
                ...o, 
                status: 'delivered', 
                history: [...(o.history || []), newHistoryEvent] 
              } 
            : o
        )
      );

    } catch (error) {
      console.error("Lỗi khi Force Claim:", error);
      if (error.message.includes("User rejected")) {
        console.log("Người dùng đã hủy giao dịch trên ví.");
      } else if (error.message.includes("NotYetTimeout")) {
        alert("Lỗi: Blockchain báo chưa đủ 7 ngày quá hạn!");
      } else {
        alert(`Giao dịch thất bại: ${error.message}`);
      }
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-10">
        <ReceiveParcelCard myOrders={orders} />
      </div>
      {/* --- HEADER --- */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-gray-950 flex items-center gap-4 mb-2">
          <span className="p-3 bg-blue-50 text-blue-600 rounded-2xl text-2xl">📦</span>
          My Inventory & Orders
        </h1>
        <p className="text-gray-500 text-base ml-14">Track and manage your authenticated physical assets.</p>
      </div>

      {/* --- DANH SÁCH ĐƠN HÀNG --- */}
      <div className="space-y-6">
        {orders.map((order) => {
          // 👉 Xác định xem ĐÚNG CÁI NÚT NÀY có đang được bấm không
          const isThisConfirming = processingConfirmId === order.productId;
          const isThisReporting = processingReportId === order.productId;
          
          // 👉 Disable toàn bộ các nút khác nếu đang có 1 giao dịch đang chạy
          const isAnyActionRunning = processingConfirmId !== null || processingReportId !== null;

          return (
            <div key={order.productId} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              
              {/* THÔNG TIN SẢN PHẨM CƠ BẢN */}
              <div 
                className="p-6 md:p-8 flex flex-col md:flex-row gap-6 relative cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setSelectedProduct(order)}
                title="Bấm để xem chi tiết và lịch sử di chuyển"
              >
                {/* Ảnh */}
                <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
                  <img src={order.images[0]} alt={order.name} className="w-full h-full object-cover rounded-2xl shadow-sm" />
                </div>

                {/* Chi tiết */}
                <div className="flex-grow">
                  <h2 className="text-xl font-bold text-gray-900 mb-1 pr-24">{order.name}</h2>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{order.description}</p>
                  
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-900">{order.priceSol} SOL</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wide">
                      ID: {order.productId}
                    </span>
                  </div>
                </div>

                {/* Status Badge (Góc phải trên) */}
                <div className="absolute top-6 right-6 md:top-8 md:right-8">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/50 ${getStatusBadgeStyles(order.status)}`}>
                    {formatStatusText(order.status)}
                  </span>
                </div>
              </div>

              {/* FOOTER ACTIONS (Chỉ hiện nếu đang In-Transit và người dùng là người giữ hàng hiện tại) */}
              {order.status === 'in-transit' && order.currentCustodian === publicKey?.toBase58() && (
                <>
                  <div className="h-px bg-gray-100 mx-6 md:mx-8"></div>
                  <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-4 bg-gray-50/30">
                    {/* Nút Xác nhận nhận hàng */}
                    <button 
                      onClick={() => handleConfirmReceipt(order)} 
                      disabled={isAnyActionRunning} 
                      className={`flex-1 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm ${
                        isThisConfirming 
                          ? 'bg-emerald-400 cursor-wait text-white' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {isThisConfirming ? 'Đang xác nhận...' : 'Confirm Receipt'}
                    </button>
                    
                    {/* Nút Báo cáo sự cố */}
                    <button 
                      onClick={() => handleReportIssue(order)}
                      disabled={isAnyActionRunning}
                      className={`flex-1 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm ${
                        isThisReporting
                          ? 'bg-red-300 text-white cursor-wait border-none' 
                          : 'bg-white border border-red-200 hover:bg-red-50 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed' 
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {isThisReporting ? 'Đang gửi...' : 'Report Issue'}
                    </button>
                  </div>
                </>
              )}

              {/* FORCE CLAIM BUTTON */}
              {order.status === 'disputed' && checkTimeoutCondition(order) === 'brand_timeout' && (
                <div className="p-6 md:p-8 pt-0 border-t border-red-50 bg-red-50/30 rounded-b-[2rem]">
                  <button 
                    onClick={() => handleResolveTimeout(order)}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-red-200 animate-pulse hover:animate-none mt-6"
                  >
                    <span className="text-xl">🚨</span>
                    Force Claim (Brand Timeout) - Lấy lại tiền
                  </button>
                </div>
              )}

            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <span className="text-4xl block mb-3">🛒</span>
            <p className="text-gray-500 font-medium">Bạn chưa mua hoặc sở hữu sản phẩm nào.</p>
          </div>
        )}
      </div>

      {/* MODAL CHI TIẾT VÀ LỊCH SỬ (TIMELINE) */}
      <ProductDetailModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct} 
      />
    </div>
  );
}