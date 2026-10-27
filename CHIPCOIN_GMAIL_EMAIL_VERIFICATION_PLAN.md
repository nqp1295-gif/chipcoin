# CHIPCOIN — Kế hoạch tích hợp Gmail để xác thực email đăng ký

**Ngày lập:** 27/10/2026  
**Email gửi dự kiến:** `medubaiso1@gmail.com`  
**Stack:** Go API + Next.js + PostgreSQL  
**Trạng thái:** Kế hoạch triển khai; chưa kết nối Gmail, chưa gửi email thật.

## 1. Mục tiêu và phạm vi

- Gửi liên kết xác thực khi người dùng đăng ký CHIPCOIN.
- Chỉ kích hoạt tài khoản sau khi xác thực token hợp lệ; gửi email thông báo kết quả thành công.
- Hỗ trợ gửi lại liên kết, chống spam, chống dò mã, ghi log và xử lý lỗi gửi.
- Không dùng Gmail để nhận OTP đăng nhập hay thực hiện hành động tài chính trong phạm vi này.
- **Không yêu cầu mật khẩu Gmail thông thường, không lưu App Password trong mã nguồn hoặc Git.**

### Luồng nghiệp vụ

```mermaid
sequenceDiagram
  participant U as Người dùng
  participant W as Next.js
  participant A as Go API
  participant DB as PostgreSQL
  participant Q as Email worker
  participant G as Gmail SMTP
  U->>W: Đăng ký email + mật khẩu
  W->>A: POST /auth/register
  A->>DB: Tạo user PENDING + token hash + outbox (cùng transaction)
  A-->>W: Phản hồi trung tính
  Q->>DB: Claim email chưa gửi
  Q->>G: Gửi email xác thực
  G-->>U: Email có liên kết xác thực
  U->>W: Mở liên kết
  W->>A: POST /auth/verify-email (token)
  A->>DB: Kiểm tra token hash, hạn dùng, trạng thái; kích hoạt atomically
  A->>DB: Tạo outbox email kết quả
  A-->>W: Thành công / hết hạn / đã dùng
  Q->>G: Gửi email xác thực thành công
```

## 2. Khảo sát hệ thống trước khi sửa code (Phase 0)

Các đường dẫn dưới đây là vị trí **dự kiến cần kiểm tra**, không khẳng định code hiện tại đã hoàn chỉnh:

| Đường dẫn | Công việc rà soát |
|---|---|
| `services/api/internal/auth/handler.go` | Endpoint đăng ký, validation, trạng thái user |
| `services/api/internal/auth/verification_service.go` | Token, hạn dùng, chống sử dụng lại |
| `services/api/internal/auth/resend_verification_service.go` | Gửi lại, cooldown, giới hạn |
| `services/api/internal/auth/outbox_repository.go` | Outbox transactional, idempotency |
| `services/api/internal/email/sender.go` | Interface gửi email |
| `services/api/internal/email/worker.go` | Retry, lock, backoff |
| `services/api/internal/email/verification_url.go` | Tạo link, domain allowlist |
| `services/api/internal/config/email.go` | Đọc và kiểm tra env |
| `apps/web/app/register/page.tsx` | UI đăng ký |
| `apps/web/app/verify-email/page.tsx` | UI xác thực |
| `apps/web/app/resend-verification/page.tsx` | UI gửi lại |
| `migrations/003_email_verification.sql`, `004_email_verification_resend.sql`, `005_email_outbox.sql` | Kiểm tra schema thực tế, migration đã chạy |

**Lệnh kiểm tra ban đầu (PowerShell):**

```powershell
cd D:\DAOCOIN
 git status
cd services\api
 go test ./... -count=1
 go vet ./...
```

**Tiêu chí hoàn thành:** ghi nhận endpoint hiện hữu, schema thực tế, cấu hình đang dùng, test baseline; lập danh sách phần thiếu thay vì viết lại toàn bộ.

## 3. Thiết lập tài khoản Gmail gửi mail (Phase 1)

