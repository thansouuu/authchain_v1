use anchor_lang::{
    prelude::*, 
    solana_program::{
        program::{invoke},
        system_instruction::transfer,
    }
};
use crate::{
    state::product::*,
    constant::{PRODUCT_SEED},
    error::{ErrorCode},
    events::*, 
};
#[derive(Accounts)]
pub struct BuyProduct<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>, 
    #[account(mut)]
    pub product: Account<'info, Product>,

    pub system_program: Program<'info, System>,
}

pub fn process(ctx: Context<BuyProduct>) -> Result<()> {
    let product = &mut ctx.accounts.product;
    let buyer = &ctx.accounts.buyer;
    require!(product.is_approved, ErrorCode::NotApprovedByBrand);
    require!(!product.has_error, ErrorCode::ProductLocked);
    require!(buyer.key() != product.nsx_pubkey, ErrorCode::SelfPurchaseNotAllowed);
    require!(buyer.key() != product.brand_pubkey, ErrorCode::SelfPurchaseNotAllowed);
    require!(buyer.key() != product.current_authority, ErrorCode::CustodianCannotBuy);

    let amount = product.price;
    let transfer_instruction = transfer(
        &ctx.accounts.buyer.key(),
        &product.key(),
        amount,
    );

    invoke(
        &transfer_instruction,
        &[
            ctx.accounts.buyer.to_account_info(),
            product.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // 3. Cập nhật State
    product.current_funding = amount;
    product.buyer_pubkey = ctx.accounts.buyer.key(); 

    msg!("Client {} đã thanh toán {} Lamports cho đơn hàng {}!", product.buyer_pubkey, amount, product.product_id);
    emit!(ProductBoughtEvent {
        product_id: product.product_id.clone(),
        buyer: product.buyer_pubkey,
        amount: amount,
        message: format!("Khách hàng đã thanh toán thành công {} Lamports.", amount),
    });
    Ok(())
}