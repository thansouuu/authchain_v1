import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Ed25519Program, Transaction, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import bs58 from 'bs58';
import { Scanner } from '@yudiel/react-qr-scanner';
import { getProvider, getProgram, PROGRAM_ID } from '../utils/anchorSetup';
import { useLocation } from '../hooks/useLocation';
import HandoffScanner from './HandoffScanner';

export default function TransferCustodyCard({ inventory, onTransferSuccess }) {
    const { publicKey } = useWallet();
    const wallet = useAnchorWallet();
    const { connection } = useConnection();
    const { currentLocation, fetchLocation } = useLocation();

    const [isScanning, setIsScanning] = useState(false);
    const [qrMetadata, setQrMetadata] = useState(null);
    const [nextCustodianAddress, setNextCustodianAddress] = useState('');
    const [loading, setLoading] = useState(false);

    const handleExecuteTransfer = async () => {
        if (!qrMetadata || !publicKey || !currentLocation) {
            alert("Vui lòng quét mã QR của người nhận để lấy chữ ký xác thực!");
            return;
        }

        try {
            setLoading(true);
            const { receiverWallet, timestamp, signature, productId } = qrMetadata;
            
            // 👉 KIỂM TRA: Món hàng quét được có nằm trong kho/xe không?
            const productToTransfer = inventory.find(p => p.productId === productId);
            
            if (!productToTransfer) {
                alert(`❌ Lỗi: Kiện hàng ${productId} không nằm trong quản lý của bạn hoặc mã QR không hợp lệ!`);
                return;
            }

            // 👉 THÊM CHỐT CHẶN: Chỉ cho giao nếu trạng thái không phải là đã giao
            if (productToTransfer.status === 'delivered') {
                 alert(`❌ Lỗi: Kiện hàng ${productId} đã được bàn giao thành công trước đó.`);
                 return;
            }

            const signatureUint8 = bs58.decode(signature);
            const newAuthorityPk = new PublicKey(receiverWallet);
            const nsxPublicKey = new PublicKey(productToTransfer.manufacturerWallet);

            const [productPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("PRODUCT_SEED"), nsxPublicKey.toBuffer(), Buffer.from(productId)],
                PROGRAM_ID
            );

            const provider = getProvider(wallet, connection);
            const program = getProgram(provider);
            const transaction = new Transaction();

            // Lệnh 1: Xác thực Ed25519
            const message = new TextEncoder().encode(`AcceptDelivery:${productId}:${timestamp}`);
            transaction.add(Ed25519Program.createInstructionWithPublicKey({
                publicKey: newAuthorityPk.toBytes(),
                message: message,
                signature: signatureUint8,
            }));

            // Lệnh 2: Logic Transfer
            transaction.add(await program.methods
                .transferProduct(
                    currentLocation, 
                    new anchor.BN(timestamp), 
                    Array.from(signatureUint8)
                )
                .accounts({
                    currentAuthority: publicKey,
                    product: productPda,
                    newAuthority: newAuthorityPk,
                    instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
                })
                .instruction()
            );

            const txHash = await provider.sendAndConfirm(transaction);
            console.log("Tx Transfer thành công:", txHash);

            alert(`🎉 Bàn giao thành công kiện hàng ${productId}!`);
            
            // Gọi hàm callback báo cho cha biết để xóa khỏi UI
            if (onTransferSuccess) {
                onTransferSuccess(productId);
            }
            
            // Reset states
            setIsScanning(false);
            setQrMetadata(null);
            setNextCustodianAddress('');

        } catch (error) {
            console.error("❌ Lỗi Blockchain:", error);
            if (error.message.includes("User rejected")) {
                 console.log("Người dùng hủy giao dịch.");
            } else {
                 alert(`Giao dịch thất bại: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-emerald-50">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">✈️</span>
                <h2 className="text-xl font-bold text-gray-900">Giao hàng (Handoff)</h2>
            </div>

            {!qrMetadata ? (
                <div className="flex flex-col items-center space-y-4">
                    <p className="text-sm text-gray-500 text-center mb-2">
                        Quét mã QR của Người nhận để tự động đối chiếu và giao hàng.
                    </p>
                    <button 
                        onClick={() => {
                            fetchLocation();
                            setIsScanning(true);
                        }}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all flex justify-center items-center gap-2"
                    >
                        <span>📷</span> Mở Camera Quét QR
                    </button>

                    {/* 👉 CHỈ CẦN GỌI ĐÚNG NHƯ VẦY: */}
                    {isScanning && (
                        <HandoffScanner 
                            onScanSuccess={(parsedData) => {
                                setQrMetadata(parsedData);
                                setNextCustodianAddress(parsedData.receiverWallet);
                                setIsScanning(false);
                            }}
                            onCancel={() => setIsScanning(false)}
                        />
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Chuẩn bị giao kiện hàng:</p>
                        <p className="text-lg font-mono font-black text-gray-900">{qrMetadata.productId}</p>
                        <p className="text-xs text-gray-500 mt-2 truncate">Người nhận: {nextCustodianAddress}</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Vị trí GPS hiện tại</label>
                        <div className="flex gap-2">
                            <textarea
                                value={currentLocation}
                                readOnly
                                rows="2"
                                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm"
                                placeholder="Đang chờ định vị..."
                            />
                            <button onClick={fetchLocation} className="bg-blue-50 text-blue-600 px-4 rounded-xl font-bold">📍</button>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => { setQrMetadata(null); setNextCustodianAddress(''); }}
                            className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-200"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleExecuteTransfer}
                            disabled={loading || !currentLocation}
                            className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {loading ? '🚀 Đang xử lý...' : '🔐 Xác nhận & Giao'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}