1. Đăng nhập tài khoản Google `medubaiso1@gmail.com` bằng trình duyệt riêng; kiểm tra khả năng đăng nhập và khôi phục tài khoản.
2. Bật **Xác minh 2 bước** trong Google Account > Security.
3. Nếu tài khoản đủ điều kiện, tạo **App Password** riêng đặt tên `CHIPCOIN SMTP`. App Password có thể không khả dụng với một số cấu hình tài khoản/chính sách bảo mật. Không tắt bảo mật để cố kích hoạt.
4. Lưu App Password vào secret manager hoặc biến môi trường riêng trên máy chủ. **Không gửi mật khẩu qua chat, không commit vào Git, không đưa vào ảnh chụp màn hình.**
5. Dùng Gmail SMTP: host `smtp.gmail.com`, cổng `587` (STARTTLS) hoặc `465` (TLS trực tiếp); tài khoản đăng nhập `medubaiso1@gmail.com`.
6. Tên hiển thị người gửi: `CHIPCOIN | Xác thực tài khoản`. From phải khớp địa chỉ được phép gửi; không giả mạo domain.
7. Thử gửi tới địa chỉ thử nghiệm do bạn sở hữu; kiểm tra Inbox, Spam, nội dung HTML và link.
8. Nếu App Password không khả dụng, đánh giá OAuth 2.0/XOAUTH2 hoặc dịch vụ email giao dịch chuyên dụng. Gmail cá nhân có giới hạn gửi, chống spam và không có SLA giao dịch.

**Nguồn chính thức để đối chiếu cấu hình:**
- Google App Passwords: https://support.google.com/accounts/answer/185833
- Gmail SMTP settings: https://support.google.com/mail/answer/7126229
- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2

## 4. Cấu hình môi trường (Phase 2)

Thêm vào file `.env` **không được commit** (giá trị minh họa, không phải credential thật):

```dotenv
EMAIL_PROVIDER=gmail_smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=jinofc.ytb@gmail.com
SMTP_PASSWORD=<LOAD_FROM_SECRET_STORE>
SMTP_FROM_EMAIL=jinofc.ytb@gmail.com
SMTP_FROM_NAME="CHIPCOIN | Xác thực tài khoản"
SMTP_STARTTLS_REQUIRED=true
PUBLIC_WEB_URL=https://<your-chipcoin-domain>
EMAIL_VERIFICATION_TTL_MINUTES=15
EMAIL_RESEND_COOLDOWN_SECONDS=60
EMAIL_RESEND_MAX_PER_HOUR=3
EMAIL_WORKER_ENABLED=true
```

- `.env.example` chỉ chứa placeholder, không chứa khóa thật.
- Phân biệt local/staging/production; staging sử dụng mailbox thử nghiệm và domain thử nghiệm.
- Kiểm tra `PUBLIC_WEB_URL` thuộc danh sách domain được phép, bắt buộc HTTPS ở production.
- Không log `SMTP_PASSWORD`, token xác thực hoặc URL chứa token.
- Khi triển khai Docker, truyền secret qua secret manager hoặc cơ chế secrets phù hợp; không hardcode trong `compose.yaml`.

**Tiêu chí hoàn thành:** API khởi động và báo lỗi cấu hình rõ ràng nếu thiếu biến bắt buộc; secret không xuất hiện trong repository hoặc log.

## 5. Thiết kế dữ liệu và trạng thái (Phase 3)

Kiểm tra/tái sử dụng migration hiện có trước khi thêm migration mới:

| Thành phần | Trường/ý nghĩa cần có |
|---|---|
| `users` | `id`, `email` chuẩn hóa, `password_hash`, `email_verified_at`, `status`, timestamps |
| `email_verification_tokens` | `user_id`, `token_hash`, `expires_at`, `consumed_at`, `created_at`, `purpose` |
| `email_outbox` | `id`, `event_type`, `recipient`, `template`, `payload` an toàn, `status`, `attempts`, `next_attempt_at`, `sent_at`, `last_error_code` |
| `audit_events` | hành động, user, request id, thời gian, kết quả; không lưu token thô |

**Quy tắc:**
- Token ngẫu nhiên đủ mạnh (ít nhất 32 byte CSPRNG); URL-safe encoding; lưu **hash** token trong DB.
- Token chỉ dùng một lần, hạn 15 phút, ràng buộc user/purpose; tạo token mới làm vô hiệu token cũ theo chính sách.
- Unique index trên email đã chuẩn hóa; tránh race khi đăng ký đồng thời.
- Thay đổi trạng thái user và đánh dấu token consumed trong **một transaction**.
- Outbox ghi cùng transaction với nghiệp vụ phát sinh email để không mất thông báo.
- Không gửi email trực tiếp trong transaction DB; worker gửi bất đồng bộ.
- Worker phải có cơ chế claim/lock, retry có backoff và tránh gửi đồng thời trùng job. SMTP không bảo đảm exactly-once: có thể có trường hợp đã gửi nhưng chưa ghi nhận; thiết kế nội dung và kiểm soát retry phù hợp.

## 6. Backend Go: API và xử lý xác thực (Phase 4)

### API đề xuất (đối chiếu router hiện có)

