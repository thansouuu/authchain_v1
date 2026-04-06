import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
// Thêm 2 thư viện này
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
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500); // 500ms là đủ để Phantom "thức dậy"
    return () => clearTimeout(timer);
  }, []);
  // Xử lý logic Role và RAM
  useEffect(() => {
    if (connecting || !isReady) return;
    if (!publicKey) {
      setBalanceSol(null);
      setUserRole(null);
      setIsDropdownOpen(false);
      
      if (location.pathname !== '/') {
        console.log("Quyết định cuối cùng: Không có ví, về trang chủ thôi!");
        navigate('/');
      }
      return;
    }

    // 2. Kịch bản: Ví đã kết nối
    const walletAddress = publicKey.toBase58();

    // Tác vụ A: Lấy số dư thật từ mạng lưới Solana (Devnet)
    const fetchRealBalance = async () => {
      try {
        // Gọi RPC xin dữ liệu số dư (tính bằng lamports)
        const lamports = await connection.getBalance(publicKey);
        // Quy đổi ra SOL và làm tròn 4 chữ số thập phân cho đẹp giao diện
        const sol = lamports / LAMPORTS_PER_SOL;
        setBalanceSol(sol.toFixed(4));
      } catch (error) {
        console.error("Lỗi khi đọc số dư từ blockchain:", error);
        setBalanceSol('0.00');
      }
    };

    // Tác vụ B: Gửi ví xuống Backend để kiểm tra Database
    const authenticateWallet = async () => {
      try {
        // Đảm bảo URL này khớp với Route bạn đã viết bên Node.js
        const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'https://authchain-v1.onrender.com/api';
        
        const response = await axios.post(`${apiUrl}/users/auth`, {
            walletAddress: walletAddress
        });

        // Backend trả về thông tin user, ta trích xuất role để phân quyền Header
        if (response.data && response.data.data.currentRole) {
          setUserRole(response.data.data.currentRole);
        } else {
          // Nếu ví mới tinh chưa có trên DB, mặc định gán quyền client
          setUserRole('client'); 
        }
      } catch (error) {
        console.error("Lỗi kết nối Backend:", error);
        // Fallback an toàn nếu backend chết
        setUserRole('client');
      }
    };

    // Kích hoạt chạy song song 2 luồng dữ liệu
    fetchRealBalance();
    authenticateWallet();

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
            // Dùng nút chuẩn của thư viện, KHÔNG override class Tailwind để tránh liệt nút
            <WalletMultiButton />
          ) : (
            // Custom UI Dropdown khi đã connect
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
                    
                    {/* BIẾN NÚT NÀY THÀNH THẺ LINK */}
                    <Link 
                        to="/profile" 
                        onClick={() => setIsDropdownOpen(false)} // Bấm xong phải đóng menu lại cho chuyên nghiệp
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