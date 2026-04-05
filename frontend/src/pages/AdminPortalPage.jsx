import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWallet } from '@solana/wallet-adapter-react';
import { ShieldAlert, CheckCircle, XCircle, UserCog } from 'lucide-react';

const ADMIN_WALLET = "GH85GXm9GTopqbAwTXyhuQgQzE2pS2JAwsyaqydfRfhn"; // 👉 Hardcode ví admin tạm thời

export default function AdminPortalPage() {
    const { publicKey } = useWallet();
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null); // Quản lý trạng thái nút đang xoay

    // Fetch danh sách pending
    useEffect(() => {
        const fetchRequests = async () => {
            if (!publicKey) return;
            try {
                setLoading(true);
                const res = await axios.get('http://localhost:5000/api/users/role-requests');
                if (res.data && res.data.data) {
                    setPendingRequests(res.data.data);
                }
            } catch (error) {
                console.error("Lỗi lấy danh sách:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, [publicKey]);

    const handleProcessRequest = async (walletAddress, action) => {
        if (!window.confirm(`Bạn chắc chắn muốn ${action === 'approve' ? 'DUYỆT' : 'TỪ CHỐI'} đơn này?`)) return;

        try {
            setProcessingId(walletAddress);
            const res = await axios.patch(`http://localhost:5000/api/users/${walletAddress}/process-request`, {
                action: action
            });

            alert(`✅ ${res.data.message}`);
            // Xóa khỏi danh sách UI
            setPendingRequests(prev => prev.filter(r => r.walletAddress !== walletAddress));

        } catch (error) {
            // 👉 HỨNG LỖI TỪ BACKEND NẾU USER CHƯA HOÀN THÀNH TRÁCH NHIỆM
            if (error.response && error.response.status === 400) {
                alert(`❌ TỪ CHỐI DUYỆT:\n${error.response.data.message}`);
            } else {
                alert("Lỗi hệ thống: Không thể xử lý yêu cầu.");
            }
        } finally {
            setProcessingId(null);
        }
    };

    // Bảo mật sơ bộ trên UI
    if (publicKey?.toBase58() !== ADMIN_WALLET && process.env.NODE_ENV === 'production') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <ShieldAlert className="w-20 h-20 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900">Truy cập bị từ chối</h1>
                <p className="text-gray-500">Chỉ Admin hệ thống mới có quyền vào trang này.</p>
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
                        {pendingRequests.length} đơn
                    </span>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-400 font-bold">Đang tải dữ liệu...</div>
                ) : pendingRequests.length === 0 ? (
                    <div className="p-16 text-center text-gray-400 flex flex-col items-center">
                        <ShieldAlert className="w-12 h-12 mb-3 opacity-50" />
                        <p>Không có yêu cầu chuyển Role nào đang chờ duyệt.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                            <tr>
                                <th className="px-6 py-4">Ví User</th>
                                <th className="px-6 py-4">Role Hiện Tại</th>
                                <th className="px-6 py-4">Role Yêu Cầu</th>
                                <th className="px-6 py-4 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pendingRequests.map((request) => (
                                <tr key={request.walletAddress} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-5 font-mono text-sm text-gray-600">
                                        {request.walletAddress}
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-xs font-bold uppercase">
                                            {request.currentRole || 'none'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1 rounded-md text-xs font-bold uppercase flex items-center w-max gap-1">
                                            <span>➡️</span> {request.roleRequest.requestedRole}
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
                                                    '⏳ Đang xử lý...'
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
                )}
            </div>
        </div>
    );
}