| Method | Endpoint đề xuất | Tác dụng |
|---|---|---|
| `POST` | `/auth/register` | Tạo tài khoản chưa xác thực, tạo token + outbox |
| `POST` | `/auth/verify-email` | Nhận token, xác minh, kích hoạt tài khoản |
| `POST` | `/auth/resend-verification` | Gửi lại có cooldown/rate limit |
| `GET` | `/auth/email-verification-status` | Trạng thái tài khoản của phiên hợp lệ (nếu cần) |

**Các bước triển khai:**
1. Rà soát endpoint hiện hữu, tránh đổi đường dẫn gây hỏng frontend.
2. Validate email và password; chuẩn hóa email; hash password bằng thuật toán phù hợp đã được hệ thống sử dụng.
3. Khi đăng ký, tạo `PENDING_VERIFICATION`; tạo token hash và outbox trong transaction.
4. Trả phản hồi trung tính nhằm hạn chế lộ email đã tồn tại; không trả token ra client/log.
5. Worker render template với biến đã escape và gửi SMTP qua TLS có xác thực chứng chỉ.
6. Khi click link, frontend lấy token và gọi API bằng POST; API kiểm tra hash, TTL, trạng thái và tính một lần.
7. Nếu hợp lệ: đánh dấu `email_verified_at`, cập nhật trạng thái `ACTIVE`, consume token, enqueue email thông báo thành công.
8. Nếu token hết hạn/đã dùng: trả mã lỗi có cấu trúc; UI cho phép gửi lại khi đủ điều kiện.
9. Resend: giới hạn theo IP + email + user; phản hồi không tiết lộ email có tồn tại hay không; cooldown 60 giây, tối đa 3 lần/giờ là cấu hình khởi điểm.
10. Không tự đăng nhập chỉ vì mở link xác thực; chỉ tạo session khi có quy trình xác thực hợp lệ.

**Lưu ý link-scanner:** Tránh dùng GET request để consume token; một số trình quét email có thể tự mở link. Trang xác thực cần thao tác xác nhận hoặc POST có kiểm soát.

## 7. Email worker và độ tin cậy (Phase 5)

1. Định nghĩa interface `EmailSender` để mock trong unit test.
2. Cấu hình SMTP với timeout, TLS, xác thực; từ chối gửi nếu TLS không được thiết lập đúng.
3. Poll outbox theo batch, claim job có khóa và lease timeout.
4. Phân loại lỗi tạm thời (timeout/4xx SMTP) và lỗi vĩnh viễn (địa chỉ không hợp lệ/chính sách từ chối).
5. Retry backoff tăng dần có jitter; số lần tối đa; chuyển dead-letter để admin xử lý.
6. Metrics: queued, sent, failed, retries, queue age, verification conversion, latency.
7. Không log nội dung chứa token; redaction email khi phù hợp; bảo vệ quyền truy cập audit log.
8. Có cảnh báo nếu SMTP liên tục thất bại hoặc hàng đợi tăng bất thường.

## 8. Frontend Next.js (Phase 6)

| Giao diện | Yêu cầu UX |
|---|---|
| `/register` | Nhập email/password; trạng thái đang gửi; hướng dẫn kiểm tra Inbox/Spam |
| `/verify-email` | Đang xác thực, thành công, hết hạn, đã sử dụng, token không hợp lệ |
| `/resend-verification` | Nhập email hoặc sử dụng phiên; cooldown và phản hồi trung tính |
| `/login` | Nếu chưa xác thực, hiển thị yêu cầu xác minh email và nút gửi lại |

- Không lưu token trong localStorage; không đưa token vào analytics hay log.
- Cấu hình `Referrer-Policy: no-referrer` cho trang có token, xóa token khỏi URL sau khi lấy và tránh tải script bên thứ ba trên trang này.
- Tối ưu mobile, loading, lỗi mạng, khả năng truy cập (a11y).
- Link trong email phải trỏ về domain thật của CHIPCOIN khi production.

## 9. Mẫu email tự động (Phase 7)

### Mẫu A — Email yêu cầu xác thực (gửi ngay sau đăng ký)

**From:** `CHIPCOIN | Xác thực tài khoản <medubaiso1@gmail.com>`  
**Subject:** `[CHIPCOIN] Xác thực địa chỉ email của bạn`

**Bản text:**

