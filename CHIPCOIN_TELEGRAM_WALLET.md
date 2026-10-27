# CHIPCOIN ↔ Telegram Wallet: Kế hoạch tích hợp nạp/rút USDT và quy đổi CHIP

**Phiên bản:** 1.0 — 27/10/2026  
**Trạng thái:** Kế hoạch triển khai, chưa được phê duyệt vận hành tiền thật  
**Stack dự kiến:** Go API + PostgreSQL + Next.js; tích hợp TON Connect và dịch vụ giám sát USDT trên TON.  
**Tỷ giá cố định nội bộ:** **1 USDT = 5.000.000 CHIP**.

## 0. Quyết định bắt buộc trước khi lập trình

1. **Xác nhận loại ví Telegram**: ví lưu ký Wallet trong Telegram, TON Space, Telegram Money hay ví TON khác. Các sản phẩm có cơ chế ký và khả năng TON Connect khác nhau. Không giả định có API tự động chuyển USDT từ mọi loại ví Telegram.
2. **Chọn tài sản và mạng:** MVP chỉ hỗ trợ **USDT trên TON mainnet**, xác minh jetton master từ tài liệu TON và nguồn chính thức tại thời điểm triển khai. Không nhận USDT TRC20/ERC20 hoặc jetton giả.
3. **Xác định bản chất CHIP:** MVP coi CHIP là **điểm/số dư trong sổ cái nội bộ**, không phải token on-chain. Đổi CHIP→USDT là nghĩa vụ thanh toán bằng USDT của đơn vị vận hành, cần dự trữ thực.
4. **Xác định quyền đổi/rút:** CHIP thưởng có được đổi thành USDT không? Các loại CHIP (thưởng, khuyến mại, mua bằng USDT) có thể cần hạn chế riêng để chống lạm dụng.
5. **Pháp lý và vận hành:** xác minh quy định tại thị trường phục vụ (đặc biệt Việt Nam), nghĩa vụ KYC/AML, trừng phạt, lưu ký, thuế, điều khoản sử dụng và chính sách Telegram/TON. **Không mở nạp/rút tiền thật trước khi có đánh giá pháp lý và bảo mật độc lập.**
6. **2FA cho mỗi yêu cầu nạp/rút:** yêu cầu xác thực lại bằng TOTP hoặc WebAuthn cho từng yêu cầu; đăng nhập Telegram, email OTP hoặc kết nối ví **không tự động được coi là yếu tố thứ hai**. Giao dịch từ ví ngoài vẫn cần người dùng ký/duyệt trong ví.

## 1. Mục tiêu và phạm vi

### 1.1 Các luồng MVP

| Luồng | Người dùng thao tác | Kết quả | Điều kiện ghi có/ghi nợ |
|---|---|---|---|
| Liên kết Telegram | Đăng nhập Telegram và kết nối địa chỉ TON | Lưu Telegram ID + địa chỉ đã chứng minh quyền sở hữu | Xác minh Telegram OIDC/initData + TON proof riêng biệt |
| Nạp USDT | Tạo lệnh nạp, xác minh 2FA, chuyển USDT từ ví Telegram | USDT nội bộ được ghi có | Giao dịch TON đã được xác minh và đạt chính sách finality |
| Đổi USDT→CHIP | Nhập USDT, xem tỷ giá, xác minh giao dịch | Trừ USDT nội bộ, cộng CHIP | Giao dịch ledger nguyên tử |
| Đổi CHIP→USDT | Nhập CHIP, xem tỷ giá, xác minh giao dịch | Trừ CHIP, cộng USDT nội bộ | Đủ CHIP và đủ nguồn dự trữ thanh khoản theo chính sách |
| Rút USDT | Chọn địa chỉ ví TON, xác minh 2FA, gửi yêu cầu | Chuyển USDT on-chain đến ví | Lock số dư, kiểm tra rủi ro, ký giao dịch, xác nhận on-chain |
| Theo dõi | Xem trạng thái, hash, phí, lịch sử | Minh bạch đối soát | Không suy diễn thành công chỉ từ việc gửi broadcast |

