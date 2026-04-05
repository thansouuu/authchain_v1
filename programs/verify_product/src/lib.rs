pub mod instructions; 
pub mod state;
pub mod error;
pub mod events;
pub mod constant;

// ==========================================
// BƯỚC 2: IMPORT TẤT CẢ STRUCT
// Lôi toàn bộ Struct (ApproveProduct, BuyProduct...) đã được pub use ở mod.rs ra đây
// ==========================================
use instructions::*;

use anchor_lang::prelude::*;

declare_id!("By7FiwWubLNv1xG5tAq6SzoyfanFqhTfNnvy43sQXpJc");

#[program]
pub mod verify_product {
    use super::*;

    // 1. NSX tạo đơn hàng
    pub fn init_product(ctx: Context<Init>, product_id: String, price: u64) -> Result<()> {
        instructions::init::process(ctx, product_id, price)
    }

    // 2. Brand duyệt và nạp cọc
    pub fn approve_product(ctx: Context<ApproveProduct>) -> Result<()> {
        instructions::approve::process(ctx)
    }

    // 3. Client nạp tiền mua hàng
    pub fn buy_product(ctx: Context<BuyProduct>) -> Result<()> {
        instructions::buy::process(ctx)
    }

    // 4. Các bên luân chuyển hàng hóa (Cập nhật vị trí)
    pub fn transfer_product(
            ctx: Context<Transfer>, 
            new_location: String, 
            timestamp: i64, 
            signature: [u8; 64] // 👉 Thêm 2 tham số này
        ) -> Result<()> {
            instructions::transfer::process(ctx, new_location, timestamp, signature)
        }

    // 5. Client nhận hàng OK -> Nhả tiền cho NSX, nhả cọc cho Brand
    pub fn finish_product(ctx: Context<FinishProduct>) -> Result<()> {
        instructions::finish::process(ctx)
    }

    // 6. Client phát hiện lỗi -> Bấm báo cáo khẩn cấp
    pub fn report_error(ctx: Context<ReportError>, reason: String) -> Result<()> {
        instructions::report::process(ctx, reason)
    }

    // 7. Brand phán xử lỗi -> Đền bù tiền cho bên bị hại
    pub fn verify_report(ctx: Context<VerifyReport>, nsx_at_fault: bool) -> Result<()> {
        instructions::verify::process(ctx, nsx_at_fault)
    }

    // 8. Xử lý kẹt tiền khi có bên ngâm án quá hạn (Timeout)
    pub fn resolve_timeout(ctx: Context<ResolveTimeout>) -> Result<()> {
        instructions::timeout::process(ctx)
    }

    
}

#[derive(Accounts)]
pub struct Initialize {}