```text
Xin chào {{display_name}},

Cảm ơn bạn đã đăng ký tài khoản CHIPCOIN.

Để hoàn tất đăng ký, vui lòng xác thực địa chỉ email bằng liên kết sau:
{{verification_url}}

Liên kết có hiệu lực trong 15 phút và chỉ sử dụng một lần.

Nếu bạn không tạo tài khoản này, hãy bỏ qua email. Không chia sẻ liên kết xác thực với bất kỳ ai.

Trân trọng,
Đội ngũ CHIPCOIN
Email gửi tự động từ medubaiso1@gmail.com — vui lòng không gửi mật khẩu hoặc mã bảo mật qua email.
```

**Bản HTML (render biến bằng template engine có HTML escaping, URL phải được tạo từ server và validate):**

```html
<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:12px;padding:32px">
      <tr><td style="font-size:24px;font-weight:bold;color:#111827">CHIPCOIN</td></tr>
      <tr><td><h1 style="font-size:22px">Xác thực email của bạn</h1>
        <p>Xin chào {{display_name}},</p>
        <p>Cảm ơn bạn đã đăng ký CHIPCOIN. Nhấn nút bên dưới để xác thực địa chỉ email và hoàn tất đăng ký.</p>
        <p style="margin:28px 0"><a href="{{verification_url}}" style="background:#111827;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;display:inline-block">Xác thực email</a></p>
        <p>Liên kết chỉ có hiệu lực <strong>15 phút</strong> và chỉ sử dụng một lần.</p>
        <p style="font-size:13px;color:#6b7280">Nếu nút không hoạt động, hãy sao chép liên kết: {{verification_url}}</p>
        <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="font-size:12px;color:#6b7280">Nếu bạn không đăng ký, hãy bỏ qua email này. Không chia sẻ liên kết xác thực.</p>
        <p style="font-size:12px;color:#6b7280">CHIPCOIN · Email tự động từ medubaiso1@gmail.com</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>
```

### Mẫu B — Email thông báo xác thực thành công

**From:** `CHIPCOIN | Xác thực tài khoản <medubaiso1@gmail.com>`  
**Subject:** `[CHIPCOIN] Tài khoản của bạn đã được xác thực thành công`

**Bản text:**

```text
Xin chào {{display_name}},

Địa chỉ email liên kết với tài khoản CHIPCOIN của bạn đã được xác thực thành công vào {{verified_at}}.

Bạn có thể đăng nhập và sử dụng các tính năng dành cho tài khoản đã xác thực:
{{login_url}}

Nếu bạn không thực hiện thao tác này, hãy liên hệ bộ phận hỗ trợ CHIPCOIN qua kênh hỗ trợ chính thức trên website.

Trân trọng,
Đội ngũ CHIPCOIN
Email gửi tự động từ medubaiso1@gmail.com.
```

**Quy tắc template:** Escape mọi biến người dùng; không nhúng mật khẩu, token xác thực hoặc thông tin nhạy cảm vào email kết quả. `login_url` phải dùng HTTPS trên domain được phép.

## 10. Kiểm thử và nghiệm thu (Phase 8)

### Unit tests
- Token đủ ngẫu nhiên, hash chính xác, hết hạn, sai purpose, sai user, replay.
- Register với email trùng, concurrent register, validate đầu vào.
- Resend cooldown, giới hạn IP/email/user, token cũ bị vô hiệu.
- Render HTML escape, URL đúng domain, fallback plain text.
- SMTP mock: timeout, TLS failure, invalid credentials, retry, dead-letter.

### Integration tests
- Đăng ký → outbox → gửi thử → click link → verified → email kết quả.
- Double-click và hai request đồng thời chỉ kích hoạt một lần.
- DB rollback không tạo outbox mồ côi; worker restart không mất job.
- Lỗi SMTP không khiến API báo tài khoản đã xác thực.
- User chưa xác thực bị chặn ở các chức năng yêu cầu verified.

### E2E / QA
- Gmail desktop/mobile, Spam, HTML/text, dark mode cơ bản.
- Token hết hạn, gửi lại, lỗi mạng, lỗi server, link scanner.
- Không rò token trong log, analytics, Referer hoặc history sau xử lý.
- Xác nhận địa chỉ gửi chính xác `medubaiso1@gmail.com`.

**Lệnh gợi ý:**

```powershell
cd D:\DAOCOIN\services\api
 go test ./... -count=1
 go vet ./...
cd D:\DAOCOIN\apps\web
 npm ci
 npm run build
```

## 11. Triển khai production (Phase 9)