**Không nằm trong MVP:** swap on-chain CHIP/USDT; phát hành CHIP jetton; rút trực tiếp CHIP lên Telegram; đa chain; tự động thu tiền từ ví người dùng không có xác nhận; bridge hoặc giao dịch trên sàn.

### 1.2 Tỷ giá và ví dụ

- `CHIP = USDT × 5.000.000`.
- `USDT = CHIP / 5.000.000`.
- 1 USDT → 5.000.000 CHIP; 0,5 USDT → 2.500.000 CHIP; 10.000.000 CHIP → 2 USDT.
- USDT trên TON thường có **6 chữ số thập phân**; lưu số lượng bằng **số nguyên đơn vị nhỏ nhất**, không dùng `float`.
- Nếu CHIP là số nguyên, **1 micro-USDT = 5 CHIP**. Áp dụng quy tắc chia hết và làm tròn rõ ràng; từ chối yêu cầu không thể quy đổi chính xác, không âm thầm làm tròn có lợi cho hệ thống.
- Phí mạng TON tính riêng bằng TON; phí dịch vụ, mức tối thiểu, mức tối đa, hạn mức và thời gian hết hạn quote là cấu hình, không tự đặt mức phí khi chưa được phê duyệt.
- Tỷ giá cố định là **cam kết nội bộ**; không có nghĩa thị trường sẽ chấp nhận mức giá này hoặc đơn vị vận hành có đủ USDT để thanh toán.

## 2. Kiến trúc đề xuất

```text
Next.js Web / Telegram Mini App
    ├── CHIP wallet dashboard, deposit, convert, withdraw, history
    ├── Telegram Login (identity) + TON Connect (wallet ownership/approval)
    └── TOTP / WebAuthn step-up per request
                    │ HTTPS
                    ▼
Go API Gateway + Auth + Risk Engine
    ├── Telegram identity linking
    ├── Wallet & Double-entry Ledger
    ├── Conversion / Quote Engine
    ├── Deposit Intent + Chain Indexer
    ├── Withdrawal Orchestrator + Queue
    ├── 2FA Transaction Challenge
    ├── Audit / Reconciliation / Admin Review
    └── Notification / Webhook handler
                    │
       PostgreSQL + durable outbox / queue
                    │
        TON RPC/indexer (>= 2 providers)
                    │
        TON USDT Jetton contracts
                    │
      Hot wallet (limited) / Cold reserve
```

**Không giữ seed phrase/private key của ví Telegram của người dùng.** TON Connect chỉ xin quyền kết nối/ký giao dịch. Khóa ví hệ thống dùng KMS/HSM hoặc dịch vụ lưu ký chuyên dụng; tách khóa ký khỏi API công khai, hạn mức và nhiều lớp phê duyệt.

## 3. Danh sách giao diện cần phát triển

| Route gợi ý | Giao diện | Chức năng |
|---|---|---|
| `/wallet` | Tổng quan ví | CHIP, USDT available/locked, tỷ giá, giao dịch gần đây |
| `/wallet/connect` | Liên kết Telegram/TON | Telegram login, TON Connect, chứng minh quyền sở hữu, ngắt liên kết |
| `/wallet/security` | Cài đặt bảo mật | Bật TOTP/WebAuthn, recovery codes, danh sách thiết bị, khóa rút |
| `/wallet/deposit` | Nạp USDT | Tạo intent, 2FA, mạng TON, địa chỉ/QR hoặc nút mở ví, hướng dẫn phí |
| `/wallet/deposit/[id]` | Theo dõi nạp | Pending/confirmed/credited/failed, explorer link, hỗ trợ |
| `/wallet/convert` | Quy đổi | Hai chiều, tỷ giá cố định, preview, số dư, phí, xác nhận |
| `/wallet/withdraw` | Rút USDT | Ví đích, whitelist, số lượng, phí, quote, 2FA, xác nhận |
| `/wallet/withdraw/[id]` | Theo dõi rút | Review/queued/broadcast/confirmed/failed/reversed |
| `/wallet/history` | Lịch sử | Lọc loại, thời gian, trạng thái, mã giao dịch, export |
| `/wallet/transactions/[id]` | Chi tiết giao dịch | Ledger entries, phí, tx hash, timeline, khiếu nại |
| `/admin/wallets` | Admin ví | Số dư, khóa ví, hạn mức, cấu hình mạng |
| `/admin/withdrawals` | Duyệt rút | Risk flags, dual approval, reject, audit |
| `/admin/reconciliation` | Đối soát | Chain vs ledger, sai lệch, cảnh báo, điều chỉnh có kiểm soát |
| `/admin/exchange-rates` | Tỷ giá | 5.000.000 CHIP/USDT, version, ngày hiệu lực, quyền chỉnh sửa |
| `/admin/security` | Giám sát | 2FA, thiết bị, rủi ro, freeze, logs |

