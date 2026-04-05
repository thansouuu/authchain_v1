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
};

#[derive(Accounts)]
#[instruction(product_id: String)] 
pub struct Init<'info> {
    #[account(mut)]
    pub nsx: Signer<'info>, 
    
    #[account(
        init,
        payer = nsx,
        space = 8 + std::mem::size_of::<Product>(), 
        seeds = [PRODUCT_SEED, nsx.key().as_ref(), product_id.as_bytes()], 
        bump
    )]
    pub product: Account<'info, Product>,

    /// CHECK: Chỉ lưu địa chỉ, không cần ký
    pub brand: UncheckedAccount<'info>, 
    pub system_program: Program<'info, System>, 
}

pub fn process(ctx: Context<Init>, product_id: String, selling_price: u64) -> Result<()> {
    let product = &mut ctx.accounts.product;
    
    // 👉 NSX nạp 10% quỹ đệm vận hành vào PDA (5% cho Brand, 5% cho Tài xế)
    let buffer_amount = selling_price.checked_mul(10).unwrap().checked_div(100).unwrap();
    let transfer_instruction = transfer(
        &ctx.accounts.nsx.key(),
        &product.key(),
        buffer_amount,
    );

    invoke(
        &transfer_instruction,
        &[
            ctx.accounts.nsx.to_account_info(),
            product.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    product.product_id = product_id;
    product.current_authority = ctx.accounts.nsx.key(); 
    product.nsx_pubkey = ctx.accounts.nsx.key();
    product.brand_pubkey = ctx.accounts.brand.key();
    product.buyer_pubkey = Pubkey::default(); 
    product.price = selling_price;
    product.current_funding = 0; 
    product.is_approved = false;
    product.is_resolved = false;
    product.has_error = false;
    product.timestamp = Clock::get()?.unix_timestamp; // Khởi tạo đồng hồ
    
    msg!("NSX đã tạo mã vận đơn {} và nạp {} Lamports quỹ đệm.", product.product_id, buffer_amount);
    
    Ok(())
}