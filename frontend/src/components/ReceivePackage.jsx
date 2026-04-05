import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { QRCodeSVG } from 'qrcode.react';

export default function ReceivePackageComponent({ productId }) {
    const { publicKey, signMessage } = useWallet();
    const [qrData, setQrData] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateQR = async () => {
        if (!publicKey || !signMessage) {
            alert("Vui lòng kết nối ví và đảm bảo ví hỗ trợ ký tin nhắn!");
            return;
        }

        try {
            setIsGenerating(true);

            // 1. Tạo Timestamp (Đồng hồ đếm ngược, chống mã QR cũ dùng lại)
            const currentTimestamp = Math.floor(Date.now() / 1000);

            // 2. Định dạng thông điệp cần ký (Phải khớp 100% với Smart Contract sau này)
            // Ví dụ: "AcceptDelivery:PRD-12345:1712246400"
            const message = `AcceptDelivery:${productId}:${currentTimestamp}`;
            
            // 3. Biến chuỗi thành mảng Byte để đưa cho ví ký
            const messageBytes = new TextEncoder().encode(message);

            // 4. Mở ví Phantom lên yêu cầu khách hàng ký!
            const signatureBytes = await signMessage(messageBytes);
            
            // 5. Giải mã chữ ký thành chuỗi Base58 cho dễ truyền đi
            const signatureBase58 = bs58.encode(signatureBytes);

            // 6. Đóng gói tất cả thành 1 cục JSON để vẽ ra QR Code
            const payload = JSON.stringify({
                receiverWallet: publicKey.toBase58(),
                productId: productId,
                timestamp: currentTimestamp,
                signature: signatureBase58
            });

            setQrData(payload);

        } catch (error) {
            console.error("Lỗi khi ký tin nhắn:", error);
            if (error.message.includes("User rejected")) {
                alert("Bạn đã từ chối ký xác nhận!");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4">Mã QR Nhận Hàng</h3>
            
            {!qrData ? (
                <button 
                    onClick={handleGenerateQR}
                    disabled={isGenerating}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                    {isGenerating ? "Đang mở ví ký..." : "Ký & Tạo mã QR"}
                </button>
            ) : (
                <div className="flex flex-col items-center gap-4 animate-fadeIn">
                    <div className="p-4 bg-white rounded-xl shadow-inner border-4 border-indigo-50">
                        {/* Vẽ mã QR từ chuỗi JSON */}
                        <QRCodeSVG value={qrData} size={200} level="H" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium text-center">
                        Mã QR này chứa chữ ký điện tử của bạn.<br/>
                        Đưa cho tài xế quét để hoàn tất nhận hàng.
                    </p>
                    <p className="text-xs text-red-500 font-bold">
                        *Mã tự động hết hạn sau 60 giây.
                    </p>
                    
                    <button 
                        onClick={() => setQrData(null)}
                        className="text-sm text-indigo-600 font-bold mt-2 hover:underline"
                    >
                        Tạo mã mới
                    </button>
                </div>
            )}
        </div>
    );
}