**UX:** không hiển thị nút “Đã nạp thành công” chỉ vì người dùng bấm xác nhận; giao diện phải chờ bằng chứng on-chain và trạng thái ghi có thực tế.

## 4. Thiết kế dữ liệu PostgreSQL

### 4.1 Các bảng chính

| Bảng | Trường cốt lõi | Ràng buộc |
|---|---|---|
| `telegram_links` | id, user_id, telegram_user_id, verified_at, revoked_at | unique active link, verified identity |
| `external_wallets` | id, user_id, network, address, proof_verified_at, status | unique/network/address, ownership proof |
| `wallet_accounts` | id, owner_type, owner_id, asset, account_type | unique(owner,asset,type) |
| `ledger_transactions` | id, type, idempotency_key, status, created_at | unique idempotency_key |
| `ledger_entries` | id, transaction_id, account_id, signed_amount_atomic | per-asset sum = 0 |
| `wallet_balance_cache` | account_id, available, locked, version | derived from ledger; optimistic lock |
| `exchange_rates` | id, base, quote, numerator, denominator, valid_from, valid_to | immutable version; 5M/1 |
| `conversion_orders` | id, user_id, from_asset, to_asset, source_amount, target_amount, rate_id, status | atomic commit |
| `deposit_intents` | id, user_id, amount_expected, deposit_address, memo_or_payload, expires_at, status | unique attribution, immutable reference |
| `chain_transfers` | id, network, master, sender, recipient, tx_hash, message_id, amount_atomic, status | unique chain event identity |
| `withdrawal_requests` | id, user_id, destination, amount, fee, status, idempotency_key, tx_hash | unique idempotency_key |
| `transaction_challenges` | id, user_id, action, canonical_payload_hash, expires_at, used_at, attempts | single-use, bound to exact request |
| `risk_decisions` | id, request_id, score, flags, decision, reviewer_id | immutable audit |
| `reconciliation_runs` | id, network, started_at, result, discrepancy_count | immutable summary |
| `audit_events` | id, actor_id, action, entity_id, before_hash, after_hash, created_at | append-only |
| `outbox_events` | id, aggregate_id, event_type, payload, status | reliable event dispatch |

### 4.2 Nguyên tắc tài chính

- Mọi chuyển số dư qua **double-entry ledger**: tổng ghi Nợ/Có theo từng tài sản phải cân bằng.
- Mỗi yêu cầu có **idempotency key**; cùng một chain event không được ghi có hai lần.
- Không cập nhật balance bằng các câu lệnh cộng/trừ rời rạc ngoài transaction.
- Tách **CHIP**, **USDT**, **TON phí mạng**, **reserve/liability**, **available**, **locked**.
- Ghi nhận trạng thái giao dịch bằng state machine; không xóa hoặc sửa ledger entry đã chốt. Sai sót xử lý bằng **compensating entry** có audit.
- Đối soát nợ USDT nội bộ và tổng lượng USDT dự trữ; giới hạn quy đổi/rút khi dự trữ không đủ.

## 5. Quy trình liên kết Telegram + TON Wallet

