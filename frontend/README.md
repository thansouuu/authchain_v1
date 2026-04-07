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
* **State Machine Guard:** Trạng thái sản phẩm (Pending, In-Transit, Processed) được kiểm tra chéo ở cả Frontend (ẩn/hiện UI) và Backend/Contract, ngăn chặn các hành vi xác nhận vượt cấp hoặc sai quy trình.

### 4. Đồng bộ dữ liệu Hybrid (On-chain / Off-chain)
Sử dụng MongoDB để lưu trữ metadata và thông tin user nhằm tăng tốc độ truy vấn (tránh tắc nghẽn RPC Solana), đồng thời duy trì tính toàn vẹn của logic nghiệp vụ cốt lõi trên Smart Contract.

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