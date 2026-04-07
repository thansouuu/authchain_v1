import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';

export default function MainLayout() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { connection } = useConnection();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isReady, setIsReady] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [balanceSol, setBalanceSol] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  const prevPublicKey = useRef(publicKey?.toBase58());

  // 1. Theo dõi trạng thái ví: Bắt sự kiện đổi ví / ngắt kết nối
  useEffect(() => {
    const currentKey = publicKey?.toBase58();

    if (prevPublicKey.current && currentKey && prevPublicKey.current !== currentKey) {
      console.log("🚨 Đổi ví! Chuyển về trang chủ và Reload...");
      navigate('/');
      window.location.reload(); // Ép F5 bằng code luôn cho mượt
      return; 
    }

    if (currentKey) {
      prevPublicKey.current = currentKey;
    }
  }, [publicKey, navigate]);

  // 👉 BẢO VỆ ROUTE CHIẾN LƯỢC: KICK RA NGOÀI NẾU SAI QUYỀN HOẶC F5 BẰNG VÍ KHÁC
  useEffect(() => {
    // Đợi có role rồi mới kiểm tra
    if (!userRole) return; 

    const path = location.pathname;
    
    // Nếu đang đứng ở trang Manufacturer mà role không phải manufacturer -> Cút về trang chủ
    if (path.startsWith('/manufacturer') && userRole !== 'manufacturer') {
      navigate('/');
    } 
    // Tương tự cho Brand
    else if (path.startsWith('/brand') && userRole !== 'brand') {
      navigate('/');
    } 
    // Tương tự cho Driver
    else if (path.startsWith('/driver') && userRole !== 'driver') {
      navigate('/');
    }
  }, [userRole, location.pathname, navigate]);


  // 2. Khoảng nghỉ (Grace Period) đợi Phantom sẵn sàng
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // 3. Logic chính: Xử lý Routing, Lấy số dư Real-time và Xác thực Role
  useEffect(() => {
    if (connecting || !isReady) return;
    
    // Kịch bản A: Chưa kết nối ví
    if (!publicKey) {
      setBalanceSol(null);
      setUserRole(null);
      setIsDropdownOpen(false);
      
      if (location.pathname !== '/') {
        console.log("Không có ví, điều hướng về trang chủ...");
        navigate('/');
      }
      return;
    }

    // Kịch bản B: Ví đã kết nối
    const walletAddress = publicKey.toBase58();

    // --- Tác vụ 1: Lấy số dư và Lắng nghe biến động (Real-time) ---
    // Lấy số dư lần đầu tiên
    connection.getBalance(publicKey)
      .then((lamports) => {
        setBalanceSol((lamports / LAMPORTS_PER_SOL).toFixed(4));
      })
      .catch((error) => {
        console.error("Lỗi khi đọc số dư từ blockchain:", error);
        setBalanceSol('0.0000');
      });

    // Bật "Máy nghe lén" theo dõi số dư ví nhảy liên tục
    const subscriptionId = connection.onAccountChange(
      publicKey,
      (updatedAccountInfo) => {
        console.log("Cập nhật số dư Real-time!");
        setBalanceSol((updatedAccountInfo.lamports / LAMPORTS_PER_SOL).toFixed(4));
      },
      'confirmed'
    );

    // --- Tác vụ 2: Lấy Role từ Backend ---
    const authenticateWallet = async () => {
      try {
        const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'https://authchain-v1.onrender.com/api';
        const response = await axios.post(`${apiUrl}/users/auth`, {
            walletAddress: walletAddress
        });

        if (response.data && response.data.data.currentRole) {
          setUserRole(response.data.data.currentRole);
        } else {
          setUserRole('client'); 
        }
      } catch (error) {
        console.error("Lỗi kết nối Backend:", error);
        setUserRole('client');
      }
    };

    authenticateWallet();

    // Dọn dẹp máy nghe lén khi component unmount hoặc đổi ví
    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };

  }, [publicKey, connecting, isReady, connection, location.pathname, navigate]);

  // Xử lý chuỗi ví hiển thị
  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey]);
  const content = useMemo(() => {
    if (!base58) return null;
    return `${base58.slice(0, 6)}...${base58.slice(-4)}`;
  }, [base58]);

  // Đóng dropdown khi click ra ngoài
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 p-4 px-8 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-10">
          <Link to="/" className="text-3xl font-extrabold text-blue-700 tracking-tight">
            AuthChain
          </Link>
          
          <nav className="md:flex gap-6 font-semibold text-gray-700">
            {/* MENU 1: MARKETPLACE */}
            <Link 
              to="/" 
              className={`hover:text-blue-600 flex items-center gap-2 transition-colors ${location.pathname === '/' ? 'text-blue-600' : ''}`}
            >
              <span className="text-xl">🏪</span> Marketplace
            </Link>
            
            {/* MENU 2: CLIENT PORTAL */}
            {userRole === 'client' && (
              <Link 
                to="/client" 
                className={`hover:text-blue-600 flex items-center gap-2 transition-colors ${location.pathname === '/client' ? 'text-blue-600' : ''}`}
                title="Tính năng đang được xây dựng"
              >
                <span className="text-xl">🛍️</span> Client Portal 
              </Link>
            )}

            {/* MENU 3: MANUFACTURER PORTAL */}
            {userRole === 'manufacturer' && (
              <Link 
                to="/manufacturer" 
                className={`hover:text-blue-600 flex items-center gap-2 transition-colors ${location.pathname === '/manufacturer' ? 'text-blue-600' : ''}`}
              >
                <span className="text-xl">🏭</span> Manufacturer Portal
              </Link>
            )}

            {/* MENU 4: BRAND OWNER PORTAL */}
            {userRole === 'brand' && (
              <Link 
                to="/brand" 
                className={`hover:text-blue-600 flex items-center gap-2 transition-colors ${location.pathname === '/brand' ? 'text-blue-600' : ''}`}
              >
                <span className="text-xl">🛡️</span> Brand Owner Portal
              </Link>
            )}

            {/* MENU 5: DRIVER PORTAL */}
            {userRole === 'driver' && (
              <Link 
                to="/driver" 
                className={`hover:text-blue-600 flex items-center gap-2 transition-colors ${location.pathname === '/driver' ? 'text-blue-600' : ''}`}
              >
                <span className="text-xl">🚚</span> Driver Portal
              </Link>
            )}
          </nav>
        </div>

        <div className="relative" ref={dropdownRef}>
          {!publicKey ? (
            <WalletMultiButton />
          ) : (
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
              className="bg-white border border-gray-200 text-gray-900 pl-3 pr-5 py-2 rounded-2xl font-semibold flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center">
                <span className="text-purple-600 font-bold text-xl">W</span>
              </div>
              
              <div className="flex flex-col items-start leading-tight">
                <span className="text-sm font-medium text-gray-500">{content}</span>
                <span className="text-base font-bold text-gray-900">{balanceSol} SOL</span>
              </div>
            </button>
          )}

            {isDropdownOpen && publicKey && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50">
                    <Link 
                        to="/profile" 
                        onClick={() => setIsDropdownOpen(false)} 
                        className="flex items-center w-full text-left p-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg mb-1 transition-colors"
                        >
                        <span className="mr-2">👤</span> View Profile
                    </Link>

                    <button 
                        onClick={() => { disconnect(); setIsDropdownOpen(false); }} 
                        className="flex items-center w-full text-left p-2 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors"
                        >
                        <span className="mr-2">🚪</span> Sign Out
                    </button>
                </div>
            )}
        </div>
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
}