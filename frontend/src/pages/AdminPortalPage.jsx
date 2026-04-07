import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWallet } from '@solana/wallet-adapter-react';
import { ShieldAlert, CheckCircle, XCircle, UserCog, Loader2 } from 'lucide-react';
import bs58 from 'bs58';

const ADMIN_WALLET = "GH85GXm9GTopqbAwTXyhuQgQzE2pS2JAwsyaqydfRfhn";

export default function AdminPortalPage() {
    // Lấy thêm hàm signMessage
    const { publicKey, connected, signMessage } = useWallet();
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    const isAdmin = publicKey?.toBase58() === ADMIN_WALLET;

    const fetchRequests = async () => {
        if (!isAdmin) return;
        try {
            setLoading(true);
            const res = await axios.get('https://authchain-v1.onrender.com/api/users/role-requests');
            if (res.data && res.data.data) {
                setPendingRequests(res.data.data);
            }
        } catch (error) {
            console.error("Lỗi lấy danh sách:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [publicKey, isAdmin]);

    const handleProcessRequest = async (walletAddress, action) => {
        const actionText = action === 'approve' ? 'PHÊ DUYỆT' : 'TỪ CHỐI';
        if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} yêu cầu của ví này?`)) return;

        try {
            setProcessingId(walletAddress);
            
            // --- BƯỚC BẢO MẬT: YÊU CẦU KÝ TIN NHẮN ---
            if (!signMessage) {
                throw new Error("Ví của bạn không hỗ trợ tính năng ký xác thực!");
            }
            
            // Thông báo trên UI để Admin chuẩn bị bấm ví
            alert(`Vui lòng xác nhận chữ ký trên ví Phantom để ${actionText}.`);

            const messageString = `admin_action_${action}_${walletAddress}`;
            const messageEncoded = new TextEncoder().encode(messageString);
            
            // Hiện popup ví
            const signatureBytes = await signMessage(messageEncoded);
            const signatureBase58 = bs58.encode(signatureBytes);

            // Gửi dữ liệu kèm chữ ký xuống Backend
            const res = await axios.patch(
                `https://authchain-v1.onrender.com/api/users/${walletAddress}/process-request`, 
                { 
                    action: action,
                    adminAddress: publicKey.toBase58(),
                    signature: signatureBase58
                }
            );

            alert(`✅ Thành công: ${res.data.message}`);
            setPendingRequests(prev => prev.filter(req => req.walletAddress !== walletAddress));

        } catch (error) {
            console.error("Lỗi xử lý yêu cầu:", error);
            
            // Bắt lỗi nếu người dùng bấm Cancel trên popup ví Phantom
            if (error.message?.includes('User rejected')) {
                alert("❌ Thất bại: Bạn đã hủy thao tác ký xác nhận.");
            } else {
                const errorMsg = error.response?.data?.message || error.message || "Lỗi hệ thống, vui lòng thử lại.";
                alert(`❌ Thất bại: ${errorMsg}`);
            }
        } finally {
            setProcessingId(null);
        }
    };

    if (!connected) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <UserCog className="w-16 h-16 text-blue-500 mb-4 animate-bounce" />
                <h1 className="text-xl font-bold text-gray-700">Vui lòng kết nối ví Admin</h1>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <ShieldAlert className="w-20 h-20 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900">Truy cập bị từ chối</h1>
                <p className="text-gray-500">Ví {publicKey?.toBase58().slice(0, 6)}... không có quyền Admin.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-12 px-6 min-h-screen">
            <div className="mb-10 flex items-center gap-4">
                <div className="p-4 bg-slate-900 rounded-2xl">
                    <UserCog className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-950">System Admin Portal</h1>
                    <p className="text-gray-500 font-medium">Quản lý và phê duyệt yêu cầu chuyển đổi Role.</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Pending Role Requests</h2>
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
                        {pendingRequests.length} đơn chờ duyệt
                    </span>
                </div>

                {loading ? (
                    <div className="p-20 text-center text-gray-400 flex flex-col items-center">
                         <Loader2 className="w-10 h-10 animate-spin mb-4" />
                         <p className="font-bold text-lg">Đang tải dữ liệu...</p>
                    </div>
                ) : pendingRequests.length === 0 ? (
                    <div className="p-16 text-center text-gray-400 flex flex-col items-center">
                        <ShieldAlert className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-lg font-medium">Không có yêu cầu chuyển Role nào đang chờ duyệt.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-6 py-4">Ví User</th>
                                    <th className="px-6 py-4 text-center">Role Hiện Tại</th>
                                    <th className="px-6 py-4 text-center">Role Yêu Cầu</th>
                                    <th className="px-6 py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pendingRequests.map((request) => (
                                    <tr key={request.walletAddress} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-5 font-mono text-sm text-gray-600">
                                            {request.walletAddress.slice(0, 8)}...{request.walletAddress.slice(-8)}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-xs font-bold uppercase">
                                                {request.currentRole || 'client'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1 rounded-md text-xs font-bold uppercase inline-flex items-center gap-1">
                                                ➡️ {request.roleRequest?.requestedRole || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button 
                                                    onClick={() => handleProcessRequest(request.walletAddress, 'reject')}
                                                    disabled={processingId === request.walletAddress}
                                                    className="bg-white border border-gray-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1 transition-all disabled:opacity-50"
                                                >
                                                    <XCircle className="w-4 h-4" /> Từ chối
                                                </button>
                                                <button 
                                                    onClick={() => handleProcessRequest(request.walletAddress, 'approve')}
                                                    disabled={processingId === request.walletAddress}
                                                    className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-1 transition-all shadow-md disabled:opacity-50"
                                                >
                                                    {processingId === request.walletAddress ? (
                                                        <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                                                    ) : (
                                                        <><CheckCircle className="w-4 h-4" /> Phê duyệt</>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}