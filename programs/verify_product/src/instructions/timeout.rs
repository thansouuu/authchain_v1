use anchor_lang::prelude::*;
use crate::{
    state::product::*,
    error::ErrorCode,
    events::*,
};

// const BRAND_TIMEOUT: i64 = 3 * 24 * 60 * 60;  
// const CLIENT_TIMEOUT: i64 = 7 * 24 * 60 * 60; 

const BRAND_TIMEOUT: i64 = 1;  
const CLIENT_TIMEOUT: i64 =1; 

#[derive(Accounts)]
pub struct ResolveTimeout<'info> {
    #[account(mut)]
    pub caller: Signer<'info>, 

    #[account(
        mut,
        close = nsx_pubkey // 👉 Đóng PDA, phần dư luôn thuộc về NSX
    )]
    pub product: Account<'info, Product>,

    /// CHECK:
    #[account(mut, address = product.buyer_pubkey)]
    pub buyer_pubkey: UncheckedAccount<'info>,

    /// CHECK:
    #[account(mut, address = product.nsx_pubkey)]
    pub nsx_pubkey: UncheckedAccount<'info>,

    /// CHECK:
    #[account(mut, address = product.brand_pubkey)]
    pub brand_pubkey: UncheckedAccount<'info>,
}

pub fn process(ctx: Context<ResolveTimeout>) -> Result<()> {
    let product = &mut ctx.accounts.product;
    require!(!product.is_resolved, ErrorCode::ProductLocked);

    let current_time = Clock::get()?.unix_timestamp;
    let resolution_reason: String;

    
    if product.has_error {
        // TRƯỜNG HỢP 1: BRAND "NGÂM" REPORT
        require!(current_time >= product.timestamp + BRAND_TIMEOUT, ErrorCode::NotYetTimeout);

        // Trả tiền mua hàng lại cho Client. Tiền phạt Brand thì Anchor tự động chuyển về cho NSX chung với Rent.
        let buyer_payout = product.current_funding;
        
        let product_info = product.to_account_info();
        let mut product_lamports = product_info.try_borrow_mut_lamports()?;
        **product_lamports = (**product_lamports).checked_sub(buyer_payout).unwrap();

        let buyer_info = ctx.accounts.buyer_pubkey.to_account_info();
        let mut buyer_lamports = buyer_info.try_borrow_mut_lamports()?;
        **buyer_lamports = (**buyer_lamports).checked_add(buyer_payout).unwrap();

        resolution_reason = "Brand quá hạn phân xử. Tịch thu cọc đền cho NSX.".to_string();
    } else {
        // TRƯỜNG HỢP 2: CLIENT "NGÂM" XÁC NHẬN HÀNG
        require!(current_time >= product.timestamp + CLIENT_TIMEOUT, ErrorCode::NotYetTimeout);

        // Trả lại cọc cho Brand. Tiền bán hàng thì Anchor tự động chuyển cho NSX chung với Rent.
        let brand_payout = product.brand_stake;

        let product_info = product.to_account_info();
        let mut product_lamports = product_info.try_borrow_mut_lamports()?;
        **product_lamports = (**product_lamports).checked_sub(brand_payout).unwrap();

        let brand_info = ctx.accounts.brand_pubkey.to_account_info();
        let mut brand_lamports = brand_info.try_borrow_mut_lamports()?;
        **brand_lamports = (**brand_lamports).checked_add(brand_payout).unwrap();

        resolution_reason = "Client quá hạn xác nhận. Thanh toán cho NSX.".to_string();
    }

    emit!(ProductStatusEvent {
        product_id: product.product_id.clone(),
        is_finished: true,
        has_error: false,
        reason: resolution_reason,
    });

    Ok(())
}