1. Chốt domain CHIPCOIN và bật HTTPS.
2. Thiết lập secret production; kiểm tra Gmail cho phép SMTP từ môi trường deploy.
3. Apply migrations sau khi backup DB và kiểm tra kế hoạch rollback.
4. Bật worker một instance trước, theo dõi queue và gửi thử đến hộp thư kiểm soát.
5. Chạy smoke test đăng ký thật với email thử nghiệm; xác minh link, login, email kết quả.
6. Bật giới hạn gửi, rate limiting, alert, dashboard.
7. Đặt quy trình xoay vòng App Password và thu hồi khi lộ; bảo đảm có người chịu trách nhiệm quản trị tài khoản Gmail.
8. Kiểm tra điều khoản/chính sách gửi email của Google và quy định bảo vệ dữ liệu cá nhân áp dụng.
9. Lập phương án chuyển sang dịch vụ email giao dịch chuyên dụng khi vượt giới hạn Gmail hoặc cần SLA/độ tin cậy cao hơn.

## 12. Rollback và xử lý sự cố

| Sự cố | Cách xử lý |
|---|---|
| SMTP auth failed | Kiểm tra App Password/OAuth, không log secret; dừng retry vô hạn |
| Gmail từ chối gửi / quota | Tạm dừng worker, cảnh báo, backoff; không spam retry |
| Email vào Spam | Rà nội dung, tần suất, reputation; cân nhắc domain riêng + provider chuyên dụng |
| Token hết hạn | Gửi lại theo cooldown, vô hiệu token cũ |
| Link đã dùng | Trả trạng thái đã xác thực hoặc thông báo an toàn |
| Worker chết | Khởi động lại, reclaim job hết lease; kiểm tra trùng email |
| Lộ credential | Thu hồi ngay, thay secret, rà audit, kiểm tra gửi bất thường |
| Migration lỗi | Dừng rollout, khôi phục theo backup/rollback đã kiểm thử |

## 13. Phân chia công việc và thứ tự triển khai

| Thứ tự | Phase | Đầu ra bắt buộc | Điều kiện qua bước |
|---:|---|---|---|
| 1 | 0 — Audit | Danh sách API, schema, test hiện có | Không tạo module trùng |
| 2 | 1 — Gmail | SMTP account/App Password hoặc OAuth được cấu hình | Gửi thử tới hộp thư sở hữu thành công |
| 3 | 2 — Env | Secret và config an toàn | Không có credential trong Git |
| 4 | 3 — DB | Schema token/outbox/audit đúng | Migration + rollback test |
| 5 | 4 — Backend | Register/verify/resend hoàn chỉnh | Unit/integration test đạt |
| 6 | 5 — Worker | Gửi bất đồng bộ, retry, metrics | Test lỗi SMTP và restart đạt |
| 7 | 6 — Frontend | UI đăng ký/xác thực/gửi lại | E2E đạt |
| 8 | 7 — Templates | Email yêu cầu + email thành công | Render Gmail mobile/desktop đạt |
| 9 | 8 — QA | Test report và checklist bảo mật | Không còn lỗi nghiêm trọng |
| 10 | 9 — Production | Rollout, giám sát, rollback | Smoke test thành công |

## 14. Checklist chấp nhận cuối cùng

- [ ] Người dùng đăng ký bằng email hợp lệ.
- [ ] Tài khoản mới chưa được kích hoạt trước khi xác thực.
- [ ] Gmail `medubaiso1@gmail.com` gửi email yêu cầu xác thực thành công.
- [ ] Link chỉ dùng một lần, hết hạn sau 15 phút.
- [ ] Xác thực hợp lệ cập nhật user atomically.
- [ ] Gmail gửi email thông báo xác thực thành công.
- [ ] Gửi lại có cooldown, rate limit và phản hồi an toàn.
- [ ] Không rò token, password hoặc SMTP secret trong log/Git.
- [ ] Outbox retry hoạt động khi Gmail lỗi tạm thời.
- [ ] API/frontend/backend tests đạt; có giám sát và phương án rollback.

## 15. Các quyết định cần chốt trước khi coding

1. Domain website CHIPCOIN production là gì? (để tạo link xác thực).
2. Sử dụng Gmail cá nhân cho MVP hay chuyển sang provider transactional khi tăng trưởng?
3. Tài khoản mới có được đăng nhập hạn chế trước khi verified không, hay khóa toàn bộ?
4. Chính sách xử lý tài khoản chưa xác thực quá lâu (ví dụ 7–30 ngày) là gì?
5. Cần email hỗ trợ riêng để người dùng phản hồi không?

> **Quan trọng:** Đây là kế hoạch kỹ thuật và mẫu nội dung, chưa có kết nối thật tới Gmail và chưa có email nào được gửi. Mọi thông số, route và tên bảng phải đối chiếu với code/migration hiện tại trước khi triển khai.