1. User đăng nhập CHIPCOIN theo cơ chế hiện tại.
2. User chọn **Liên kết Telegram**; xác minh Telegram qua OIDC/Login hoặc Mini App `initData` đã kiểm chữ ký và thời hạn trên backend.
3. Lưu `telegram_user_id` và thời điểm xác minh; không dựa vào `@username` làm định danh ổn định.
4. User bấm **Connect TON Wallet**; hiển thị ví tương thích; nhận địa chỉ + network.
5. Backend tạo nonce ngẫu nhiên, giới hạn thời gian; xác minh `ton_proof`/chữ ký và domain; đánh dấu địa chỉ được chứng minh quyền sở hữu.
6. Kiểm tra một địa chỉ có đang liên kết tài khoản khác; xử lý thay đổi ví bằng step-up auth, thời gian chờ và cảnh báo.
7. Lưu thông tin public; **không yêu cầu seed phrase**.
8. Telegram link **khác** TON wallet link; có Telegram ID không chứng minh quyền sở hữu ví.

## 6. Quy trình nạp USDT từ Telegram vào CHIPCOIN

```text
Create deposit intent → 2FA → Show deposit instruction / TON Connect
→ User authorizes transfer in external wallet → TON monitor
→ Validate USDT master, recipient, sender/event, amount, attribution
→ Wait chain settlement policy → Idempotent ledger credit USDT
→ Notify user → Optional separate USDT→CHIP conversion
```

- **2FA bắt buộc trước khi phát hành yêu cầu nạp** theo yêu cầu sản phẩm; không thể ngăn một người gửi USDT tự phát tới địa chỉ on-chain. Giao dịch ngoài intent phải được ghi nhận vào hàng chờ điều tra/hoàn trả, **không tự động ghi có**.
- Ưu tiên **địa chỉ nạp riêng cho từng user** nếu vận hành cho phép; nếu dùng địa chỉ chung, cần invoice/payload/memo đã được kiểm tra chặt, không dựa vào số tiền đơn thuần.
- TON indexer kiểm tra đúng jetton master USDT, jetton wallet hợp lệ, người nhận, số tiền, event identity, trạng thái giao dịch và chính sách finality; không tin webhook một mình.
- Nạp thiếu/đủ/thừa, nạp sai mạng, chuyển không có memo, chuyển lại cùng tx, chuyển chậm, chain reorg/gián đoạn RPC: có trạng thái và quy trình xử lý riêng.
- Nếu nguồn gửi là ví lưu ký Telegram, sender on-chain có thể là địa chỉ của nhà cung cấp; không bắt buộc sender trùng địa chỉ đã liên kết nếu phương thức ví không bảo đảm điều đó. Phải dùng attribution đáng tin cậy khác.

## 7. Quy trình quy đổi hai chiều

1. Client gọi API lấy quote: `from`, `amount`, `rate_version`, `receive`, `fees`, `expires_at`.
2. Backend tính số nguyên chính xác; validate min/max và available balance.
3. Backend tạo challenge ràng buộc **user + loại giao dịch + số lượng + tài sản + tỷ giá + thời hạn**.
4. User xác minh TOTP/WebAuthn; challenge chỉ dùng một lần.
5. Transaction DB khóa tài khoản liên quan, kiểm tra lại số dư/quote/rate, thực hiện ledger entries nguyên tử.
6. Ghi order thành công và phát outbox event; không gọi blockchain cho chuyển đổi nội bộ.
7. Đổi CHIP→USDT chỉ khả dụng khi chính sách cho phép và quỹ USDT đủ bảo đảm nghĩa vụ thanh toán.

## 8. Quy trình rút USDT sang Telegram Wallet

```text
Enter destination + amount → verify destination ownership/whitelist
→ preview fee and amount → 2FA challenge bound to exact request
→ risk checks / AML / limits → lock USDT
→ review or auto-approve → signing service creates TON jetton transfer
→ broadcast → monitor finalized transfer → settle ledger → notify
```

**State machine:** `DRAFT → AWAITING_2FA → AUTHORIZED → RISK_REVIEW → QUEUED → SIGNING → BROADCAST → CONFIRMED → SETTLED`.

Nhánh lỗi: `REJECTED`, `EXPIRED`, `CANCELLED`, `FAILED_RETRYABLE`, `FAILED_FINAL`, `MANUAL_REVIEW`.

