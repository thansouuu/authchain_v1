use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Product{
    // 1. Thông tin định danh
    pub product_id: String,          // Mã đơn hàng (Nên giới hạn độ dài, VD: 32 ký tự)
    
    pub current_authority: Pubkey,   // Người đang cầm hàng vật lý (NSX -> Tài xế -> Client)
    pub brand_pubkey: Pubkey,        // Brand (Người cầm trịch, phân xử đúng sai)
    pub nsx_pubkey: Pubkey,          // Nhà sản xuất
    pub buyer_pubkey: Pubkey,        // Ví người mua
    pub price: u64,     
    pub current_funding: u64,
    pub brand_stake: u64,

    // 4. Chốt an toàn On-chain
    pub is_approved: bool,
    pub is_resolved: bool,           // True = Đã xử lý xong (Thành công hoặc Bị Brand phạt). Khóa vault lại.
    pub has_error: bool,
    pub timestamp: i64,
}
