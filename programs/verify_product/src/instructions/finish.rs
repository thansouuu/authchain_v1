use anchor_lang::prelude::*;
use crate::{
    state::product::*,
    error::{ErrorCode},
    events::*, 
};

#[derive(Accounts)]
pub struct FinishProduct<'info> {
    #[account(mut)]
    pub current_authority: Signer<'info>,
    
    /// CHECK: Ví NSX nhận lại toàn bộ tiền dư và Rent
    #[account(mut)]
    pub nsx_pubkey: UncheckedAccount<'info>, 
    
    /// CHECK: Ví Brand nhận lại cọc
    #[account(mut, address = product.brand_pubkey)]
    pub brand_pubkey: UncheckedAccount<'info>,
    
    #[account(
        mut,
        has_one = current_authority @ErrorCode::NotCurrentAuthority,
        has_one = nsx_pubkey @ErrorCode::InvalidNsxAddress, 
        close = nsx_pubkey // 👉 PHÉP THUẬT NẰM Ở ĐÂY: Đóng PDA và chuyển hết tiền dư cho NSX
    )]
    pub product: Account<'info, Product>,    
}

pub fn process(ctx: Context<FinishProduct>) -> Result<()> {
    let product = &mut ctx.accounts.product;

    require!(product.current_funding == product.price, ErrorCode::NotEnoughMoney); 
    require!(!product.is_resolved, ErrorCode::ProductLocked);
    require!(!product.has_error, ErrorCode::ProductLocked);

    // 1. Chỉ cần tính và trả cọc cho Brand (Anchor sẽ tự lo phần của NSX)
    let brand_payout = product.brand_stake;
    if brand_payout > 0 {
        let product_info = product.to_account_info();
        let mut product_lamports = product_info.try_borrow_mut_lamports()?;
        **product_lamports = (**product_lamports).checked_sub(brand_payout).unwrap();

        let brand_info = ctx.accounts.brand_pubkey.to_account_info();
        let mut brand_lamports = brand_info.try_borrow_mut_lamports()?;
        **brand_lamports = (**brand_lamports).checked_add(brand_payout).unwrap();
    }

    emit!(ProductStatusEvent {
        product_id: product.product_id.clone(),
        is_finished: true,
        has_error: false, 
        reason: "Giao hàng thành công. Đã hoàn cọc cho Brand !".to_string(),
    });

    // Hàm kết thúc. Anchor tự động đóng Account `product` và chuyển toàn bộ tiền
    // (Tiền hàng + Quỹ đệm dư + Rent) về cho `nsx_pubkey`!
    Ok(())
}