- 2FA **không** thay thế phê duyệt ký giao dịch on-chain từ ví hệ thống.
- Khóa số dư ngay sau khi chấp nhận yêu cầu; chống rút song song/double-spend.
- Dùng nonce/seqno, dedup, timeout, retry có kiểm soát. Không ký lại giao dịch nếu chưa xác minh trạng thái broadcast trước.
- Không tự động hoàn USDT locked nếu trạng thái on-chain còn mơ hồ; chuyển manual review.
- Chỉ gửi đến địa chỉ TON đã được xác minh hoặc whitelist theo chính sách; bắt buộc cảnh báo rút sai mạng là không thể hoàn tác.
- Với số tiền lớn: phê duyệt hai người, thời gian chờ, hot-wallet limit và cold-reserve top-up.

## 9. Xác minh 2 lớp cho **từng** yêu cầu

**Mô hình khuyến nghị:** phiên đăng nhập hợp lệ (yếu tố 1) + TOTP hoặc WebAuthn step-up (yếu tố 2). Ưu tiên WebAuthn chống phishing; TOTP là phương án dự phòng. Email OTP chỉ dùng như kênh bổ trợ, không coi email và mật khẩu cùng tài khoản là hai yếu tố độc lập trong mọi trường hợp.

1. Enrollment: kích hoạt TOTP/WebAuthn bằng phiên đăng nhập gần đây, backup codes một lần, thông báo email/Telegram; thay đổi 2FA phải qua cooldown và kiểm soát rủi ro.
2. Khi **tạo yêu cầu nạp**: step-up auth, ký challenge gắn `deposit_intent_id` + amount + expiry; một yêu cầu = một challenge.
3. Khi **tạo yêu cầu rút**: step-up auth gắn chính xác destination + network + amount + fee + request_id. Đổi bất kỳ trường nào → challenge mới.
4. Khi **quy đổi**: áp dụng step-up cho mỗi lệnh theo khuyến nghị (ngoài yêu cầu bắt buộc nạp/rút).
5. Challenge sống ngắn (ví dụ 3–5 phút, cần phê duyệt chính sách), single-use, rate limit, khóa sau nhiều lần sai, log sự kiện, chống CSRF/replay.
6. Backend không lưu TOTP secret plaintext; mã hóa bằng KMS, backup code hash; chống sử dụng lại mã trong cùng time-step khi thích hợp.
7. Không cho phép tắt 2FA khi đang có rút pending mà không có quy trình recovery được phê duyệt.
8. **Phân biệt rõ**: 2FA CHIPCOIN xác nhận ý định trên web; TON Connect/Telegram Wallet ký giao dịch thực tế khi gửi tiền từ ví ngoài.

## 10. API thiết kế sơ bộ

| Method | Endpoint | Mục đích |
|---|---|---|
| `POST` | `/api/v1/telegram/link/start` | Bắt đầu liên kết |
| `POST` | `/api/v1/telegram/link/verify` | Xác minh Telegram |
| `POST` | `/api/v1/wallets/ton/proof/challenge` | Nonce chứng minh ví |
| `POST` | `/api/v1/wallets/ton/proof/verify` | Kiểm tra chữ ký ví |
| `GET` | `/api/v1/wallets/balances` | Số dư CHIP/USDT |
| `POST` | `/api/v1/security/2fa/enroll` | Đăng ký 2FA |
| `POST` | `/api/v1/security/challenges` | Challenge theo giao dịch |
| `POST` | `/api/v1/security/challenges/verify` | Verify single-use challenge |
| `POST` | `/api/v1/deposits/intents` | Tạo lệnh nạp |
| `GET` | `/api/v1/deposits/{id}` | Trạng thái nạp |
| `POST` | `/api/v1/conversions/quotes` | Quote đổi tiền |
| `POST` | `/api/v1/conversions` | Thực hiện đổi tiền |
| `POST` | `/api/v1/withdrawals` | Tạo lệnh rút |
| `GET` | `/api/v1/withdrawals/{id}` | Trạng thái rút |
| `GET` | `/api/v1/wallets/transactions` | Lịch sử |
| `POST` | `/api/v1/admin/withdrawals/{id}/review` | Duyệt / từ chối |
| `GET` | `/api/v1/admin/reconciliation` | Báo cáo đối soát |

Mọi API thay đổi tiền phải kiểm tra authz/ownership, idempotency, rate limit, CSRF (nếu cookie session), payload validation và audit; 2FA được **tiêu thụ nguyên tử** cùng việc tạo lệnh.

