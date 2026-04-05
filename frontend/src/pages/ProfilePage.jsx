import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const [user, setUser] = useState('client');
  const [loading, setLoading] = useState(false);
    
    // State cho Form
  const [businessName, setBusinessName] = useState('');
  const [requestedRole, setRequestedRole] = useState('client');
  const [files, setFiles] = useState([]);
    // Danh sách đầy đủ các role trong hệ thống của bạn
  const availableRoles = [
        { value: 'client', label: 'Client (Người dùng)' },
        { value: 'manufacturer', label: 'Manufacturer (Nhà sản xuất)' },
        { value: 'brand', label: 'Brand Owner (Chủ thương hiệu)' },
        { value: 'driver', label: 'Driver (Tài xế vận chuyển)' }
  ];

    // Lọc bỏ role hiện tại của user
  const filteredRoles = availableRoles.filter(role => role.value !== user.currentRole);
  useEffect(() => {
    if (filteredRoles.length > 0) {
      setRequestedRole(filteredRoles[0].value);
    }
  }, [user]);
  useEffect(() => {
    if (publicKey) {
      fetchUserInfo();
    }
  }, [publicKey]);

  const fetchUserInfo = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/users/auth', { 
        walletAddress: publicKey.toBase58() 
      });
      const userData = res.data.data;
      setUser(userData); 
    } catch (err) {
      console.error("Lỗi lấy thông tin user. Chi tiết:", err);
    }
  };

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (requestedRole !=="client") {
          if (!businessName || files.length === 0) {
              alert("Vui lòng nhập tên doanh nghiệp và đính kèm minh chứng!");
              return;
          }
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('businessName', businessName);
        formData.append('requestedRole', requestedRole);

        // --- SỬA Ở ĐÂY: Tên trường phải là 'proofImages' cho khớp với upload.array ---
        files.forEach(file => formData.append('proofImages', file));

        try {
            const walletAddress = publicKey.toBase58();
            
            // --- SỬA Ở ĐÂY: Đảo walletAddress ra trước theo đúng router.post của bạn ---
            const res = await axios.post(
              `http://localhost:5000/api/users/${walletAddress}/request-role`, 
              formData,
              { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            
            alert(res.data.message);
            fetchUserInfo(); 
        } catch (err) {
            console.error(err);
            alert("Gửi yêu cầu thất bại! Kiểm tra lại Console nhé.");
        } finally {
            setLoading(false);
        }
    };

  if (!publicKey) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-gray-500">
      <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      <p className="text-xl font-semibold">Vui lòng kết nối ví để xem hồ sơ</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CỘT TRÁI: THÔNG TIN VÍ */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-24">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-2xl">👤</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">User Profile</h2>
            <p className="text-sm text-gray-500 mb-6 font-mono break-all">{publicKey.toBase58()}</p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-xs font-bold text-gray-400 uppercase">Current Role</span>
                <span className="text-xs font-bold px-3 py-1 bg-blue-600 text-white rounded-lg uppercase">
                  {user.currentRole || 'Client'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: FORM REQUEST */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Xin cấp quyền đối tác</h3>
            <p className="text-gray-500 mb-8 italic">Đăng ký để trở thành Nhà sản xuất hoặc Chủ thương hiệu trên AuthChain.</p>

            {/* TRẠNG THÁI ĐANG CHỜ DUYỆT */}
            {user?.roleRequest?.status === "pending" && (
              // Thêm mb-8 ở thẻ div dưới đây để tạo khoảng cách với form bên dưới
              <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl mb-8">
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-2xl mt-1">⏳</span>
                  <div>
                    <h4 className="font-bold text-amber-800">Yêu cầu đang chờ xử lý</h4>
                    <p className="text-sm text-amber-700">Bạn đã gửi yêu cầu cho vai trò <strong className="uppercase">{user.roleRequest.requestedRole}</strong>. Hệ thống đang xác thực hồ sơ doanh nghiệp của bạn.</p>
                  </div>
                </div>
                
                {/* HIỂN THỊ TÊN DOANH NGHIỆP VÀ ẢNH MINH CHỨNG */}
                <div className="ml-12 p-4 bg-white/60 rounded-xl border border-amber-100/50">
                  <p className="text-sm text-amber-900 mb-3">
                    <span className="font-bold uppercase text-xs text-amber-700 mr-2">Doanh nghiệp:</span> 
                    {user.roleRequest.businessName}
                  </p>
                  
                  {user.roleRequest.proofImages?.length > 0 && (
                    <div>
                      <span className="font-bold uppercase text-xs text-amber-700 block mb-2">Tài liệu đã nộp:</span>
                      <div className="flex gap-3 overflow-x-auto">
                        {user.roleRequest.proofImages.map((img, idx) => (
                          <a key={idx} href={img} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-amber-200 hover:border-amber-400 flex-shrink-0">
                            <img src={img} alt={`proof-${idx}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {requestedRole !== 'client' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Tên Doanh Nghiệp</label>
                      <input 
                        type="text" 
                        placeholder="VD: Kẹo Dừa Bến Tre Co."
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Vai Trò Mong Muốn</label>
                    <div className="relative">
                        <select 
                            value={requestedRole}
                            onChange={(e) => setRequestedRole(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                        >
                            {filteredRoles.map((role) => (
                            <option key={role.value} value={role.value}>
                                {role.label}
                            </option>
                            ))}
                        </select>
                        
                        {/* Thêm một cái icon mũi tên nhỏ bên phải vì ta dùng appearance-none */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                        </div>
                  </div>
                </div>

                {/* UPLOAD AREA */}
                {requestedRole !== 'client' && (
                  <div className="mt-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Minh chứng (Giấy phép/Hình ảnh xưởng)</label>
                    <div className="relative group cursor-pointer">
                      <input 
                        type="file" 
                        multiple 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center group-hover:border-blue-400 transition-colors bg-gray-50">
                        <div className="text-4xl mb-2">📂</div>
                        <p className="text-sm text-gray-500 font-medium">Chọn tài liệu xác minh</p>
                        {files.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2 justify-center">
                            {Array.from(files).map((f, i) => (
                              <span key={i} className="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-md font-bold uppercase">{f.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-3xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 disabled:opacity-50"
                >
                  {loading ? 'Hệ thống đang xử lý...' : 'GỬI ĐƠN XÁC THỰC'}
                </button>
              </form>
           
          </div>
        </div>
      </div>
    </div>
  );
}