import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

export const useReceiveQR = () => {
    const { publicKey, signMessage } = useWallet();
    const [qrData, setQrData] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateQR = async (productId) => {
        if (!publicKey || !signMessage) {
            alert("Ví của bạn không hỗ trợ tính năng ký tin nhắn hoặc chưa kết nối!");
            return;
        }

        try {
            setIsGenerating(true);
            const timestamp = Math.floor(Date.now() / 1000);
            
            // Format thông điệp chuẩn để Smart Contract verify được
            const message = `AcceptDelivery:${productId}:${timestamp}`;
            const encodedMessage = new TextEncoder().encode(message);
            
            // Yêu cầu ký (Offline - 0 phí gas)
            const signature = await signMessage(encodedMessage);
            const signatureBase58 = bs58.encode(signature);

            // Đóng gói dữ liệu bảo mật
            const qrJson = JSON.stringify({
                receiverWallet: publicKey.toBase58(),
                signature: signatureBase58,
                timestamp: timestamp,
                productId: productId
            });

            setQrData(qrJson);
        } catch (error) {
            console.error("Lỗi ký xác thực:", error);
            alert("Bạn đã hủy yêu cầu ký xác nhận.");
        } finally {
            setIsGenerating(false);
        }
    };

    const resetQR = () => setQrData(null);

    return { qrData, isGenerating, generateQR, resetQR };
};