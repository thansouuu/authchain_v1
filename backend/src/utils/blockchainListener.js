const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey } = require('@solana/web3.js');
const { EventParser } = require('@coral-xyz/anchor');
const Product = require('../models/Product.js');
const idl = require('./idl.json');

// const connection = new Connection("http://127.0.0.1:8899", {
//     commitment: 'confirmed',
//     wsEndpoint: "ws://127.0.0.1:8900" 
// });

const connection = new Connection("https://api.devnet.solana.com", {
    commitment: 'confirmed',
    wsEndpoint: "wss://api.devnet.solana.com" 
});

idl.address = "By7FiwWubLNv1xG5tAq6SzoyfanFqhTfNnvy43sQXpJc";
const programId = new PublicKey(idl.address);
const provider = new anchor.AnchorProvider(connection, {}, { commitment: 'confirmed' });
const program = new anchor.Program(idl, provider);

const startListener = () => {
    console.log("🎧 [Listener] Đang dùng EventParser bắt log trực tiếp (Anchor 0.31.1)...");
    const eventParser = new EventParser(programId, program.coder);

    connection.onLogs(
        programId,
        async (logs, ctx) => {
            // 👉 FIX 1: Đổi từ ctx.signature sang logs.signature
            const txHash = logs.signature; 
            if (txHash === '1111111111111111111111111111111111111111111111111111111111111111') {
                console.log("👻 [Listener] Bỏ qua log giả lập (Preflight Simulation)");
                return; 
            }

            // (Có thể thêm dòng này để chặn luôn các giao dịch bị lỗi trên mạng lưới)
            if (logs.err) {
                console.log(`❌ [Listener] Bỏ qua giao dịch thất bại: ${txHash}`);
                return;
            }
            let events = [];
            try { events = eventParser.parseLogs(logs.logs); } catch(e) {}

            for (let event of events) {
                console.log(`✅ [BẮT ĐƯỢC EVENT]: ${event.name} | Tx: ${txHash}`);
                const data = event.data;

                // 👉 FIX 2: Làm sạch chuỗi productId (Xóa ký tự Null \0 do Solana padding)
                const rawProductId = data.productId || data.product_id; // Đề phòng Rust trả về snake_case
                if (!rawProductId) continue;
                const cleanProductId = rawProductId.toString().trim().replace(/\0/g, '');

                try {
                    // 👉 FIX 3: Bắt cả 2 trường hợp viết hoa/thường của tên Event
                    if (event.name === 'ProductStatusEvent' || event.name === 'productStatusEvent') {
                        const { isFinished, hasError, reason } = data;
                        let status = hasError ? 'disputed' : (isFinished ? 'delivered' : 'approved');

                        const result = await Product.findOneAndUpdate(
                            { 
                                productId: cleanProductId,
                                "history.txHash": { $ne: txHash }
                            },
                            { 
                                $set: { status: status },
                                $push: { history: { status, title: status.toUpperCase(), desc: reason, txHash: txHash, date: new Date() } }
                            }
                        );
                        if (result) console.log(`👉 Đã cập nhật Status cho SP: ${cleanProductId}`);
                    }

                    if (event.name === 'PackageTransferredEvent' || event.name === 'packageTransferredEvent') {
                        const { fromAuthority, toAuthority, location, timestamp } = data;
                        const status = 'in-transit';

                        const result = await Product.findOneAndUpdate(
                            { 
                                productId: cleanProductId,
                                "history.txHash": { $ne: txHash }
                            },
                            { 
                                $set: { status: status, currentCustodian: toAuthority.toBase58() },
                                $push: { history: { 
                                    status, 
                                    title: "Bàn giao / Di chuyển", 
                                    desc: `Chuyển từ ${fromAuthority.toBase58()} sang ${toAuthority.toBase58()} tại ${location}`,
                                    txHash: txHash, 
                                    date: new Date(timestamp.toNumber() * 1000) 
                                } }
                            }
                        );
                        if (result) console.log(`📦 Đã cập nhật Transfer cho SP: ${cleanProductId}`);
                    }

                    if (event.name === 'ProductBoughtEvent' || event.name === 'productBoughtEvent') {
                        const { buyer, message } = data;
                        const status = 'purchased';

                        const result = await Product.findOneAndUpdate(
                            { 
                                productId: cleanProductId,
                                "history.txHash": { $ne: txHash }
                            },
                            { 
                                $set: { status: status, owner: buyer.toBase58() },
                                $push: { history: { status, title: "Thanh toán thành công", desc: message, txHash: txHash, date: new Date() } }
                            }
                        );
                        
                        if (result) {
                            console.log(`💰 Đã cập nhật Mua hàng cho SP: ${cleanProductId}`);
                        } else {
                            console.log(`⏭️ Bỏ qua Event Mua hàng trùng lặp của Tx: ${txHash}`);
                        }
                    }
                } catch (dbErr) {
                    console.error("❌ Lỗi cập nhật Database:", dbErr);
                }
            }
        },
        "confirmed"
    );
};

module.exports = { startListener };