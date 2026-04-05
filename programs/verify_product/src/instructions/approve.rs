use anchor_lang::{
    prelude::*, 
    solana_program::{
        program::{invoke},
        system_instruction::transfer,
    }
};
use crate::{
    state::product::*,
    error::ErrorCode,
    events::*,
};

#[derive(Accounts)]
pub struct ApproveProduct<'info> {
    #[account(mut)]
    pub brand: Signer<'info>,

    #[account(
        mut,
        constraint = product.brand_pubkey == brand.key() @ ErrorCode::UnauthorizedBrand,
    )]
    pub product: Account<'info, Product>,

    pub system_program: Program<'info, System>,
}

pub fn process(ctx: Context<ApproveProduct>) -> Result<()> {
    let product = &mut ctx.accounts.product;

    require!(!product.is_approved, ErrorCode::AlreadyApproved);
    require!(!product.is_resolved, ErrorCode::ProductLocked);

    // Brand nạp 100% tiền cọc
    let stake_amount = product.price;
    let transfer_instruction = transfer(
        &ctx.accounts.brand.key(),
        &product.key(),
        stake_amount,
    );

    invoke(
        &transfer_instruction,
        &[
            ctx.accounts.brand.to_account_info(),
            product.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    product.brand_stake = stake_amount;

    // PDA trả 5% phí thuê nhãn hiệu cho Brand (Từ quỹ đệm NSX nạp lúc nãy)
    let brand_fee = product.price.checked_mul(5).unwrap().checked_div(100).unwrap();
    
    let product_info = product.to_account_info();
    let mut product_lamports = product_info.try_borrow_mut_lamports()?;
    **product_lamports = (**product_lamports).checked_sub(brand_fee).ok_or(ErrorCode::MathOverflow)?;

    let brand_info = ctx.accounts.brand.to_account_info();
    let mut brand_lamports = brand_info.try_borrow_mut_lamports()?;
    **brand_lamports = (**brand_lamports).checked_add(brand_fee).ok_or(ErrorCode::MathOverflow)?;

    product.is_approved = true;

    emit!(ProductStatusEvent {
        product_id: product.product_id.clone(),
        is_finished: false,
        has_error: false,
        reason: format!("Brand đã phê duyệt, cọc {} Lamports và nhận {} Lamports phí.", stake_amount, brand_fee),
    });

    Ok(())
}