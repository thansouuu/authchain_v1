import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from '../idl/verify_product.json'; // Đường dẫn trỏ tới file IDL vừa tạo

// Program ID của Duy
export const PROGRAM_ID = new PublicKey("By7FiwWubLNv1xG5tAq6SzoyfanFqhTfNnvy43sQXpJc");

// Hàm khởi tạo Provider
export const getProvider = (wallet, connection) => {
    return new AnchorProvider(connection, wallet, {
        preflightCommitment: 'confirmed',
    });
};

// Hàm lấy Program instance để gọi Smart Contract
export const getProgram = (provider) => {
    return new Program(idl, provider); // CHỈ CẦN 2 THAM SỐ
};