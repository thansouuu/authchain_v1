# 🔗 AuthChain - Decentralized Supply Chain & Role Management

**AuthChain** là một hệ thống quản lý chuỗi cung ứng và phân quyền phi tập trung (dApp) được xây dựng trên nền tảng blockchain Solana. Dự án kết hợp sức mạnh của Web3 (Minh bạch, Không thể giả mạo) và Web2 (Trải nghiệm người dùng, Lưu trữ Off-chain) để giải quyết bài toán truy xuất nguồn gốc sản phẩm và quản lý định danh các tác nhân trong chuỗi cung ứng.

🌍 **Live Demo:** [https://authchain-v1.vercel.app](https://authchain-v1.vercel.app)

---

## 🛠 Công nghệ sử dụng (Tech Stack)

Dự án sử dụng kiến trúc Hybrid (Web2 + Web3) để tối ưu hóa hiệu năng và chi phí:

* **Blockchain / Smart Contract:** Solana (Devnet), Anchor Framework (Rust).
* **Frontend:** React.js, Tailwind CSS, Solana Wallet Adapter, React Router v6.
* **Backend:** Node.js, Express.js, MongoDB (Mongoose), TweetNaCl & bs58 (Xác thực mật mã học).
* **Deployment:** Vercel (Frontend SPA), Render (Backend API).

---

## 🔥 Tính năng kỹ thuật nổi bật (Core Features)

Dự án không chỉ thực hiện các chức năng CRUD cơ bản mà còn tập trung vào tính toàn vẹn dữ liệu và bảo mật hệ thống:

### 1. Bảo mật bằng Chữ ký Web3 (Cryptographic Signature)
Thay vì sử dụng JWT hay Session truyền thống (dễ bị tấn công giả mạo qua API endpoint), hệ thống yêu cầu Admin phải **ký một thông điệp mật mã (Sign Message)** trực tiếp bằng Private Key của ví Phantom. Backend sử dụng thư viện `tweetnacl` để giải mã và xác minh `PublicKey` trước khi cấp quyền, loại bỏ hoàn toàn rủi ro gọi API trái phép (Unauthorized API Calls).

### 2. Tối ưu hóa tài nguyên Blockchain (Rent Reclamation)
Smart Contract được thiết kế với cơ chế giải phóng tài nguyên chặt chẽ. Khi vòng đời của một sản phẩm kết thúc, Smart Contract sử dụng constraint `close = receiver_account` trong Anchor để thu hồi toàn bộ số dư lamports (phí Rent) trả về cho nhà sản xuất và hủy Account trên mạng lưới, tránh hiện tượng rò rỉ bộ nhớ (memory leak) trên blockchain.

### 3. Quản lý trạng thái nghiêm ngặt (State Machine & RBAC)
* **RBAC (Role-Based Access Control):** Hệ thống phân quyền động cho 5 đối tượng (Admin, Brand, Manufacturer, Driver, Client) với các Portal riêng biệt.
* **State Machine Guard:** Trạng thái sản phẩm (Pending, Approved, Rejected, Delivered, In-transit, Disputed, Purchased) được kiểm tra chéo ở cả Frontend (ẩn/hiện UI) và Backend/Contract, ngăn chặn các hành vi xác nhận vượt cấp hoặc sai quy trình.

### 4. Đồng bộ dữ liệu Hybrid (On-chain / Off-chain)
Sử dụng MongoDB để lưu trữ metadata và thông tin user nhằm tăng tốc độ truy vấn (tránh tắc nghẽn RPC Solana), đồng thời duy trì tính toàn vẹn của logic nghiệp vụ cốt lõi trên Smart Contract.

---
## 1. Dòng tiền và Cơ chế Khuyến khích Tài chính (Cash Flow Mechanism)

Mô hình dòng tiền được thiết kế nhằm quy trách nhiệm trực tiếp vào lợi ích kinh tế của từng tác nhân:

* **Nhà Sản Xuất (Manufacturer - NSX):**
    * **Chi phí khởi tạo:** Để đúc (mint) một sản phẩm lên mạng lưới Solana, NSX phải trả phí giao dịch (Gas fee) và phí duy trì tài khoản (Rent fee).
    * **Quỹ vận hành (Escrow):** Phải khóa thêm **10%** giá trị sản phẩm vào Smart Contract. Trong đó, 5% là ngân sách trả công bảo chứng cho Brand, và 5% là ngân sách trả phí vận chuyển cho Shipper.
    * **Hoàn trả (Refund):** Khi vòng đời sản phẩm kết thúc (bất kể thành công hay thất bại), Smart Contract tự động đóng Account và hoàn trả phí Rent về ví NSX, giúp tối ưu chi phí (Zero memory leak).

* **Thương hiệu Bảo chứng (Brand Owner):**
    * **Thế chấp (Staking):** Để được nhận một đơn vị sản phẩm bảo chứng, Brand bắt buộc phải khóa (Stake) một lượng tiền **bằng đúng giá trị của đơn hàng đó** vào Smart Contract làm tài sản thế chấp.
    * **Phần thưởng:** Nếu hoàn thành tốt nhiệm vụ (xử lý khiếu nại thỏa đáng, không bị báo cáo sai phạm), Brand được nhận lại toàn bộ tiền Stake cộng thêm **5% tiền hoa hồng** từ NSX.
    * **Trách nhiệm On-chain:** Phải trả phí Gas cho các giao dịch ký duyệt, làm bằng chứng pháp lý trên chuỗi.

* **Người Vận Chuyển (Shipper/Driver):**
    * **Cơ chế trả thưởng theo Node:** Nhận ngay **1%** giá trị sản phẩm cho mỗi lần chuyển giao quyền sở hữu (custody) thành công tới trạm tiếp theo, trích từ quỹ 5% vận chuyển của NSX. Phải tự chịu phí Gas khi ký xác nhận giao hàng.

* **Khách Hàng (Client):**
    * **Thanh toán Ký quỹ (Smart Contract Escrow):** Khi mua hàng, tiền thanh toán của Client không được chuyển thẳng cho NSX mà sẽ bị khóa an toàn (Locked) bên trong Account của Sản phẩm trên Blockchain.
    * **Giải ngân / Hoàn tiền (Release / Refund):** Khi sản phẩm được giao nhận thành công và không có khiếu nại, Smart Contract mới tự động mở khóa và chuyển tiền mua hàng cho NSX. Ngược lại, nếu xảy ra lỗi hoặc giao dịch thất bại, Client sẽ được hoàn tiền (Refund) 100% tự động.

---

## 2. Cơ chế Giải quyết Tranh chấp & Hình phạt (Slashing & Dispute Resolution)

Trong trường hợp xảy ra sự cố (hàng giả, hư hỏng, khiếu nại), Smart Contract sẽ tự động phân xử dựa trên dòng tiền đã khóa:

* **Luồng tiêu chuẩn (Thành công):** Sản phẩm đến tay Client an toàn -> Tiền mua hàng trong Smart Contract được chuyển cho NSX -> Brand nhận lại tiền Stake + Hoa hồng.
* **Xử lý vi phạm (Slashing):** Nếu có khiếu nại mà Brand không làm tròn bổn phận (chậm trễ xử lý, thiên vị, bị report), Smart Contract sẽ:
    1. **Hoàn tiền (Refund):** Trả lại toàn bộ tiền mua hàng đang khóa trong Contract về ví cho Client.
    2. **Tịch thu (Slashing):** Tịch thu toàn bộ số tiền Stake làm tin của Brand và bồi thường ngược lại cho NSX vì Brand đã làm ảnh hưởng uy tín của sản phẩm.

---

## 3. Lý Thuyết Trò Chơi: Quy tắc "Kiềng 3 Chân" (Nash Equilibrium)

Sức mạnh của AuthChain nằm ở sự cân bằng quyền lực tự nhiên (Lý thuyết trò chơi), nơi không một bên nào có lợi ích khi làm sai:

1. **Góc nhìn của Client:** Chỉ xuống tiền mua hàng vì có **Brand bảo chứng** và biết chắc tiền của mình đang được Smart Contract giữ (Escrow), không sợ NSX lừa đảo ôm tiền bỏ trốn.
2. **Góc nhìn của NSX:** Chấp nhận mất 5% hoa hồng để mượn uy tín của Brand, từ đó bán được hàng cho Client.
3. **Góc nhìn của Brand (Trọng tài cốt lõi):**
    * Nếu Brand *thiên vị NSX* (nhắm mắt bảo chứng hàng giả): Client sẽ mất niềm tin, không mua nữa -> NSX không bán được hàng -> Brand mất việc.
    * Nếu Brand *thiên vị Client* (ép uổng NSX bồi thường vô lý): NSX sẽ cạch mặt, không thuê Brand đó bảo chứng nữa -> Brand không có doanh thu.
    * **Kết luận:** Điểm cân bằng duy nhất (Nash Equilibrium) để Brand tồn tại và không bị mất tiền Stake là **hoạt động chuẩn mực, trung thực tuyệt đối**.

---

## 4. Giải pháp lai tạo Phygital (Chống tráo đổi Vật lý)

Để giải quyết bài toán "Oracle Problem" (sự sai lệch giữa dữ liệu trên mạng lưới và hàng hóa ngoài đời thực), dự án áp dụng rào cản vật lý:
* Sử dụng **Chip NFC độc bản (NTAG 424 DNA)** tích hợp mã hóa động.
* Khi quét NFC, chip sẽ sinh ra một mã URL thay đổi theo thời gian thực (One-Time URL) trỏ về mã QR/Contract của sản phẩm, khiến cho việc sao chép thẻ vật lý hay làm giả mã QR dán trên thùng hàng trở nên vô ích.

---

## 📖 Hướng dẫn trải nghiệm (How to test)

### Yêu cầu chuẩn bị:
1. Cài đặt tiện ích mở rộng **Phantom Wallet** trên trình duyệt.
2. Chuyển mạng trong ví Phantom sang **Devnet**.
3. Cần có sẵn một ít SOL Devnet làm phí gas (Có thể airdrop tại [faucet.solana.com](https://faucet.solana.com/)).

### Các bước kiểm thử vòng đời hệ thống:
1. **Truy cập hệ thống:** Vào link Live Demo và kết nối ví Phantom. Hệ thống mặc định gán quyền `Client` cho ví mới.
2. **Yêu cầu phân quyền:** Vào trang Profile, nhập thông tin doanh nghiệp và nộp đơn xin cấp quyền (VD: Manufacturer).
3. **Phê duyệt (Quyền Admin):** * Đăng nhập bằng ví Admin được chỉ định trong hệ thống.
   * Truy cập bảng điều khiển Admin (`/admin`), kiểm tra đơn.
   * Ký xác nhận bằng ví Phantom để phê duyệt quyền.
4. **Trải nghiệm chuỗi cung ứng:** Tùy thuộc vào quyền được cấp, người dùng sẽ truy cập các Portal tương ứng để tạo lô hàng, giao nhận và xác nhận biên bản on-chain.

---
*Dự án được phát triển nhằm mục đích nghiên cứu ứng dụng Blockchain vào thực tiễn quản trị chuỗi cung ứng.*