# 🔗 AuthChain - Decentralized Supply Chain & Role Management

**AuthChain** là một hệ thống quản lý chuỗi cung ứng và phân quyền phi tập trung (dApp) được xây dựng trên nền tảng blockchain Solana. Dự án kết hợp sức mạnh của Web3 (Minh bạch, Không thể giả mạo) và Web2 (Trải nghiệm người dùng, Tốc độ) để giải quyết bài toán truy xuất nguồn gốc sản phẩm và quản lý định danh các tác nhân trong chuỗi cung ứng.

🌍 **Live Demo:** [https://authchain-v1.vercel.app](https://authchain-v1.vercel.app)

---

## 🛠 Công nghệ sử dụng (Tech Stack)

Dự án sử dụng kiến trúc Hybrid (Web2 + Web3) để tối ưu hóa hiệu năng, chi phí và trải nghiệm:

* **Blockchain / Smart Contract:** Solana (Devnet), Anchor Framework (Rust).
* **Frontend:** React.js, Tailwind CSS, Solana Wallet Adapter, React Router v6.
* **Backend & API:** Node.js, Express.js, TweetNaCl (Xác thực mật mã học Web3).
* **Database & Storage:** MongoDB (Lưu trữ Metadata Off-chain), **Cloudinary** (Lưu trữ và tối ưu hóa hình ảnh).
* **Deployment:** Vercel (Frontend SPA), Render (Backend API).

---

## 🔥 Tính năng kỹ thuật nổi bật (Core Features)

Dự án không chỉ thực hiện các chức năng CRUD cơ bản mà còn tập trung vào tính toàn vẹn dữ liệu và bảo mật hệ thống:

### 1. Bảo mật bằng Chữ ký Web3 (Cryptographic Signature)
Thay vì sử dụng JWT hay Session truyền thống (dễ bị tấn công giả mạo), hệ thống yêu cầu Admin phải **ký một thông điệp mật mã (Sign Message)** trực tiếp bằng Private Key của ví Phantom. Backend sử dụng thư viện `tweetnacl` để giải mã và xác minh `PublicKey` trước khi cấp quyền, loại bỏ hoàn toàn rủi ro gọi API trái phép (Unauthorized API Calls).

### 2. Tối ưu hóa tài nguyên Blockchain (Rent Reclamation)
Smart Contract được thiết kế với cơ chế giải phóng tài nguyên chặt chẽ. Khi vòng đời của một sản phẩm kết thúc, Smart Contract sử dụng constraint `close = receiver_account` trong Anchor để thu hồi toàn bộ số dư lamports (phí Rent) trả về cho nhà sản xuất và hủy Account trên mạng lưới, tránh hiện tượng rò rỉ bộ nhớ (memory leak) trên Solana.

### 3. Quản lý trạng thái nghiêm ngặt (State Machine & RBAC)
* **RBAC (Role-Based Access Control):** Hệ thống phân quyền động cho 5 đối tượng (Admin, Brand, Manufacturer, Driver, Client) với các Portal riêng biệt.
* **State Machine Guard:** Trạng thái sản phẩm (Pending, Approved, Rejected, Delivered, In-transit, Disputed, Purchased) được kiểm tra chéo ở cả Frontend (ẩn/hiện UI) và Contract.

### 4. Đồng bộ dữ liệu Hybrid (On-chain / Off-chain)
Sử dụng MongoDB kết hợp Cloudinary để lưu trữ hình ảnh và metadata nhằm tăng tốc độ truy vấn (tránh tắc nghẽn RPC Solana), đồng thời duy trì tính toàn vẹn của logic nghiệp vụ cốt lõi trên Smart Contract.

---

## 💰 Mô hình Kinh tế & Quản trị Niềm tin (Tokenomics & Trust Model)

### 1. Dòng tiền và Cơ chế Khuyến khích Tài chính (Cash Flow Mechanism)
Mô hình quy trách nhiệm trực tiếp vào lợi ích kinh tế của từng tác nhân:
* **Nhà Sản Xuất (Manufacturer):** Phải khóa **10%** giá trị sản phẩm vào quỹ vận hành (Escrow). Trong đó, 5% trả công bảo chứng cho Brand, và 5% trả phí vận chuyển cho Shipper. Được hoàn phí Rent khi đóng Account.
* **Thương hiệu Bảo chứng (Brand Owner):** Bắt buộc phải **Stake (thế chấp)** một lượng tiền bằng đúng giá trị đơn hàng. Nếu làm tốt nhiệm vụ xử lý khiếu nại, nhận lại tiền Stake + 5% hoa hồng.
* **Người Vận Chuyển (Shipper):** Nhận 1% giá trị sản phẩm cho mỗi lần chuyển giao quyền sở hữu (custody) thành công tới trạm tiếp theo.
* **Khách Hàng (Client):** Tiền mua hàng được **khóa trong Smart Contract (Escrow)**. Chỉ giải ngân cho nhà sản xuất khi nhận hàng thành công, tự động Refund 100% nếu có lỗi sự cố từ phía NSX hay Brand.

### 2. Lý Thuyết Trò Chơi: Quy tắc "Kiềng 3 Chân" (Nash Equilibrium)
Sức mạnh của AuthChain nằm ở sự cân bằng quyền lực tự nhiên:
* **Client:** Tin tưởng xuất tiền vì có Brand bảo chứng và Smart Contract giữ hộ tiền.
* **Manufacturer:** Chia sẻ lợi nhuận (5%) để mượn uy tín của Brand giúp bán được hàng.
* **Brand (Trọng tài):** Buộc phải **trung thực tuyệt đối**. Nếu thiên vị Manufacturer (bảo chứng hàng giả) sẽ mất khách hàng; nếu ép uổng Client sẽ mất uy tín.

### 3. Giải pháp lai tạo Phygital (Chống tráo đổi Vật lý)
Sử dụng **Chip NFC độc bản (NTAG 424 DNA)** tích hợp mã hóa động. Khi quét NFC, chip sinh ra One-Time URL trỏ về Contract của sản phẩm, vô hiệu hóa việc sao chép thẻ vật lý hay làm giả mã QR.

---

## 📖 Hướng dẫn trải nghiệm (How to test)

### Yêu cầu chuẩn bị:
1. Cài đặt tiện ích mở rộng **Phantom Wallet**.
2. Chuyển mạng trong ví sang **Devnet**.
3. Airdrop SOL Devnet làm phí gas tại [faucet.solana.com](https://faucet.solana.com/).

### Các bước kiểm thử vòng đời hệ thống:
1. **Truy cập hệ thống:** Kết nối ví Phantom (Mặc định quyền `Client`).
2. **Yêu cầu phân quyền:** Vào trang Profile, nộp đơn xin cấp quyền (VD: Manufacturer).
3. **Phê duyệt:** Đăng nhập bằng ví Admin (`/admin`), kiểm tra đơn và ký xác nhận on-chain để phê duyệt.
4. **Trải nghiệm:** Tùy thuộc vào quyền được cấp, truy cập các Portal tương ứng để đúc lô hàng, giao nhận, quét QR và phán xử tranh chấp.

---

## ⚠️ Known Issues (Các vấn đề đang khắc phục)

Trong phiên bản Version 1 hiện tại, dự án vẫn còn một số điểm giới hạn đang được em khắc phục trong các bản patch tiếp theo:

1. **Hiển thị định danh chưa tối ưu (UX):** Trong phần Lịch sử (History / Timeline), hệ thống đang hiển thị địa chỉ ví công khai (Public Key) dài của người dùng thay vì ánh xạ (mapping) qua Tên doanh nghiệp/người dùng, gây bất tiện trong việc theo dõi luồng di chuyển.
2. **Lỗi xác thực chữ ký Admin:** Chức năng phê duyệt quyền (Role Approval) trên trang Admin thỉnh thoảng bị gián đoạn do lỗi mismatch định dạng decode chữ ký (Signature Format Error) khi truyền từ Frontend (Phantom Wallet) xuống Backend.
3. **Bất đồng bộ trạng thái UI (State Sync Issue):** Đang thiếu cờ trạng thái xử lý logic cục bộ trên Database (MongoDB). Dẫn đến việc: Khi Brand phán xử thành công trên Blockchain, Frontend của Client/NSX chưa tự động ẩn nút "Report", và trang Brand vẫn hiển thị lại đơn hàng tranh chấp khi Reload trang. *(Lưu ý: Blockchain Core Logic vẫn an toàn tuyệt đối, Contract đã tự động block các giao dịch Replay Attack này, đây thuần túy là lỗi hiển thị UI).*
4. **Chưa tương thích toàn diện thiết bị di động:** Giao diện chưa được Responsive hoàn toàn, một số bảng biểu (Data Tables) ở `Manufacturer Portal` và `Brand Portal` có thể bị tràn viền (overflow) trên màn hình điện thoại.

---

## 👨‍💻 Tác giả & Quá trình Phát triển (Author & Development)

* **Tác giả:** Duy Hua (aka *Thansouu* / *bunhatv*)
* **Phương pháp phát triển :** có sự ứng dụng của Vibe coding. 

---
*Dự án được phát triển nhằm mục đích nghiên cứu ứng dụng Blockchain vào thực tiễn quản trị chuỗi cung ứng.*