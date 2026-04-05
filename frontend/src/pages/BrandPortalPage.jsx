import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWallet } from '@solana/wallet-adapter-react';
import { ShieldCheck, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import ProductDetailModal from '../components/ProductDetailModal';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { getProvider, getProgram, PROGRAM_ID } from '../utils/anchorSetup';
import { checkTimeoutCondition } from '../hooks/timeoutChecker';

const BrandPortalPage = () => {
  // Mock data cho giao diện
  const [pendingProducts, setPendingProducts] = useState([]);
  const [activeDisputes, setActiveDisputes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [clientTimeoutProducts, setClientTimeoutProducts] = useState([]);

  useEffect(() => {
    const fetchPendingProducts = async () => {
      if (!publicKey) return;

      setLoading(true);
      try {
        const walletStr = publicKey.toBase58();
        const res = await axios.get(`https://authchain-v1.onrender.com/api/products?brandWallet=${walletStr}&status=pending`);
        
        if (res.data && res.data.data) {
          setPendingProducts(res.data.data);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Pending Products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingProducts();
  }, [publicKey]);

  useEffect(() => {
    const fetchDisputedProducts = async () => {
        if (!publicKey) return; 

        try {
            setLoading(true);
            const response = await axios.get(
                `https://authchain-v1.onrender.com/api/products?status=disputed&brandWallet=${publicKey.toBase58()}`
            );
            
            if (response.data && response.data.data) {
                setActiveDisputes(response.data.data);
            }
        } catch (error) {
            console.error('❌ Lỗi khi lấy danh sách tranh chấp:', error);
        } finally {
            setLoading(false);
        }
    };

    fetchDisputedProducts();
  }, [publicKey]);

  useEffect(() => {
    const fetchTimeoutProducts = async () => {
      if (!publicKey) return;

      try {
        const response = await axios.get(
          `https://authchain-v1.onrender.com/api/products?status=in-transit&brandWallet=${publicKey.toBase58()}`
        );
        
        if (response.data && response.data.data) {
          // Lọc ra những đơn hàng thỏa mãn điều kiện 'client_timeout' (quá 3 ngày)
          const timeoutItems = response.data.data.filter(
            (p) => checkTimeoutCondition(p) === 'client_timeout'
          );
          setClientTimeoutProducts(timeoutItems);
        }
      } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách Client Timeout:', error);
      }
    };

    fetchTimeoutProducts();
  }, [publicKey]);

  const handleApprove = async (e, product) => {
    e.stopPropagation();
    if (!publicKey) {
      alert("Vui lòng kết nối ví Brand của bạn!");
      return;
    }

    try {
      const provider = getProvider(wallet, connection);
      const program = getProgram(provider);
      const nsxPublicKey = new PublicKey(product.manufacturerWallet);

      const [productPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("PRODUCT_SEED"),
          nsxPublicKey.toBuffer(),
          Buffer.from(product.productId)
        ],
        PROGRAM_ID
      );

      const txHash = await program.methods
        .approveProduct()
        .accounts({
          brand: publicKey,
          product: productPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
        
        alert(`Đã duyệt thành công sản phẩm: ${product.name}`);
        setPendingProducts((prev) => prev.filter(p => p.productId !== product.productId));
    } catch (error) {
      console.error("Lỗi khi duyệt sản phẩm:", error);
      if (error.message.includes("User rejected")) {
        alert("Bạn đã hủy giao dịch trên ví.");
      } else if (error.message.includes("UnauthorizedBrand")) {
        alert("Lỗi: Ví của bạn không có quyền duyệt sản phẩm này (Không phải Brand chỉ định)!");
      } else {
        alert("Lỗi giao dịch: " + error.message);
      }
    }
  };

  // Hàm xử lý phán xử tranh chấp
  const handleVerifyReport = async (e, dispute, nsxAtFault) => {
    e.stopPropagation(); // Ngăn không cho click xuyên xuống mở Modal chi tiết
    
    if (!publicKey) {
      alert("Vui lòng kết nối ví Brand của bạn!");
      return;
    }

    // Xác nhận lại quyết định để tránh click nhầm
    const confirmMessage = nsxAtFault 
      ? `🚨 Xác nhận lỗi thuộc về NHÀ SẢN XUẤT? (Tiền trong PDA sẽ hoàn lại cho Client)`
      : `✅ Xác nhận lỗi thuộc về KHÁCH HÀNG (Client vu khống)? (Tiền trong PDA sẽ chuyển cho NSX)`;
      
    if (!window.confirm(confirmMessage)) return;

    try {
      const provider = getProvider(wallet, connection);
      const program = getProgram(provider);

      // 1. Chuẩn bị các Public Key từ dữ liệu
      const nsxPublicKey = new PublicKey(dispute.manufacturerWallet);
      const buyerPublicKey = new PublicKey(dispute.owner); // 'owner' ở đây chính là ví của Client

      // 2. Tính toán PDA
      const [productPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("PRODUCT_SEED"),
          nsxPublicKey.toBuffer(),
          Buffer.from(dispute.productId)
        ],
        PROGRAM_ID
      );

      console.log(`Đang phán xử PDA: ${productPda.toBase58()} | Lỗi NSX: ${nsxAtFault}`);

      // 3. Gọi Smart Contract
      // Lưu ý: Anchor sẽ tự động chuyển đổi snake_case bên Rust sang camelCase bên React
      const txHash = await program.methods
        .verifyReport(nsxAtFault) // Truyền tham số boolean
        .accounts({
          brandPubkey: publicKey,    // Tương ứng với brand_pubkey
          product: productPda,       // Tương ứng với product
          buyerPubkey: buyerPublicKey, // Tương ứng với buyer_pubkey
          nsxPubkey: nsxPublicKey,   // Tương ứng với nsx_pubkey
        })
        .rpc();

      alert("⚖️ Phán xử thành công! Lịch sử và số dư đã được cập nhật trên Blockchain.");
      
      // Xóa sản phẩm khỏi danh sách tranh chấp (Tối ưu UI)
      setActiveDisputes((prev) => prev.filter(p => p.productId !== dispute.productId));

    } catch (error) {
      console.error("Lỗi khi phán xử:", error);
      if (error.message.includes("User rejected")) {
        console.log("Bạn đã hủy giao dịch trên ví.");
      } else if (error.message.includes("UnauthorizedBrand")) {
        alert("Lỗi: Ví của bạn không có quyền phán xử đơn hàng này!");
      } else if (error.message.includes("InvalidBuyerAddress")) {
        alert("Lỗi bảo mật: Ví Client không khớp với hồ sơ Blockchain!");
      } else if (error.message.includes("InvalidNsxAddress")) {
        alert("Lỗi bảo mật: Ví NSX không khớp với hồ sơ Blockchain!");
      } else {
        alert("Giao dịch thất bại: " + error.message);
      }
    }
  };

  // 👉 3. THÊM HÀM NÀY ĐỂ GỌI SMART CONTRACT
  const handleResolveTimeout = async (e, product) => {
    e.stopPropagation();
    if (!publicKey) {
      alert("Vui lòng kết nối ví Brand của bạn!");
      return;
    }

    if (!window.confirm("Khách hàng đã giữ hàng quá 3 ngày mà không xác nhận. Bạn có chắc chắn muốn Force Claim để giải phóng tiền?")) return;

    try {
      const provider = getProvider(wallet, connection);
      const program = getProgram(provider);

      const nsxPublicKey = new PublicKey(product.manufacturerWallet);
      const buyerPublicKey = new PublicKey(product.owner);
      
      const [productPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("PRODUCT_SEED"),
          nsxPublicKey.toBuffer(),
          Buffer.from(product.productId)
        ],
        PROGRAM_ID
      );

      console.log(`Đang Force Claim PDA: ${productPda.toBase58()}`);

      const txHash = await program.methods
        .resolveTimeout()
        .accounts({
          caller: publicKey,             // Brand là người gọi
          product: productPda,
          buyerPubkey: buyerPublicKey,
          nsxPubkey: nsxPublicKey,
          brandPubkey: publicKey         // Brand Pubkey
        })
        .rpc();

      alert("🚨 Force Claim thành công! Đã giải phóng tiền stake/thanh toán.");
      
      // Xóa khỏi danh sách UI
      setClientTimeoutProducts((prev) => prev.filter(p => p.productId !== product.productId));

    } catch (error) {
      console.error("Lỗi khi Force Claim:", error);
      if (error.message.includes("User rejected")) {
        console.log("Bạn đã hủy giao dịch trên ví.");
      } else if (error.message.includes("NotYetTimeout")) {
        alert("Lỗi: Blockchain báo chưa đủ thời gian quá hạn 3 ngày!");
      } else {
        alert("Giao dịch thất bại: " + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-10">
          <div className="p-4 bg-indigo-50 rounded-2xl">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Verification & Dispute Center</h1>
            <p className="text-gray-500 font-medium">Review manufacturer submissions and resolve client claims.</p>
          </div>
        </div>

        {/* --- Pending Approvals Section --- */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-bold text-gray-800">Pending Approvals</h2>
            <span className="bg-amber-100 text-amber-700 text-sm px-2.5 py-0.5 rounded-full font-bold">
              {pendingProducts.length}
            </span>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500 font-bold">Đang tải dữ liệu...</div>
            ) : pendingProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Không có sản phẩm nào chờ duyệt.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 border-b border-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Product Info</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Manufacturer Wallet</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Price (SOL)</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendingProducts.map((product) => (
                    <tr key={product.productId || product._id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <div 
                          className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedBatch(product)}
                        >
                          <img 
                            src={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/100'} 
                            className="w-12 h-12 rounded-xl object-cover shadow-sm" 
                            alt={product.name} 
                          />
                          <div>
                            <p className="font-bold text-gray-900 hover:text-indigo-600 transition-colors">{product.name}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{product.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-mono tracking-tight">
                          {product.manufacturerWallet}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-gray-800">
                        {product.priceSol} SOL
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={(e) => handleApprove(e, product)}
                          className="bg-[#6366F1] hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 ml-auto shadow-md shadow-indigo-100 transition-all active:scale-95"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* --- Active Disputes Section --- */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-gray-800">Active Disputes</h2>
            <span className="bg-red-100 text-red-700 text-sm px-2.5 py-0.5 rounded-full font-bold animate-pulse">
              {activeDisputes.length}
            </span>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Product Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Reported By (Client)</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Resolution Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeDisputes.map((dispute) => (
                  <tr key={dispute.productId || dispute._id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-5">
                      <div 
                        className="flex items-center gap-4 cursor-pointer group" 
                        onClick={() => setSelectedBatch(dispute)} 
                        title="Bấm để xem chi tiết sản phẩm"
                      >
                        <img src={dispute.images[0]} className="w-12 h-12 rounded-xl object-cover shadow-sm transition-transform group-hover:scale-105" alt="" />
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{dispute.name}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{dispute.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-mono tracking-tight">
                        {dispute.owner}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex gap-3 justify-end">
                        <button 
                          onClick={(e) => handleVerifyReport(e, dispute, true)}
                          className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                        >
                          <XCircle className="w-4 h-4" /> Fault: Manufacturer
                        </button>
                        
                        <button 
                          onClick={(e) => handleVerifyReport(e, dispute, false)}
                          className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                        >
                          <Info className="w-4 h-4" /> Fault: Client
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- Client Timeouts Section --- */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-800">Client Timeouts</h2>
            <span className="bg-orange-100 text-orange-700 text-sm px-2.5 py-0.5 rounded-full font-bold animate-pulse">
              {clientTimeoutProducts.length}
            </span>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            {clientTimeoutProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Không có đơn hàng nào bị ngâm quá hạn.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b border-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Product Info</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Held By (Client)</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientTimeoutProducts.map((timeoutItem) => (
                    <tr key={timeoutItem.productId || timeoutItem._id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <div 
                          className="flex items-center gap-4 cursor-pointer group" 
                          onClick={() => setSelectedBatch(timeoutItem)} 
                          title="Bấm để xem chi tiết sản phẩm"
                        >
                          <img src={timeoutItem.images && timeoutItem.images[0]} className="w-12 h-12 rounded-xl object-cover shadow-sm transition-transform group-hover:scale-105" alt="" />
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{timeoutItem.name}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{timeoutItem.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-mono tracking-tight">
                          {timeoutItem.owner}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={(e) => handleResolveTimeout(e, timeoutItem)}
                          className="bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 ml-auto shadow-sm"
                        >
                          <AlertCircle className="w-4 h-4" /> Force Claim
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
      <ProductDetailModal 
            isOpen={!!selectedBatch} 
            onClose={() => setSelectedBatch(null)} 
            product={selectedBatch} 
      />
    </div>
  );
};

export default BrandPortalPage;