import { useState, useEffect } from 'react';
import axios from 'axios';
import ProductDetailModal from '../components/ProductDetailModal';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProvider, getProgram, PROGRAM_ID } from '../utils/anchorSetup';

export default function HomePage() {
  // Quản lý tab hiện tại: mặc định là 'approved' (Verified & Ready)
  const [activeTab, setActiveTab] = useState('approved');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  // Hàm rút gọn ví (VD: 5A2b...9zX1)
  const shortenWallet = (wallet) => {
    if (!wallet) return 'Unknown';
    if (wallet.length < 10) return wallet;
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { publicKey } = useWallet();
  const [user,setUser]=useState(null);
  const handleBuyNow = async (e, productData) => {
    // 1. Ngăn chặn việc mở Modal chi tiết sản phẩm
    e.stopPropagation();

    if (!publicKey) {
      alert("Vui lòng kết nối ví Phantom!");
      return;
    }

    try {
      const provider = getProvider(wallet, connection);
      const program = getProgram(provider);

      // Chuyển đổi productId (string) từ DB/Frontend sang PublicKey của Solana
      // Giả sử productData.pdaAddress là địa chỉ Account Product trên chuỗi
      const nsxPublicKey = new PublicKey(productData.manufacturerWallet);

      // 2. Derive lại PDA dựa trên đúng bộ seeds
      const [productPda] = PublicKey.findProgramAddressSync(
          [
              Buffer.from("PRODUCT_SEED"),        // 1. Phải khớp chính xác với lib.rs
              nsxPublicKey.toBuffer(),           // 2. Public Key của người TẠO sản phẩm
              Buffer.from(productData.productId)  // 3. Chuỗi "PRD-..." lấy từ DB
          ],
          PROGRAM_ID
      );

      // 2. Gọi Smart Contract
      const txHash = await program.methods
        .buyProduct() // Tên function trong lib.rs (viết theo camelCase)
        .accounts({
          buyer: publicKey,                // Người đang kết nối ví
          product: productPda,             // Account Product cần update status
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Giao dịch thành công! Signature:", txHash);
      setProducts((prevProducts) => 
            prevProducts.filter((p) => p.productId !== productData.productId)
      );

        alert("Chúc mừng! Bạn đã mua hàng thành công.");

      // 3. Cập nhật lại UI hoặc gọi API Backend để đồng bộ database
      // window.location.reload(); 

    } catch (error) {
        if (error.message.includes("SelfPurchaseNotAllowed")) {
            alert("Lỗi: Bạn là Nhà sản xuất/Brand, bạn không thể tự mua hàng của mình!");
        } else if (error.message.includes("CustodianCannotBuy")) {
            alert("Lỗi: Bạn đang là người vận chuyển kiện hàng này, không thể tự mua!");
        } else {
            alert("Giao dịch thất bại: " + error.message);
        }
    }
  };

  const shortenId = (id) => {
    if (!id) return 'N/A';
    // Xóa chữ PRD- cũ (nếu có) để lấy phần mã băm, sau đó cắt 8 ký tự và gắn PRD- lại
    const cleanId = id.replace('PRD-', '');
    return `PRD-${cleanId.substring(0, 8)}`; 
  };

  // Gọi API mỗi khi activeTab thay đổi
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Gọi API và truyền thẳng status vào query (approved hoặc pending)
        const res = await axios.get(`https://authchain-v1.onrender.com/api/products?status=${activeTab}`);
        setProducts(res.data.data);
      } catch (err) {
        console.error("Lỗi lấy danh sách Marketplace:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [activeTab]);


  useEffect(()=>{
    const fetchUser=async()=>{
      if (!publicKey) return;
      const res = await axios.post('https://authchain-v1.onrender.com/api/users/auth', { 
        walletAddress: publicKey.toBase58() 
      });
      if (!res.data.data) {
        alert("Đã có lỗi xảy ra với wallet này!");
        return;
      }
      setUser(res.data.data); 
    }
    fetchUser();
  },[wallet]);

  return (
    <div className="max-w-[1200px] mx-auto py-12 px-6">
      
      {/* --- HERO SECTION --- */}
      <div className="text-center mt-8 mb-16 animate-fade-in">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Verified <span className="text-blue-600">On-Chain</span> Authenticity
        </h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
          Shop a curated collection of artisanal and high-value physical goods. Every item is cryptographically tracked from maker to your doorstep.
        </p>
      </div>

      {/* --- TABS NAVIGATION --- */}
      <div className="flex gap-8 border-b border-gray-200 mb-10">
        <button
          onClick={() => setActiveTab('approved')}
          className={`pb-4 text-base font-bold flex items-center gap-2 transition-colors relative ${
            activeTab === 'approved' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span className="text-xl">📦</span> Verified & Ready
          {activeTab === 'approved' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-md"></span>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-4 text-base font-bold flex items-center gap-2 transition-colors relative ${
            activeTab === 'pending' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span className="text-xl">🕒</span> Coming Soon
          {activeTab === 'pending' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-md"></span>
          )}
        </button>
      </div>

      {/* --- GRID HIỂN THỊ SẢN PHẨM --- */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 font-medium">Đang tải dữ liệu từ Blockchain...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              /* --- PRODUCT CARD --- */
              <div 
                key={product.productId || product._id} 
                onClick={() => setSelectedProduct(product)}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              >
                
                {/* Ảnh và Badges */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                  <img 
                    src={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/400'} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  
                  {/* Badge Verified (Chỉ hiện ở tab approved) */}
                  {activeTab === 'approved' && (
                    <span className="absolute top-3 right-3 bg-white text-blue-700 rounded-full px-3 py-1 font-bold text-xs flex items-center gap-1.5 shadow-md">
                      <span className="text-blue-500">✓</span> Verified & Ready
                    </span>
                  )}
                  {/* Badge Pending (Chỉ hiện ở tab pending) */}
                  {activeTab === 'pending' && (
                    <span className="absolute top-3 right-3 bg-white text-amber-600 rounded-full px-3 py-1 font-bold text-xs flex items-center gap-1.5 shadow-md">
                      <span>⏳</span> Minting...
                    </span>
                  )}
                  
                  {/* Badge Giá (Màu trắng chữ đen như trong thiết kế) */}
                  <span className="absolute bottom-3 left-3 bg-white text-gray-900 rounded-full px-4 py-1.5 font-bold text-sm shadow-md">
                    ◎ {Number(product.priceSol).toFixed(2)} SOL
                  </span>
                </div>

                {/* Nội dung thông tin */}
                <div className="p-5 flex-grow flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{product.name}</h3>
                  <p className="text-sm text-gray-500 mb-6 line-clamp-2 leading-relaxed flex-grow">
                    {product.description}
                  </p>
                  
                  {/* Dòng Wallet và ID */}
                  <div className="flex flex-col gap-2 mb-5"> 
                    {/* Dòng 1: Wallet của nhà sản xuất */}
                    <span className="text-xs text-gray-400 font-mono">
                      By: {shortenWallet(product.manufacturerWallet)}
                    </span>
                    
                    {/* Dòng 2: ID sản phẩm (Tự động xuống dòng nhờ flex-col) */}
                    <div className="flex"> {/* Bọc div để cái Badge tím không bị kéo dài hết chiều ngang */}
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-md uppercase tracking-wide">
                        ID: {shortenId(product.productId)}
                      </span>
                    </div>
                  </div>

                  {/* Nút Mua (Đổi text dựa theo tab) */}
                  <button 
                    disabled={activeTab !== 'approved' || user?.currentRole !== 'client'}
                    onClick={(e) => handleBuyNow(e, product)}
                    className={`w-full font-bold py-3.5 rounded-xl transition-colors ${
                      activeTab === 'approved' && user?.currentRole === 'client'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {user?.currentRole !== 'client' 
                      ? 'Clients Only' // Hoặc 'Chỉ dành cho Khách hàng'
                      : activeTab === 'approved' 
                        ? 'Buy Now' 
                        : 'Not Yet Available'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Hiển thị khi không có sản phẩm */}
          {products.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200 mt-6">
              <span className="text-4xl mb-3 block">🛍️</span>
              <p className="text-gray-500 font-medium">
                {activeTab === 'approved' 
                  ? "Chưa có sản phẩm nào được mở bán." 
                  : "Không có lô hàng nào đang chờ duyệt."}
              </p>
            </div>
          )}
        </>
      )}
    <ProductDetailModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct} 
    />
    </div>
  );
}