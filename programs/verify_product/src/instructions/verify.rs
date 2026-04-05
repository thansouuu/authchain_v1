use anchor_lang::prelude::*;
use crate::{
    state::product::*,
    error::ErrorCode,
    events::*,
};

#[derive(Accounts)]
pub struct VerifyReport<'info> {
    #[account(mut)]
    pub brand_pubkey: Signer<'info>,

    #[account(
        mut,
        has_one = brand_pubkey @ ErrorCode::UnauthorizedBrand,
        close = nsx_pubkey // 👉 Đóng PDA, phần dư luôn thuộc về NSX
    )]
    pub product: Account<'info, Product>,

    /// CHECK: 
    #[account(mut, address = product.buyer_pubkey @ErrorCode::InvalidBuyerAddress)]
    pub buyer_pubkey: UncheckedAccount<'info>,

    /// CHECK: 
    #[account(mut, address = product.nsx_pubkey @ErrorCode::InvalidNsxAddress)]
    pub nsx_pubkey: UncheckedAccount<'info>,
}

pub fn process(ctx: Context<VerifyReport>, nsx_at_fault: bool) -> Result<()> {
    let product = &mut ctx.accounts.product;

    require!(product.current_funding == product.price, ErrorCode::NotEnoughMoney); 
    require!(!product.is_resolved, ErrorCode::ProductLocked);
    require!(product.has_error, ErrorCode::NoErrorToVerify);

    // 1. Trả Brand lại tiền cọc
    let brand_payout = product.brand_stake;
    let product_info = product.to_account_info();
    let mut product_lamports = product_info.try_borrow_mut_lamports()?;
    **product_lamports = (**product_lamports).checked_sub(brand_payout).unwrap();

    let brand_info = ctx.accounts.brand_pubkey.to_account_info();
    let mut brand_lamports = brand_info.try_borrow_mut_lamports()?;
    **brand_lamports = (**brand_lamports).checked_add(brand_payout).unwrap();

    // 2. Xử lý phần tiền của Client
    if nsx_at_fault {
        // Hoàn tiền cho Khách. Anchor tự động gửi phần dư (Rent) về cho NSX.
        let buyer_payout = product.current_funding;
        
        **product_lamports = (**product_lamports).checked_sub(buyer_payout).unwrap();
        let buyer_info = ctx.accounts.buyer_pubkey.to_account_info();
        let mut buyer_lamports = buyer_info.try_borrow_mut_lamports()?;
        **buyer_lamports = (**buyer_lamports).checked_add(buyer_payout).unwrap();

        msg!("Phán quyết: nhà sản xuất có lỗi. Hoàn trả Khách hàng.");
    } else {
        // Client sai. Anchor sẽ gộp phần tiền mua hàng này chung với Rent và chuyển tất cả cho NSX.
        msg!("Phán quyết: Client báo cáo sai. Thanh toán cho NSX.");
    }
    
    let resolution_reason = if nsx_at_fault {
        "Brand phán quyết: nhà sản xuất giao hàng lỗi, đã hoàn tiền cho khách hàng.".to_string()
    } else {
        "Brand phán quyết: khách hàng báo cáo sai, đã thanh toán tiền sản phẩm cho nhà sản xuất".to_string()
    };

    emit!(ProductStatusEvent {
        product_id: product.product_id.clone(),
        is_finished: true,
        has_error: product.has_error, 
        reason: resolution_reason,
    });

    Ok(())
}