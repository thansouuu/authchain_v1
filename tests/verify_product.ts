import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";

import { VerifyProduct } from "../target/types/verify_product"; 

describe("verify_product_tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VerifyProduct as Program<VerifyProduct>;

  const nsx = anchor.web3.Keypair.generate();
  const brand = anchor.web3.Keypair.generate();
  const buyer = anchor.web3.Keypair.generate();
  const driver = anchor.web3.Keypair.generate();

  const PRODUCT_SEED = Buffer.from("PRODUCT_SEED");
  const price = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL); 
  let productPda1: anchor.web3.PublicKey; 
  let productPda2: anchor.web3.PublicKey; 

  async function airdropSol(publicKey: anchor.web3.PublicKey, amountSol: number) {
    const signature = await provider.connection.requestAirdrop(
      publicKey,
      amountSol * anchor.web3.LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });
  }

  before(async () => {
    await Promise.all([
      airdropSol(nsx.publicKey, 10),
      airdropSol(brand.publicKey, 10),
      airdropSol(buyer.publicKey, 10),
      airdropSol(driver.publicKey, 2),
    ]);
  });

  // ====================================================================
  // KỊCH BẢN 1: HAPPY PATH (Tạo -> Duyệt -> Mua -> Chuyển -> Hoàn tất)
  // ====================================================================
  describe("Kich Ban 1: Giao hang thanh cong", () => {
    const productId1 = "PROD-HAPPY-001";

    it("1. NSX khoi tao don hang (Init)", async () => {
      [productPda1] = anchor.web3.PublicKey.findProgramAddressSync(
        [PRODUCT_SEED, nsx.publicKey.toBuffer(), Buffer.from(productId1)],
        program.programId
      );

      await program.methods
        .initProduct(productId1, price)
        .accounts({
          nsx: nsx.publicKey,
          product: productPda1, // Đã thêm lại
          brand: brand.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId, // Đã thêm lại
        } as any) // <--- BÙA CHÚ ÉP TYPESCRIPT BỎ QUA LỖI GẠCH ĐỎ
        .signers([nsx])
        .rpc();

      const state = await program.account.product.fetch(productPda1);
      assert.strictEqual(state.productId, productId1);
      assert.isFalse(state.isApproved);
    });

    it("2. Brand phe duyet don hang (Approve)", async () => {
      await program.methods
        .approveProduct()
        .accounts({
          brand: brand.publicKey,
          product: productPda1,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([brand])
        .rpc();

      const state = await program.account.product.fetch(productPda1);
      assert.isTrue(state.isApproved);
    });

    it("3. Client thanh toan tien (Buy)", async () => {
      await program.methods
        .buyProduct()
        .accounts({
          buyer: buyer.publicKey,
          product: productPda1,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([buyer])
        .rpc();

      const state = await program.account.product.fetch(productPda1);
      assert.strictEqual(state.buyerPubkey.toBase58(), buyer.publicKey.toBase58());
      assert.isTrue(state.currentFunding.eq(price));
    });

    it("4. NSX giao hang cho Tai xe (Transfer)", async () => {
      await program.methods
        .transferProduct("Kho trung chuyen Binh Duong")
        .accounts({
          currentAuthority: nsx.publicKey,
          product: productPda1,
          newAuthority: driver.publicKey,
        } as any)
        .signers([nsx])
        .rpc();

      const state = await program.account.product.fetch(productPda1);
      assert.strictEqual(state.currentAuthority.toBase58(), driver.publicKey.toBase58());
    });

    it("5. Tai xe giao hang cho Client (Transfer)", async () => {
      await program.methods
        .transferProduct("Nha Client")
        .accounts({
          currentAuthority: driver.publicKey,
          product: productPda1,
          newAuthority: buyer.publicKey,
        } as any)
        .signers([driver])
        .rpc();
    });

    it("6. Client xac nhan OK, Hoan tat don hang (Finish)", async () => {
      const nsxBalanceBefore = await provider.connection.getBalance(nsx.publicKey);

      await program.methods
        .finishProduct()
        .accounts({
          currentAuthority: buyer.publicKey,
          nsxPubkey: nsx.publicKey,
          brandPubkey: brand.publicKey,
          product: productPda1,
        } as any)
        .signers([buyer])
        .rpc();

      const state = await program.account.product.fetch(productPda1);
      assert.isTrue(state.isResolved);

      const nsxBalanceAfter = await provider.connection.getBalance(nsx.publicKey);
      assert.isTrue(nsxBalanceAfter > nsxBalanceBefore); 
    });
  });

  // ====================================================================
  // KỊCH BẢN 2: DISPUTE PATH (Báo lỗi & Phân xử & Timeout)
  // ====================================================================
  describe("Kich Ban 2: Xu ly su co", () => {
    const productId2 = "PROD-ERROR-002";

    it("1. Tao va giao nhanh mot don hang cho Client", async () => {
      [productPda2] = anchor.web3.PublicKey.findProgramAddressSync(
        [PRODUCT_SEED, nsx.publicKey.toBuffer(), Buffer.from(productId2)],
        program.programId
      );

      await program.methods.initProduct(productId2, price).accounts({ nsx: nsx.publicKey, product: productPda2, brand: brand.publicKey, systemProgram: anchor.web3.SystemProgram.programId } as any).signers([nsx]).rpc();
      await program.methods.approveProduct().accounts({ brand: brand.publicKey, product: productPda2, systemProgram: anchor.web3.SystemProgram.programId } as any).signers([brand]).rpc();
      await program.methods.buyProduct().accounts({ buyer: buyer.publicKey, product: productPda2, systemProgram: anchor.web3.SystemProgram.programId } as any).signers([buyer]).rpc();
      await program.methods.transferProduct("Giao thang cho khach").accounts({ currentAuthority: nsx.publicKey, product: productPda2, newAuthority: buyer.publicKey } as any).signers([nsx]).rpc();
    });

    it("2. Client phat hien hang gia, bam nut Report (ReportError)", async () => {
      await program.methods
        .reportError("San pham khong co tem chong gia")
        .accounts({
          currentAuthority: buyer.publicKey,
          product: productPda2,
        } as any)
        .signers([buyer])
        .rpc();

      const state = await program.account.product.fetch(productPda2);
      assert.isTrue(state.hasError);
      assert.isFalse(state.isResolved);
    });

    it("3. Brand phan xu NSX sai, hoan tien cho Client (VerifyReport)", async () => {
      const nsxAtFault = true; 

      await program.methods
        .verifyReport(nsxAtFault)
        .accounts({
          brandPubkey: brand.publicKey, 
          product: productPda2,
          buyerPubkey: buyer.publicKey,
          nsxPubkey: nsx.publicKey,
        } as any)
        .signers([brand])
        .rpc();

      const state = await program.account.product.fetch(productPda2);
      assert.isTrue(state.isResolved);
      assert.isTrue(state.hasError); // NSX thực sự có lỗi, cờ giữ nguyên là True 
    });
  });


  // ====================================================================
  // KỊCH BẢN 3: CLIENT VU KHỐNG, NSX THẮNG KIỆN (nsxAtFault = false)
  // ====================================================================
  describe("Kich Ban 3: Client vu khong, NSX thang kien", () => {
    const productId3 = "PROD-FAKE-003";
    let productPda3: anchor.web3.PublicKey;

    it("1. Tao don, duyet, mua va giao hang", async () => {
      [productPda3] = anchor.web3.PublicKey.findProgramAddressSync(
        [PRODUCT_SEED, nsx.publicKey.toBuffer(), Buffer.from(productId3)],
        program.programId
      );

      // Chạy thần tốc các bước cơ bản
      await program.methods.initProduct(productId3, price).accounts({ nsx: nsx.publicKey, product: productPda3, brand: brand.publicKey, systemProgram: anchor.web3.SystemProgram.programId } as any).signers([nsx]).rpc();
      await program.methods.approveProduct().accounts({ brand: brand.publicKey, product: productPda3, systemProgram: anchor.web3.SystemProgram.programId } as any).signers([brand]).rpc();
      await program.methods.buyProduct().accounts({ buyer: buyer.publicKey, product: productPda3, systemProgram: anchor.web3.SystemProgram.programId } as any).signers([buyer]).rpc();
      await program.methods.transferProduct("Giao hang cho khach").accounts({ currentAuthority: nsx.publicKey, product: productPda3, newAuthority: buyer.publicKey } as any).signers([nsx]).rpc();
    });

    it("2. Client co tinh bao loi sai su that (Report)", async () => {
      await program.methods
        .reportError("Hang real nhung toi thich bao loi")
        .accounts({
          currentAuthority: buyer.publicKey,
          product: productPda3,
        } as any)
        .signers([buyer])
        .rpc();
        
      const state = await program.account.product.fetch(productPda3);
      assert.isTrue(state.hasError); // Cờ lỗi bật lên
    });

    it("3. Brand phan xu: NSX khong co loi (nsxAtFault = false)", async () => {
      const nsxAtFault = false; // Phán quyết: Client sai!

      await program.methods
        .verifyReport(nsxAtFault)
        .accounts({
          brandPubkey: brand.publicKey, 
          product: productPda3,
          buyerPubkey: buyer.publicKey,
          nsxPubkey: nsx.publicKey,
        } as any)
        .signers([brand])
        .rpc();

      const state = await program.account.product.fetch(productPda3);
      
      // Giám khảo assert vào việc:
      assert.isTrue(state.isResolved); // Đã phân xử xong
      assert.isFalse(state.hasError); // Client vu khống nên cờ báo lỗi phải bị tắt đi (trả lại sự trong sạch cho NSX)
    });
  });

  // ====================================================================
  // KỊCH BẢN 4: MUA HÀNG NON-MALL (CHƯA ĐƯỢC BRAND DUYỆT)
  // ====================================================================
  describe("Kich Ban 4: Khach mua hang chua kiem duyet (Non-mall)", () => {
    const productId4 = "PROD-NONMALL-004";
    let productPda4: anchor.web3.PublicKey;

    it("1. NSX khoi tao don hang nhung Brand CHUA DUYET", async () => {
      [productPda4] = anchor.web3.PublicKey.findProgramAddressSync(
        [PRODUCT_SEED, nsx.publicKey.toBuffer(), Buffer.from(productId4)],
        program.programId
      );

      await program.methods
        .initProduct(productId4, price)
        .accounts({
          nsx: nsx.publicKey,
          product: productPda4,
          brand: brand.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([nsx])
        .rpc();

      const state = await program.account.product.fetch(productPda4);
      assert.isFalse(state.isApproved); // Đảm bảo hàng chưa được duyệt
    });

    it("2. Client van chap nhan rui ro xuong tien mua", async () => {
      await program.methods
        .buyProduct()
        .accounts({
          buyer: buyer.publicKey,
          product: productPda4,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([buyer])
        .rpc();

      const state = await program.account.product.fetch(productPda4);
      
      // Giám khảo assert kiểm tra 2 thứ quan trọng nhất:
      assert.strictEqual(state.buyerPubkey.toBase58(), buyer.publicKey.toBase58()); // Client đã được ghi danh
      assert.isTrue(state.currentFunding.eq(price)); // Tiền đã được nạp đủ vào Vault dù chưa duyệt
      assert.isFalse(state.isApproved); // Cờ kiểm duyệt vẫn phải là false
    });
  });
});