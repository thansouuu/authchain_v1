use anchor_lang::prelude::*;

#[event]
pub struct PackageTransferredEvent {
    pub product_id: String,
    pub from_authority: Pubkey,
    pub to_authority: Pubkey,
    pub location: String,
    pub timestamp: i64,
}

#[event]
pub struct ProductStatusEvent {
    pub product_id: String,
    pub is_finished: bool, 
    pub has_error: bool,   
    pub reason: String,    
}
#[event]
pub struct ProductBoughtEvent {
    pub product_id: String,
    pub buyer: Pubkey,
    pub amount: u64,
    pub message: String,
}