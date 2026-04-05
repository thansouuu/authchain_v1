use anchor_lang::prelude::*;
use crate::{
    state::product::*,
    error::ErrorCode,
    events::*,
};

#[derive(Accounts)]
pub struct ReportError<'info> {
    // Người đang cầm hàng (Client) phải ký
    #[account(mut)]
    pub current_authority: Signer<'info>,

    #[account(
        mut,
        has_one = current_authority @ErrorCode::NotCurrentAuthority, // Bắt buộc: Chỉ người đang giữ hàng mới được report
    )]
    pub product: Account<'info, Product>,
}

pub fn process(ctx: Context<ReportError>, reason: String) -> Result<()> {
    let product = &mut ctx.accounts.product;

    require!(product.current_funding == product.price, ErrorCode::NotEnoughMoney); 
    require!(!product.is_resolved, ErrorCode::ProductLocked);
    require!(!product.has_error, ErrorCode::ProductLocked); 

    product.has_error = true;
    product.timestamp = Clock::get()?.unix_timestamp;

    msg!("Kiện hàng {} bị report lỗi! Lý do: {}", product.product_id, reason);

    // Bắn event báo động cho Frontend
    emit!(ProductStatusEvent {
        product_id: product.product_id.clone(),
        is_finished: false,
        has_error: true,
        reason: reason,
    });

    Ok(())
}