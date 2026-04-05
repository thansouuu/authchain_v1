use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Lỗi tính toán: Tràn số (Overflow/Underflow)")]
    MathOverflow,
    #[msg("Sản phẩm đã bị khóa do có lỗi xảy ra, không thể thực hiện hành động này!")]
    ProductLocked,
    #[msg("Bạn không phải là người đang giữ kiện hàng này!")]
    NotCurrentAuthority,
    #[msg("Địa chỉ ví hoàn tiền không khớp với địa chỉ ví mua ban đầu!")]
    InvalidBuyerAddress,
    #[msg("Địa chỉ ví không hợp lệ!")]
    InvalidNsxAddress,
    #[msg("Bạn không có vai trò Brand để phán xử đơn hàng này!")]
    UnauthorizedBrand,
    #[msg("Số dư không đủ để thực hiện thao tác này!")]
    NotEnoughMoney,
    #[msg("Sản phẩm này đã được brand phê duyệt trước đó rồi!")]
    AlreadyApproved,
    #[msg("Sản phẩm chưa được Brand phê duyệt, không thể mua hoặc vận chuyển!")]
    NotApprovedByBrand,
    #[msg("Sản phẩm bình thường và không có lỗi để xác minh!")]
    NoErrorToVerify,
    #[msg("Chưa đến thời hạn Timeout, không thể gọi hàm này!")]
    NotYetTimeout,
    #[msg("Nhà sản xuất và  brand không được mua lại đồ của mình!")]
    SelfPurchaseNotAllowed,
    #[msg("Người vận chuyển hiện tại không thể mua đồ do mình vận chuyển!")]
    CustodianCannotBuy,
    #[msg["Mã qr đã hết hiệu lực!"]]
    QrCodeExpired,
    #[msg["Chữ ký không chính xác!"]]
    SignatureVerificationFailed,
}