## 11. Lộ trình triển khai theo thứ tự (12 phase)

| Phase | Công việc cụ thể | Deliverable | Điều kiện hoàn tất |
|---|---|---|---|
| **0 — Discovery** | Xác định loại ví Telegram, chain, CHIP nội bộ, mô hình custody, pháp lý, phí, giới hạn | `docs/wallet/00-decisions.md` | Product + security + legal sign-off |
| **1 — Threat model** | Sơ đồ trust boundaries, lạm dụng referral, double credit, wallet compromise, insider risk | `docs/wallet/01-threat-model.md` | Review rủi ro mức cao |
| **2 — Database** | Migration ledger, wallet links, intents, withdrawals, challenges, outbox | `migrations/006_wallet_core.sql` (số thứ tự xác nhận sau) | Migration up/down + invariant tests |
| **3 — Ledger** | Accounts, atomic posting, lock, reservation, idempotency, reversal | `services/api/internal/wallet/ledger/` | Property tests: per-asset zero sum; no negative available |
| **4 — 2FA** | TOTP/WebAuthn enrollment, step-up, backup, challenge bound to payload | `services/api/internal/security/` | Replay, expiry, brute force, concurrent tests pass |
| **5 — Telegram/TON Connect** | OIDC/initData, wallet proof, link/unlink, chain selection | `services/api/internal/telegram/`, `apps/web/app/wallet/connect/` | Invalid signature / wrong domain rejected |
| **6 — Deposit** | Intent, deposit address strategy, TON indexer, event verification, credit | `services/api/internal/deposit/` | Duplicate/fake jetton/wrong memo never credit |
| **7 — Conversion** | Fixed-rate quote, two-way conversion, limits, liquidity check | `services/api/internal/conversion/` | Exact integer accounting and atomicity |
| **8 — Withdrawal** | Approval, lock, queue, signing, broadcast, chain monitor, recovery | `services/api/internal/withdrawal/` | Retry/timeout never double-send |
| **9 — UI/UX** | Wallet pages, states, history, QR, security, notifications | `apps/web/app/wallet/` | E2E happy/failed paths; accessible UX |
| **10 — Admin & Ops** | Risk review, reconciliation, reserve dashboard, freeze, alerts, incident runbooks | `apps/web/app/admin/`, `docs/wallet/runbooks/` | Discrepancy alerts and dual control |
| **11 — Pilot & Launch** | Mock tests → TON testnet → restricted mainnet pilot → security audit → rollout | Test reports, audit, deployment checklist | Legal sign-off, reserve verification, zero critical findings |

**Ước lượng định hướng, không cam kết:** 8–16 tuần cho MVP có kiểm thử với nhóm nhỏ giàu kinh nghiệm, **chưa** bao gồm thời gian phê duyệt pháp lý, đối tác lưu ký, audit và sửa lỗi. Không bắt đầu phase tiếp theo khi tiêu chí an toàn của phase trước chưa đạt.

## 12. Cấu trúc thư mục dự kiến

```text
D:\DAOCOIN\
├── apps/web/app/wallet/
│   ├── page.tsx
│   ├── connect/page.tsx
│   ├── security/page.tsx
│   ├── deposit/page.tsx
│   ├── convert/page.tsx
│   ├── withdraw/page.tsx
│   └── history/page.tsx
├── services/api/internal/
│   ├── wallet/ledger/
│   ├── telegram/
│   ├── ton/
│   ├── security/
│   ├── deposit/
│   ├── conversion/
│   ├── withdrawal/
│   ├── risk/
│   └── reconciliation/
├── migrations/006_wallet_core.sql
└── docs/wallet/
    ├── 00-decisions.md
    ├── 01-threat-model.md
    ├── 02-api-contracts.md
    ├── 03-state-machines.md
    ├── 04-test-matrix.md
    └── runbooks/
```

Tên file là **đề xuất**; kiểm tra migration hiện có trước khi đặt số tiếp theo. Không viết đè các module auth hiện tại.

## 13. Ma trận kiểm thử bắt buộc

