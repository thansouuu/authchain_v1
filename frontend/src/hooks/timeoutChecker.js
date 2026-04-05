export const checkTimeoutCondition = (batch) => {
    // 1. Kiểm tra an toàn: Nếu không có lịch sử thì không tính toán
    if (!batch || !batch.history || batch.history.length === 0) return null;
    
    // 2. Lấy thời gian của event cuối cùng
    const lastEvent = batch.history[batch.history.length - 1];
    const lastEventTime = new Date(lastEvent.date).getTime();
    const now = new Date().getTime();
    
    // 3. Tính khoảng cách thời gian bằng giây
    const diffInSeconds = Math.floor((now - lastEventTime) / 1000);

    // 4. Case 1: Client ngâm hàng (3 ngày = 259200 giây)
    if (batch.status === 'in-transit' && batch.currentCustodian === batch.owner) {
        // if (diffInSeconds >= 3 * 24 * 60 * 60) {
        //     return 'client_timeout';
        // }
        if (diffInSeconds >= 1) {
            return 'client_timeout';
        }
    }

    // 5. Case 2: Brand ngâm đơn phán xử (7 ngày = 604800 giây)
    if (batch.status === 'disputed') {
        // if (diffInSeconds >= 7 * 24 * 60 * 60) {
        //     return 'brand_timeout';
        // }
        if (diffInSeconds >= 1) {
            return 'brand_timeout';
        }
    }

    // Không vi phạm điều kiện nào
    return null;
};