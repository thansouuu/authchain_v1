use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::{load_instruction_at_checked,load_current_index_checked, ID as IX_ID};
use anchor_lang::solana_program::ed25519_program::ID as ED25519_ID;
use crate::{
    state::product::*,
    error::{ErrorCode},
    events::*, 
};

#[derive(Accounts)]
pub struct Transfer<'info> {
    #[account(mut)]
    pub current_authority: Signer<'info>, 

    #[account(
        mut,
        has_one = current_authority @ErrorCode::NotCurrentAuthority, 
    )]
    pub product: Account<'info, Product>, 

    /// CHECK: Ví người nhận lấy từ QR
    pub new_authority: UncheckedAccount<'info>,
    
    /// CHECK: Tài khoản sysvar để soi các instruction trong transaction
    #[account(address = IX_ID)]
    pub instruction_sysvar_account: UncheckedAccount<'info>,
}

pub fn process(
    ctx: Context<Transfer>, 
    new_location: String,
    timestamp: i64,
    _signature: [u8; 64] 
) -> Result<()> {
    let product = &mut ctx.accounts.product;

    // 1. Kiểm tra an toàn & Replay Attack (Giữ nguyên)
    require!(product.current_funding == product.price, ErrorCode::NotEnoughMoney); 
    require!(!product.is_resolved, ErrorCode::ProductLocked);
    let current_time = Clock::get()?.unix_timestamp;
    require!(current_time - timestamp < 60, ErrorCode::QrCodeExpired);

    // 2. Tái tạo thông điệp gốc
    let expected_message = format!("AcceptDelivery:{}:{}", product.product_id, timestamp);
    let message_bytes = expected_message.as_bytes();
    
    // 3. SOI LỆNH ED25519 (Instruction Introspection Động)
    let sysvar_info = ctx.accounts.instruction_sysvar_account.to_account_info();

    // Lấy vị trí (index) của lệnh Transfer hiện tại trong Transaction
    let current_index = load_current_index_checked(&sysvar_info)
        .map_err(|_| ErrorCode::SignatureVerificationFailed)?;

    // Đảm bảo phải có ít nhất 1 lệnh đứng trước nó (để tránh underflow)
    require!(current_index > 0, ErrorCode::SignatureVerificationFailed);

    // Lấy lệnh NGAY TRƯỚC lệnh hiện tại (current_index - 1)
    // Vì ở Frontend, ta luôn add Ed25519 ngay trước hàm Transfer
    let ed25519_ix = load_instruction_at_checked((current_index - 1) as usize, &sysvar_info)
        .map_err(|_| ErrorCode::SignatureVerificationFailed)?;

    // Kiểm tra Program ID
    require!(ed25519_ix.program_id == ED25519_ID, ErrorCode::SignatureVerificationFailed);

    // 👉 BƯỚC QUAN TRỌNG NHẤT: Kiểm tra Public Key của người ký
    // Trong cấu trúc Ed25519 Instruction của Solana:
    // - Pubkey nằm ở offset 16 đến 16 + 32 trong phần data
    let signer_pubkey_in_ix = &ed25519_ix.data[16..48]; 
    require!(
        signer_pubkey_in_ix == ctx.accounts.new_authority.key().to_bytes(),
        ErrorCode::SignatureVerificationFailed
    );

    // Kiểm tra nội dung thông điệp (expected_message)
    require!(
        ed25519_ix.data.windows(message_bytes.len()).any(|window| window == message_bytes),
        ErrorCode::SignatureVerificationFailed
    );

// 4. TRẢ LƯƠNG 1% CHO TÀI XẾ
    let driver_fee = product.price.checked_div(100).unwrap();
    
    // Lấy thông tin PDA sản phẩm
    let product_info = product.to_account_info();
    let mut product_lamports = product_info.try_borrow_mut_lamports()?;
    
    // 👉 TÁCH RIÊNG DÒNG NÀY ĐỂ GIỮ BIẾN driver_info KHÔNG BỊ XÓA
    let driver_info = ctx.accounts.current_authority.to_account_info(); 
    let mut driver_lamports = driver_info.try_borrow_mut_lamports()?;

    // Thực hiện cộng trừ tiền
    **product_lamports = (**product_lamports).checked_sub(driver_fee).ok_or(ErrorCode::MathOverflow)?;
    **driver_lamports = (**driver_lamports).checked_add(driver_fee).ok_or(ErrorCode::MathOverflow)?;
    let old_authority = product.current_authority;
    product.current_authority = ctx.accounts.new_authority.key();
    product.timestamp = current_time;

    msg!("Bàn giao thành công! Người nhận: {}", product.current_authority);

    emit!(PackageTransferredEvent {
        product_id: product.product_id.clone(), 
        from_authority: old_authority,
        to_authority: product.current_authority,
        location: new_location, 
        timestamp: current_time,
    });

    Ok(())
}