- **Authentication:** giả mạo Telegram initData/OIDC, nonce TON proof cũ, sai domain, thay đổi địa chỉ, mất phiên.
- **2FA:** sai TOTP, mã hết hạn, mã dùng lại, đổi destination sau xác minh, 10 request đồng thời, brute force.
- **Deposit:** USDT jetton giả, sai master, sai chain, thiếu memo, tx duplicate, webhook replay, sender custody, amount mismatch, chain monitor outage.
- **Conversion:** 1 micro-USDT, CHIP không chia hết, overflow, rounding, 2 lệnh cùng lúc, quote expired, reserve insufficient.
- **Withdrawal:** double click, retry worker, timeout sau broadcast, seqno collision, không đủ TON gas, rút sai địa chỉ, manual hold, hot wallet empty.
- **Ledger:** rollback giữa chừng, crash trước/sau commit, outbox replay, zero-sum invariant, reconciliation mismatch.
- **Ops:** KMS unavailable, RPC divergence, compromised admin, freeze switch, alert latency, backup/restore, disaster recovery.
- **Security:** pentest, dependency scan, secrets scan, RBAC, audit immutability, supply chain review.

## 14. Go-live gates / điều kiện không được bỏ qua

- [ ] Loại Telegram Wallet và khả năng TON Connect/transfer đã được thử nghiệm trên ví mục tiêu.
- [ ] USDT jetton master và network được allowlist; fake jetton không thể ghi có.
- [ ] Có mô hình tài chính cho **1 USDT = 5.000.000 CHIP** và đủ dự trữ cho nghĩa vụ USDT.
- [ ] KYC/AML, sanctions, chính sách dịch vụ, giấy phép/đánh giá pháp lý được chấp thuận.
- [ ] Ledger, idempotency, 2FA từng lệnh, withdrawal signing đã qua kiểm thử đối kháng.
- [ ] Hạn mức hot wallet, cold reserve, multi-approval, emergency pause, on-call đã sẵn sàng.
- [ ] Đối soát tự động và quy trình xử lý sai lệch được chạy thử.
- [ ] TON testnet và mainnet pilot số tiền nhỏ hoàn tất, audit độc lập không còn lỗi nghiêm trọng.
- [ ] Monitoring, cảnh báo, runbook, backup/restore, RPO/RTO được phê duyệt.

## 15. Các câu hỏi cần chốt với Product Owner

1. Người dùng dùng **Wallet trong Telegram (custodial)**, **TON Space**, **Telegram Money** hay ví khác?
2. CHIP là điểm thưởng hay token blockchain? CHIP kiếm từ nhiệm vụ có được rút ra USDT không?
3. Người dùng **nạp USDT vào số dư USDT trước**, rồi tự đổi CHIP, hay **nạp tự động đổi CHIP**?
4. Phí nạp/rút/quy đổi, min/max, hạn mức ngày, thời gian khóa, đối tượng được phép dùng?
5. Có cần KYC trước rút? Quốc gia phục vụ? Ai là đơn vị chịu trách nhiệm giữ USDT?
6. USDT dự trữ nằm ở ví hệ thống, bên lưu ký hay nhà cung cấp thanh toán?
7. Có cần hỗ trợ Telegram Mini App ngay ở MVP hay chỉ website Next.js?
8. 2FA ưu tiên TOTP, WebAuthn hay kết hợp; có chấp nhận email OTP làm kênh bổ trợ?

## 16. Tài liệu chính thức để đội phát triển đối chiếu

- Telegram Login: https://core.telegram.org/bots/telegram-login
- Telegram Mini Apps và kiểm tra `initData`: https://core.telegram.org/bots/webapps
- TON Connect: https://docs.ton.org/applications/ton-connect/overview
- TON Jetton payments / USDT validation: https://docs.ton.org/applications/payments/jettons
- TON Jetton overview: https://docs.ton.org/standard/tokens/jettons/overview
- TON WalletTg integration: https://docs.ton.org/contracts/standard/wallets/telegram/integrate

> **Cảnh báo triển khai:** Đây là tài liệu kiến trúc/kế hoạch, không phải chứng nhận tính hợp pháp hoặc an toàn cho việc nhận giữ và đổi tài sản mã hóa. Không sử dụng tiền thật cho đến khi hoàn tất các go-live gates.
