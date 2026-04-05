import { useState,useEffect } from 'react';
import axios from 'axios';
import { useWallet } from '@solana/wallet-adapter-react';
import ProductDetailModal from '../components/ProductDetailModal';

import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProvider, getProgram, PROGRAM_ID } from '../utils/anchorSetup';
import { useLocation } from '../hooks/useLocation';
import { formatDateTime } from '../hooks/formatDate'; 
import { checkTimeoutCondition } from '../hooks/timeoutChecker';
import TransferCustodyCard from '../components/TransferCustodyCard';

export default function ProductionHubPage() {
  // --- STATE MANAGEMENT CHO FORM "INITIALIZE NEW BATCH" ---
    const [productName, setProductName] = useState('');
    const [description, setDescription] = useState('');
    const [priceSol, setPriceSol] = useState(0.00);
    const [isMinting, setIsMinting] = useState(false);

    // --- STATE MANAGEMENT CHO FORM "TRANSFER CUSTODY" ---
    const [transferProductId, setTransferProductId] = useState('');
    const [productImages, setProductImages] = useState([]);
    const [brandWallet, setBrandWallet] = useState("");
    const { currentLocation, fetchLocation } = useLocation();
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const { publicKey } = useWallet();

    const [activeFilter, setActiveFilter] = useState('all');
    const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected', 'purchased', 'in-transit', 'delivered', 'disputed'];

    const [myBatches, setMyBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    useEffect(()=>{
      console.log("value of wallet now: ",wallet);
    },[wallet]);

    const isValidWalletAddress = (addressString) => {
      try {
        const pubKey = new PublicKey(addressString);
        // isOnCurve đảm bảo đây là ví người dùng thật, không phải địa chỉ của Smart Contract
        return PublicKey.isOnCurve(pubKey.toBytes()); 
      } catch (error) {
        return false; // Nếu chuỗi vớ vẩn, sai độ dài, sai Base58 -> tự văng vào catch
      }
    };

    const handleResolveTimeout = async (e, batch, timeoutType) => {
    e.stopPropagation(); // Ngăn mở Modal chi tiết
    if (!publicKey) return alert("Vui lòng kết nối ví!");

    const confirmMsg = timeoutType === 'client_timeout'
      ? "Khách hàng đã giữ hàng quá 3 ngày mà không xác nhận. Bạn có chắc chắn muốn thu hồi tiền thanh toán?"
      : "Brand đã quá 7 ngày không phán xử. Bạn có chắc chắn muốn yêu cầu bồi thường?";

    if (!window.confirm(confirmMsg)) return;

    try {
      const provider = getProvider(wallet, connection);
      const program = getProgram(provider);

      // Chuẩn bị Public Keys
      const nsxPublicKey = new PublicKey(batch.manufacturerWallet);
      const buyerPublicKey = new PublicKey(batch.owner); // Ví của khách hàng
      const brandPublicKey = new PublicKey(batch.brandWallet);

      // Tính PDA
      const [productPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("PRODUCT_SEED"),
          nsxPublicKey.toBuffer(),
          Buffer.from(batch.productId)
        ],
        PROGRAM_ID
      );

      console.log("Đang gọi resolve_timeout cho PDA:", productPda.toBase58());

      // Gọi hàm từ IDL
      const tx = await program.methods
        .resolveTimeout()
        .accounts({
          caller: publicKey,
          product: productPda,
          buyerPubkey: buyerPublicKey,
          nsxPubkey: nsxPublicKey,
          brandPubkey: brandPublicKey
        })
        .rpc();

      alert("🎉 Yêu cầu thành công! Số dư đã được chuyển về ví của bạn.");
      
      // Optimistic Update: Chuyển trạng thái để ẩn nút đi
      setMyBatches((prevBatches) => 
        prevBatches.map((b) => 
          b.productId === batch.productId 
            ? { ...b, status: 'delivered' } // Hoặc trạng thái nào bạn quy định
            : b
        )
      );

    } catch (error) {
      console.error("Lỗi Resolve Timeout:", error);
      if (error.message.includes("NotYetTimeout")) {
         alert("Lỗi: Blockchain báo chưa đủ thời gian quá hạn!");
      } else {
         alert("Giao dịch thất bại: " + error.message);
      }
    }
  };

    

    // Tự động quét GPS ngay khi mở trang
    useEffect(() => {
        fetchLocation();
    }, [fetchLocation]);

    const handleMint = async (e) => {
      e.preventDefault();
      
      // 1. Validate dữ liệu đầu vào
      if (!productName || !description|| productImages.length === 0) {
        alert("Vui lòng điền đầy đủ thông tin và tải lên ít nhất 1 ảnh sản phẩm!");
        return;
      }
      if (!priceSol||Number(priceSol)<=0) {
        alert("Vui lòng nhập giá tiền là một số dương!");
        return;
      }

      if (!brandWallet||!isValidWalletAddress(brandWallet)) {
        alert("Địa chỉ ví không tồn tại hoặc không chính xác!");
        return;
      }

      if (!publicKey || !wallet) {
        alert("Vui lòng kết nối ví trước khi tạo lô hàng!");
        return;
      }

      setIsMinting(true);
      
      // Khởi tạo các giá trị băm ID (Giữ nguyên logic cực xịn của bạn)
      const timestamp = Date.now();
      const walletAddr = publicKey.toBase58();
      const rawString = `${walletAddr}_${PROGRAM_ID.toBase58()}_${timestamp}`;

      const msgBuffer = new TextEncoder().encode(rawString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const generatedProductId = `PRD-${hashHex.substring(0, 16).toUpperCase()}`; 

      try {
        // Gọi API với query productId bạn đã setup ở backend
        const checkRes = await axios.get(`https://authchain-v1.onrender.com/api/products?productId=${generatedProductId}`);
        if (checkRes.data.data && checkRes.data.data.length > 0) {
            alert(`Lỗi: Mã sản phẩm ${generatedProductId} đã tồn tại trong hệ thống! Vui lòng thử lại để tạo mã mới.`);
            setIsMinting(false); // Tắt hiệu ứng loading
            return; // CHẶN ĐỨNG QUÁ TRÌNH MINT
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra ID tồn tại:", error);
        alert("Lỗi kết nối máy chủ. Không thể xác minh ID sản phẩm.");
        setIsMinting(false);
        return;
      }

      try {
        // ==========================================
        // PHẦN A: BẮN GIAO DỊCH LÊN SMART CONTRACT
        // ==========================================

        
        const provider = getProvider(wallet, connection);
        console.log("value of provider now dit con me: ",provider);
        const program = getProgram(provider);

        // Tìm địa chỉ PDA cho Product
        const [productPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("PRODUCT_SEED"),
            publicKey.toBuffer(),
            Buffer.from(generatedProductId)
          ],
          PROGRAM_ID
        );


        // Chuyển giá từ SOL sang Lamports (nhân với 1 tỷ) để đưa vào Smart Contract
        const priceInLamports = new anchor.BN(parseFloat(priceSol) * 1e9);
        const brandPublicKey = new PublicKey(brandWallet); 
        const priceBN = new anchor.BN(priceInLamports);

        const tx = await program.methods
          .initProduct(generatedProductId, priceBN) // Truyền BN vào đây
          .accounts({
            nsx: publicKey,               // Ví NSX đang kết nối
            product: productPda,          // PDA đã tính ở trên
            brand: brandPublicKey,        // Đã chuyển thành PublicKey object
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        console.log("🔥 Đã Mint on-chain thành công! Tx Signature:", tx);

        // ==========================================
        // PHẦN B: LƯU THÔNG TIN & HÌNH ẢNH VÀO MONGODB
        // ==========================================
        const formData = new FormData();
        formData.append('productId', generatedProductId); 
        formData.append('name', productName);
        formData.append('description', description);
        formData.append('priceSol', priceSol);            
        formData.append('manufacturerWallet', publicKey.toBase58()); 
        formData.append('brandWallet', brandWallet);
        formData.append('txHash', tx);

        productImages.forEach(file => formData.append('images', file));

        const res = await axios.post(
            'https://authchain-v1.onrender.com/api/products/', 
            formData,
            { 
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'x-wallet-address': publicKey.toBase58() // 👉 NỘP THẺ TÊN CHO MIDDLEWARE KIỂM TRA
                } 
            }
        );
        
        alert(`Khởi tạo hàng thành công! \nTx: ${tx.substring(0, 15)}...`);
        
        // Reset form
        setProductName('');
        setDescription('');
        setPriceSol('');
        setProductImages([]);
        setBrandWallet('');
        fetchMyBatches();
        
      } catch (err) {
        console.error("Lỗi tạo sản phẩm:", err);
        // Bắt lỗi nếu người dùng từ chối ký trên Phantom
        if (err.message.includes("User rejected")) {
          alert("Bạn đã từ chối giao dịch trên ví.");
        } else {
          alert("Lỗi khi tạo sản phẩm: " + (err.response?.data?.message || err.message));
        }
      } finally {
        setIsMinting(false);
      }
    };

    // Hàm này giúp báo cho DriverPortal biết là component con đã giao xong
      const handleTransferDone = (transferredProductId) => {
          setMyBatches((prev) => prev.filter((item) => item.productId !== transferredProductId));
      };

    const fetchMyBatches = async () => {
      if (!publicKey) return;
      
      try {
        const walletStr = publicKey.toBase58();
        // Bắt buộc phải có chữ 'const' ở đây
        const res = await axios.get(`https://authchain-v1.onrender.com/api/products?manufacturerWallet=${walletStr}`);
        
        setMyBatches(res.data.data);
      } catch (err) {
        console.error("Lỗi lấy danh sách lô hàng:", err);
      }
  };

    useEffect(() => {
        fetchMyBatches();
    }, [publicKey]);

    const handleProductImageChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 5) {
        alert("Chỉ được upload tối đa 5 ảnh cho mỗi sản phẩm thôi nhé!");
        setProductImages(selectedFiles.slice(0, 5)); // Cắt lấy 5 cái đầu tiên
        } else {
        setProductImages(selectedFiles);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
        });
    };
    const renderStatusBadge = (status) => {
        switch (status) {
        case 'approved':
            return <span className="absolute top-4 right-4 bg-blue-100 text-blue-700 rounded-full px-3 py-1 font-semibold text-xs flex items-center gap-1.5 shadow-sm"><span>✓</span> Verified & Ready</span>;
        case 'pending':
            return <span className="absolute top-4 right-4 bg-amber-100 text-amber-700 rounded-full px-3 py-1 font-semibold text-xs flex items-center gap-1.5 shadow-sm"><span>⏳</span> Pending Review</span>;
        case 'rejected':
            return <span className="absolute top-4 right-4 bg-red-100 text-red-700 rounded-full px-3 py-1 font-semibold text-xs flex items-center gap-1.5 shadow-sm"><span>✕</span> Rejected</span>;
        case 'delivered':
            return <span className="absolute top-4 right-4 bg-green-100 text-green-700 rounded-full px-3 py-1 font-semibold text-xs flex items-center gap-1.5 shadow-sm"><span>📦</span> Delivered</span>;
        case 'in-transit':
            return <span className="absolute top-4 right-4 bg-purple-100 text-purple-700 rounded-full px-3 py-1 font-semibold text-xs flex items-center gap-1.5 shadow-sm"><span>🚚</span> In Transit</span>;
        case 'purchased':
            return <span className="absolute top-4 right-4 bg-indigo-100 text-indigo-700 rounded-full px-3 py-1 font-semibold text-xs flex items-center gap-1.5 shadow-sm"><span>🛒</span> Purchased</span>;
        case 'disputed':
            return <span className="absolute top-4 right-4 bg-orange-100 text-orange-700 rounded-full px-3 py-1 font-semibold text-xs flex items-center gap-1.5 shadow-sm"><span>⚠️</span> Disputed</span>;
        
        default:
            return <span className="absolute top-4 right-4 bg-gray-100 text-gray-700 rounded-full px-3 py-1 font-semibold text-xs shadow-sm">Unknown</span>;
        }
    };

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-6">
      {/* --- HEADER: TIÊU ĐỀ TRANG --- */}
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-gray-950 flex items-center gap-4 mb-2">
          <span className="p-3 bg-purple-100 rounded-3xl text-3xl text-purple-600">🏭</span>
          Production Hub
        </h1>
        <p className="text-gray-600 text-lg ml-16 max-w-2xl">Initialize batches and manage logistics handoffs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,2.5fr] gap-8">
        
        {/* --- CỘT TRÁI: FORM INITIALIZE NEW BATCH (Tái tạo image_3.png) --- */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm sticky top-24 h-fit">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-purple-600 text-3xl font-bold">+</span>
            <h2 className="text-2xl font-bold text-gray-900">Initialize New Batch</h2>
          </div>
          <p className="text-sm text-gray-500 mb-8 italic">Mint new products to the blockchain for brand verification.</p>

          <form onSubmit={handleMint} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Product Name</label>
              <input 
                type="text" 
                placeholder="e.g., Artisan Honey Batch #4"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Brand Wallet</label>
              <input 
                type="text" 
                placeholder="e.g., 7aT8... (Solana Wallet Address)"
                value={brandWallet}
                onChange={(e) => setBrandWallet(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Description</label>
              <textarea 
                rows="4"
                placeholder="Detailed description of the item..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Product Images</label>
              <div className="relative group cursor-pointer">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={handleProductImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center group-hover:border-blue-400 transition-colors bg-gray-50">
                  <div className="text-3xl mb-2">📸</div>
                  <p className="text-sm text-gray-500 font-medium">Kéo thả hoặc nhấn để chọn ảnh sản phẩm</p>
                  <p className="text-xs text-gray-400 mt-1">Hỗ trợ JPG, PNG. Đăng tối đa 5 góc chụp.</p>
                  
                  {/* Hiển thị tên các file đã chọn */}
                  {productImages.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {productImages.map((f, i) => (
                        <span key={i} className="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-md font-bold uppercase truncate max-w-[100px]">
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Price (SOL)</label>
              <div className="relative">
                <input 
                  type="number" 
                  placeholder="0.00"
                  step="0.01"
                  value={priceSol}
                  onChange={(e) => setPriceSol(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400 font-bold">◎</span>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isMinting}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 disabled:opacity-50"
            >
              <span className="text-lg">🔁</span>
              {isMinting ? 'Đang Mint trên Blockchain...' : 'Mint & Request Verification'}
            </button>
          </form>
        </div>

        {/* --- CỘT PHẢI: TRANSFER CARD & OVERVIEW GRID --- */}
        <div className="space-y-10">
          {/* --- CARD: TRANSFER CUSTODY (Handoff) --- */}
          <TransferCustodyCard 
              inventory={myBatches} 
              onTransferSuccess={handleTransferDone} 
          />

          <div>
            {/* --- HEADER: TIÊU ĐỀ TRÊN, FILTER DƯỚI --- */}
            {/* Đổi flex-row thành flex-col để chúng tự động xuống hàng */}
            <div className="flex flex-col gap-4 mb-8"> 
              <h2 className="text-3xl font-bold text-gray-950">My Batches Overview</h2>
              
              {/* Thanh Button Filter trượt ngang */}
              <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                {STATUS_FILTERS.map((status) => (
                  <button
                    key={status}
                    onClick={() => setActiveFilter(status)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-all duration-200 ${
                      activeFilter === status 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 transform scale-105' 
                        : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-900' 
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            
            {/* --- DANH SÁCH SẢN PHẨM --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {myBatches
                .filter(batch => activeFilter === 'all' || batch.status === activeFilter)
                .map(batch => {
                  // 👉 Kiểm tra xem đơn hàng này có bị quá hạn không
                  const timeoutType = checkTimeoutCondition(batch);

                  return (
                    /* --- BATCH CARD --- */
                    <div 
                      key={batch.productId || batch._id} 
                      onClick={() => setSelectedBatch(batch)} 
                      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1 relative"
                    >
                      {/* PHẦN ẢNH VÀ BADGE */}
                      <div className="relative aspect-[1/1] overflow-hidden bg-gray-50">
                        <img 
                          src={batch.images && batch.images.length > 0 ? batch.images[0] : 'https://via.placeholder.com/400'} 
                          alt={batch.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        {renderStatusBadge(batch.status)}
                        <span className="absolute bottom-4 left-4 bg-black/70 text-white rounded-full px-4 py-1.5 font-bold text-sm shadow-sm backdrop-blur-sm">
                          ◎ {Number(batch.priceSol).toFixed(2)} SOL
                        </span>
                      </div>

                      {/* PHẦN THÔNG TIN CƠ BẢN */}
                      <div className="p-5 flex-grow flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{batch.name}</h3>
                        <p className="text-xs text-gray-400 font-mono mb-3">ID: {batch.productId}</p>
                        <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-50">
                          <span className="text-xs text-gray-500 font-medium">📅 {formatDateTime(batch.createdAt)}</span>
                          <span className="text-blue-600 font-bold text-xs group-hover:underline">Chi tiết →</span>
                        </div>
                      </div>

                      {/* 👉 NÚT GET MONEY (CHỈ HIỆN KHI QUÁ HẠN) */}
                      {timeoutType && (
                        <div className="px-5 pb-5 pt-2 border-t border-red-50 bg-red-50/30">
                          <button 
                            onClick={(e) => handleResolveTimeout(e, batch, timeoutType)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-red-200 animate-pulse hover:animate-none"
                          >
                            <span className="text-lg">🚨</span>
                            {timeoutType === 'client_timeout' ? 'Force Claim (Client Timeout)' : 'Force Claim (Brand Timeout)'}
                          </button>
                        </div>
                      )}

                    </div>
                  );
              })}
            </div>

            {/* Empty State */}
            {myBatches.filter(batch => activeFilter === 'all' || batch.status === activeFilter).length === 0 && (
              <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200 mt-6">
                <p className="text-gray-500">Không có sản phẩm nào ở trạng thái này.</p>
              </div>
            )}
          </div>
            <ProductDetailModal 
                isOpen={!!selectedBatch} 
                onClose={() => setSelectedBatch(null)} 
                product={selectedBatch} 
            />
        </div>
      </div>
      {loading && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
              <p className="text-purple-900 font-bold animate-pulse">
                  Đang xác thực chữ ký & Chuyển giao hàng...
              </p>
              <p className="text-xs text-gray-500 mt-2">Vui lòng không đóng trình duyệt</p>
          </div>
      )}
    </div>
  );
}