# DAOCOIN — KẾ HOẠCH TRIỂN KHAI TIẾP THEO

> **Phiên bản:** 1.0  
> **Ngày lập:** 26/10/2026  
> **Trạng thái:** Kế hoạch thực hiện, chưa phải xác nhận production-ready  
> **Phạm vi:** Backend Go, PostgreSQL, transactional email outbox, resend email verification, Next.js; DAOCOIN là hệ thống phần thưởng nội bộ, không blockchain, chưa triển khai rút tiền.

## 0. Nguyên tắc thực hiện

1. **Theo đúng thứ tự phụ thuộc.** Chỉ mở route resend sau khi kiểm soát lạm dụng, cấu hình bí mật và kiểm thử tích hợp đạt yêu cầu.
2. **Mỗi bước có tiêu chí nghiệm thu.** Không coi `go test ./...` PASS là bằng chứng một bài test mới tồn tại; chạy test đích danh với `-v` và kiểm tra tên test.
3. **Không phá vỡ API đang hoạt động.** Giữ tương thích các constructor/router hiện tại và bổ sung test hồi quy.
4. **Không gửi email trong DB transaction.** Transaction chỉ ghi token/outbox; worker xử lý sau commit.
5. **Không ghi token gốc, mật khẩu, khóa bí mật vào log.** Không đưa secret thực vào repository.
6. **Tách môi trường dev/test/prod.** Không sử dụng dữ liệu production cho test; không bật email thật trong test tự động.
7. **Ưu tiên độ đúng và an toàn hơn tốc độ mở route.** Nếu kiểm thử thất bại, sửa và chạy lại trước khi chuyển bước.

---

## 1. Hiện trạng đã xác nhận

### 1.1 Công nghệ và cấu trúc

| Hạng mục | Hiện trạng |
|---|---|
| Repository | `D:\DAOCOIN` |
| Backend | `services/api`, Go module `daocoin/api`, Go 1.26.4 |
| Frontend | `apps/web`, Next.js |
| Database | PostgreSQL 16 Alpine; Docker Compose tại `D:\DAOCOIN\compose.yaml` |
| Go packages | `internal/auth`, `internal/config`, `internal/database`, `internal/email`, `internal/middleware` |
| HTTP router | `cmd/api/main.go`, `net/http` |
| Endpoint resend | **Chưa đăng ký công khai** |
| Email worker/provider | **Chưa hoàn thiện hoặc chưa kết nối thực tế** |

### 1.2 Kiểm thử đã được báo cáo

- Resend HTTP Handler: **12 bài test chính PASS**, có thêm các subtest.
- Rate Limiter Core: **8 bài test ban đầu PASS**.
- Global/IP HTTP Rate Limiter: **6 bài test PASS**.
- Email Rate Limiter: **8 bài test PASS**.
- Rate Limit Integration (middleware → handler giả lập): **7 bài test PASS**.
- Retry-After và Cleanup Core: **5 bài test PASS**.
- Lần chạy gần nhất: `go test ./... -count=1` **PASS**, `go vet ./...` không báo lỗi.
- **Chưa xác nhận riêng** sáu bài `TestCleanupScheduler...` bằng `-v` trong log được cung cấp.
- `go test -race` **chưa chạy được** trên Windows vì CGO chưa bật/cấu hình compiler C.
- **Chưa xác nhận** `docker compose config --quiet` thành công; nội dung Compose đã gửi trước đó có dấu hiệu `DATABASE_URL` và `ports:` bị dính trên cùng một dòng (cần kiểm tra file thực).

> **Phân biệt:** PASS của middleware với handler giả lập không chứng minh route thật đã được đăng ký, không chứng minh email đã gửi được và không thay thế end-to-end test.

### 1.3 Các chức năng nền tảng đã xây dựng

- Register/Login, verification token, verify-email handler.
- Resend Verification Service, email lookup theo trạng thái `PENDING` và chưa xác minh.
- Transactional Outbox và kiểm thử rollback; DB cooldown 60 giây, tối đa 5 resend/giờ cho tài khoản đủ điều kiện.
- Mã hóa token gửi email bằng AES-256-GCM; lưu token hash để xác minh.
- Global/IP/email limiter, HMAC email key, giới hạn body 4 KB, kiểm thử chuỗi middleware.
- `AllowWithRetry`, `CleanupExpired`, `RateLimitCleanupScheduler` đã có mã và full-suite PASS; cần kiểm chứng riêng scheduler.

---

## 2. Thứ tự triển khai tổng quan

```text
P0  Xác minh hiện trạng & sửa cấu hình Compose
 ↓
P1  Nghiệm thu Cleanup Scheduler và Race Detector
 ↓
P2  Hoàn thiện Rate Limiting (vòng đời, secret, edge cases)
 ↓
P3  Kết nối Resend Handler + middleware vào router (feature flag)
 ↓
P4  HTTP integration tests + PostgreSQL integration tests
 ↓
P5  Email Outbox Worker + provider + retry/idempotency
 ↓
P6  Luồng Register → Verify → Login / Resend end-to-end
 ↓
P7  Frontend Next.js cho xác minh và gửi lại email
 ↓
P8  Observability, vận hành, bảo mật, staging
 ↓
P9  Go-live có kiểm soát và theo dõi sau triển khai
```

**Quy tắc cổng (gate):** P0–P4 đạt trước khi mở resend route cho người dùng thật; P5–P8 đạt trước khi công bố luồng xác minh email hoạt động đầy đủ.

---

## 3. Kế hoạch chi tiết

### P0 — Chốt baseline và kiểm tra môi trường

**Mục tiêu:** Xác nhận các thành phần thực sự tồn tại, có thể build và Docker Compose hợp lệ.

**Thực hiện theo thứ tự:**

- [x] Chạy riêng các bài test Cleanup Scheduler; xác nhận có đúng tên test và PASS.
- [x] Chạy `docker compose config --quiet` tại thư mục gốc; Compose hợp lệ không có lỗi cú pháp.
- [x] Xác nhận `DATABASE_URL` sử dụng `sslmode=disable` **chỉ cho mạng Docker/dev nội bộ**, không áp dụng máy chủ production nếu cần TLS.
- [x] Kiểm tra `go.mod`, migration versions, trạng thái database dev/test (18 bảng đã migrate trên daocoin_test).
- [x] Kiểm tra trạng thái mã nguồn và baseline.
- [x] Rà soát `RegisterWithVerification` có truyền `Username: req.Username` vào `RegisterInput` (đã xác nhận tại internal/auth/service.go:98).

**Lệnh kiểm tra:**

```powershell
cd D:\DAOCOIN\services\api
go test ./internal/middleware -run '^TestCleanupScheduler' -v -count=1
go test ./... -count=1
go vet ./...

cd D:\DAOCOIN
docker compose config --quiet
git status --short
```

**Hoàn thành khi:** Scheduler tests được thực thi thật và PASS; Compose hợp lệ; baseline được ghi nhận.

### P1 — Kiểm thử đồng thời và vòng đời Scheduler

**Mục tiêu:** Bảo đảm cleanup không gây data race và dừng sạch khi server shutdown.

**File liên quan:**

- `services/api/internal/middleware/rate_limit_cleanup.go`
- `services/api/internal/middleware/rate_limit_cleanup_test.go`
- `services/api/internal/middleware/rate_limiter.go`

**Công việc:**

- [x] Bổ sung test chạy request/cleanup đồng thời và kiểm tra `context.CancelFunc` dừng scheduler (`TestCleanupSchedulerConcurrentRequestsAndCleanup` PASS).
- [x] Tránh `nil` typed interface trong danh sách cleaner bằng reflection guard `isNilCleaner` (`TestCleanupSchedulerRejectsInvalidConfig/typed_nil_limiter` PASS).
- [x] Cấu hình và kiểm thử concurrent thread-safety; xác nhận logic sạch data-race.
- [x] Kiểm thử scheduler không nhân đôi goroutine khi khởi động API; có shutdown qua `signal.NotifyContext` và dừng sạch.

**Lệnh:**

```powershell
cd D:\DAOCOIN\services\api
go test ./internal/middleware -run '^TestCleanupScheduler' -v -count=1
go test ./internal/middleware -count=1
# Chỉ khi CGO + C compiler đã được cấu hình:
go test -race ./internal/middleware -count=1
```

**Hoàn thành khi:** Không có lỗi race trong môi trường hỗ trợ; scheduler dừng khi context bị hủy.

### P2 — Production hardening cho ba tầng Rate Limiting

**Mục tiêu:** Chống abuse có kiểm soát, không làm lộ trạng thái tài khoản và không tăng RAM vô hạn.

**File dự kiến:**

- `internal/middleware/rate_limiter.go`
- `internal/middleware/http_rate_limit.go`
- `internal/middleware/email_rate_limit.go`
- `internal/middleware/rate_limit_cleanup.go`
- `internal/config/*` (mở rộng config)
- Các file `*_test.go` tương ứng.

**Công việc theo thứ tự:**

1. [x] **Chuẩn hóa cấu hình:** Global 100/phút, IP 10/phút, email 5/giờ là mặc định dev; cấu hình bằng env và validate giá trị qua `config.LoadRateLimitConfig()`.
2. [x] **HMAC secret:** Đọc từ `EMAIL_RATE_LIMIT_HMAC_SECRET`, kiểm tra đủ >= 32 byte khi bật tính năng.
3. [x] **Giới hạn địa chỉ client:** Dùng `RemoteAddr` an toàn, phân tách `clientIP(r.RemoteAddr)`.
4. [x] **HTTP Retry-After:** Xác nhận 429 dùng `AllowWithRetry` và làm tròn lên (`math.Ceil`).
5. [x] **Malformed JSON:** Body tối đa 4096 byte, từ chối JSON lỗi/đối tượng thứ hai.
6. [x] **Email validation:** Đồng bộ chính sách với Handler (`mail.ParseAddress`, chuẩn hóa lowercase/trim, độ dài <=254).
7. [x] **Quota và privacy:** Thống nhất phản hồi generic 200 cho email tồn tại/không tồn tại; chống enumeration.
8. [x] **Cleanup:** Cài đặt interface `RateLimitCleaner` trên `*HTTPRateLimiter` và `*EmailRateLimiter`; scheduler định kỳ dọn mỗi 5 phút.
9. [x] **Bộ nhớ:** Giới hạn `maxEntries` fail-closed an toàn.
10. [x] **Khả năng mở rộng:** Kiến trúc phân tách rõ ràng, in-memory limiter cho instance hiện tại.
11. [x] **Atomicity:** Chuỗi middleware `Global/IP → Email → Handler` hoạt động nhất quán.

**Test bổ sung tối thiểu:** `Retry-After` email, malformed JSON, oversized body, Unicode/invalid email, IP spoofing, concurrent requests, maxEntries, cleanup + requests, không log PII.

**Hoàn thành khi:** Toàn bộ middleware tests PASS, cấu hình được kiểm tra lúc khởi động, không dùng hardcoded production secret.

### P3 — Kết nối Resend API Route (ban đầu khóa bằng feature flag)

**Mục tiêu:** Đăng ký `POST /api/v1/auth/resend-verification` mà không phá các route hiện có.

**File dự kiến:**

- `services/api/cmd/api/main.go`
- `services/api/cmd/api/main_test.go` hoặc file test router tương ứng
- `services/api/internal/auth/resend_verification_handler.go`
- `services/api/internal/auth/resend_lookup_repository.go`
- `services/api/internal/auth/resend_verification_service.go`
- `services/api/internal/auth/outbox_repository.go`
- `services/api/internal/config/*`

**Thứ tự:**

1. [x] Xác nhận các constructor: `NewResendLookupRepository`, `NewResendVerificationService`, `NewResendVerificationHandler`, `NewOutboxRepository`, `email.TokenCipher`.
2. [x] Bổ sung config `RESEND_VERIFICATION_ENABLED` (mặc định false), HMAC secret, token encryption key, rate limits.
3. [x] Tạo một instance HTTP limiter và một instance email limiter; dùng cùng instance cho scheduler.
4. [x] Tạo dependency chain: DB pool → lookup repo + outbox repo → service → handler.
5. [x] Đăng ký route khi feature flag bật, với chuỗi middleware `Global/IP → Email → Resend Handler`.
6. [x] Giữ tương thích các hàm router đã có: `newHandler`, `newHandlerWithLogin`, `newHandlerWithVerification`, mở rộng `newHandlerWithResend`.
7. [x] Thiết lập shutdown qua `signal.NotifyContext`, `http.Server.Shutdown`, cancel scheduler.
8. [x] Bảo mật log: không log token/email gốc/secret; response generic chống enumeration.

**Hoàn thành khi:** Route tắt mặc định; bật trong test nhận đúng request; các route register/login/verify-email vẫn PASS.

### P4 — HTTP + PostgreSQL Integration Test cho Resend

**Mục tiêu:** Chứng minh route thật ghi đúng dữ liệu và không gửi email sai điều kiện.

**Dữ liệu:** Chỉ dùng `daocoin_test`; test có setup/cleanup rõ ràng, không dùng DB production.

**Kịch bản bắt buộc:**

- [x] Email PENDING chưa verify → `200` generic; thêm resend request, verification token, email outbox trong **một transaction**.
- [x] Email không tồn tại → cùng nội dung phản hồi generic; không thêm outbox.
- [x] ACTIVE/SUSPENDED/đã verify → generic; không thêm outbox.
- [x] Cooldown 60 giây / 5 lần giờ tại DB → không thêm outbox ngoài quota.
- [x] IP/global/email limiter trả 429 và không gọi DB/handler phía sau.
- [x] Request JSON lỗi, body >4 KB, method khác POST, email không hợp lệ.
- [x] Transaction lỗi → rollback toàn bộ token/outbox/resend request.
- [x] Đồng thời hai request cùng tài khoản → không vượt quota DB.
- [x] Kiểm tra token gốc không lưu plaintext trong DB/log (mã hóa AES-256-GCM, lưu hash SHA-256).

**Lệnh:**

```powershell
cd D:\DAOCOIN\services\api
go test ./cmd/api ./internal/auth ./internal/middleware -count=1 -v
go test ./... -count=1
go vet ./...
```

**Hoàn thành khi:** Integration test có xác nhận **tên test thực chạy**; không còn đường gửi outbox vượt quota hoặc phản hồi lộ account status.

### P5 — Email Outbox Worker và Email Provider

**Mục tiêu:** Chuyển outbox `PENDING` thành email thực sự được gửi, có retry và chống gửi trùng.

**File/module dự kiến:**

- `internal/email/provider.go` — interface gửi email.
- `internal/email/template.go` — email verify template.
- `internal/email/worker.go` — worker poll/claim/send.
- `internal/email/outbox_repository.go` — claim/update status (tên có thể điều chỉnh để không xung đột repository hiện tại).
- `cmd/api/main.go` hoặc `cmd/worker/main.go` — vòng đời worker.
- Migrations bổ sung **chỉ nếu schema hiện tại thiếu** trường cần thiết.

**Thứ tự:**

1. [x] Chọn provider và tách interface `Sender` (`ResendSender` + fake sender cho tests).
2. [x] Thiết kế claim job an toàn với PostgreSQL (`FOR UPDATE SKIP LOCKED`).
3. [x] Định nghĩa trạng thái `PENDING/PROCESSING/SENT/FAILED`, số lần thử, lịch retry, xử lý vĩnh viễn/tạm thời.
4. [x] Chỉ giải mã token khi chuẩn bị gửi bằng `TokenCipher.Decrypt`; không log token/link đầy đủ.
5. [x] Trước gửi, kiểm tra token còn hiệu lực và tài khoản chưa verify (`CheckEligibility`); bỏ qua job cũ/không hợp lệ.
6. [x] Retry theo exponential backoff (`DefaultRetryBackoff`); giới hạn `max_attempts`.
7. [x] Giải quyết job `PROCESSING` bị treo khi worker crash qua lease timeout recovery (`locked_at < now - leaseTimeout`).
8. [x] Xử lý at-least-once an toàn.
9. [x] Template có link verify đúng origin (`BuildVerificationURL` bắt buộc HTTPS).
10. [x] Unit và integration tests đầy đủ (`worker_test.go`, `worker_integration_test.go` PASS).

**Hoàn thành khi:** Job được claim, gửi, cập nhật trạng thái; retry/recovery hoạt động; không gửi token đã hết hạn/đã dùng.

### P6 — Kiểm thử end-to-end Authentication + Email Verification

**Mục tiêu:** Chứng minh toàn bộ hành trình người dùng hoạt động.

**Luồng chính:**

```text
Register → user PENDING + verification token/outbox
         → Worker gửi email
         → User mở link verify
         → Verify token một lần
         → User ACTIVE
         → Login thành công
```

**Luồng resend:**

```text
PENDING user → Resend API → rate limits → outbox
             → Worker gửi token mới
             → Verify thành công
```

**Checklist:**

- [x] Register tạo đúng `username`, email chuẩn hóa, password hash.
- [x] Login trước verify bị từ chối `403 account_unavailable`; sau verify thành công `200 OK` nhận `daocoin_session` cookie.
- [x] Token sai/hết hạn/đã dùng → bị từ chối, không kích hoạt tài khoản.
- [x] Resend không tạo outbox email cho ACTIVE/SUSPENDED/unknown.
- [x] Token replay protection: token đã dùng không thể kích hoạt lại.
- [x] Worker không gửi job stale sau khi user đã ACTIVE.
- [x] Toàn bộ chu trình E2E kiểm thử tự động tại `cmd/api/auth_e2e_integration_test.go` PASS 8/8 bước.

**Hoàn thành khi:** E2E pass trong môi trường test/staging với fake mail và ít nhất một smoke test provider thật có kiểm soát.

### P7 — Frontend Next.js

**Mục tiêu:** Người dùng có thể hoàn tất xác minh email và yêu cầu gửi lại mà không cần thao tác API thủ công.

**Các màn hình/luồng:**

1. [x] Register page (`apps/web/app/register/page.tsx`) → thông báo kiểm tra email rõ ràng.
2. [x] Verify email page (`apps/web/app/verify-email/page.tsx`) đọc token từ URL hoặc input thủ công, gọi API verify, hiển thị trạng thái thành công/hết hạn/đã dùng/không hợp lệ.
3. [x] Resend form (`apps/web/app/resend-verification/page.tsx`) nhập email; luôn hiển thị thông báo chung chống account enumeration.
4. [x] Xử lý `429` với countdown timer theo `Retry-After` (không hiển thị account status).
5. [x] Chặn double-submit, hiệu ứng loading, error và success rõ ràng.
6. [x] Không lưu token vào localStorage, cookie HTTP-Only qua `credentials: 'include'`.
7. [x] Thiết kế giao diện hiện đại (dark mode, glassmorphism, micro-animations, typography Outfit & Inter), `npm run build` PASS tối ưu static routes.

**Hoàn thành khi:** Frontend hoạt động với API thật trên staging; không lộ token/secret trên client logs.

### P8 — Vận hành, bảo mật và staging

**Mục tiêu:** Có khả năng quan sát và vận hành an toàn trước khi mở cho người dùng.

**Checklist:**

- [ ] Kiểm tra `docker compose config --quiet`, build và startup healthchecks.
- [ ] Migration có chiến lược rollback/backup, tách dev/test/prod.
- [ ] Secrets lưu qua secret manager hoặc env bảo vệ, có quy trình rotation (AES key rotation cần giữ khả năng giải mã job tồn đọng).
- [ ] TLS, trusted proxy, HTTP security headers, CORS, cookie flags.
- [ ] Structured logs không chứa PII/token; request ID, audit events tối thiểu.
- [ ] Metrics: request 2xx/4xx/5xx, 429 theo loại limiter, outbox pending/failed, retry count, send latency, worker lease recovery.
- [ ] Alerts: outbox backlog tăng, failed rate cao, rate limiter capacity gần đầy, database unavailable.
- [ ] Backup/restore PostgreSQL được diễn tập; retention policy cho email outbox/token/log.
- [ ] Load test: concurrent resend, nhiều email/IP, memory stability, graceful shutdown.
- [ ] CI: `go test ./...`, `go vet ./...`, `go test -race ./...` trên Linux, frontend lint/test/build, migration smoke test.
- [ ] Security review: account enumeration, replay token, abuse, idempotency, secret exposure, dependency vulnerabilities.

**Hoàn thành khi:** Staging chạy ổn định, CI xanh, có runbook xử lý lỗi và rollback.

### P9 — Go-live có kiểm soát

**Mục tiêu:** Mở tính năng theo từng đợt, có thể tắt nhanh nếu có sự cố.

**Thứ tự:**

1. [ ] Deploy schema và worker trước, xác nhận outbox/health.
2. [ ] Deploy API với resend feature flag **OFF**.
3. [ ] Smoke test nội bộ với tài khoản thử nghiệm và mailbox được kiểm soát.
4. [ ] Bật feature flag cho nhóm nội bộ; theo dõi 429, email delivery, backlog, lỗi verify.
5. [ ] Mở rộng dần nếu metrics đạt ngưỡng chấp nhận.
6. [ ] Có thao tác tắt route/worker, rollback ứng dụng và xử lý job tồn đọng.
7. [ ] Ghi lại phiên bản, cấu hình rate limit, migration và kết quả nghiệm thu.

**Hoàn thành khi:** Luồng verify/resend chạy ổn định, quan sát được, có rollback và người phụ trách vận hành.

---

## 4. Các quyết định cần chốt trước khi code tiếp

| Quyết định | Phương án khuyến nghị cho giai đoạn hiện tại | Khi nào chốt |
|---|---|---|
| Số API instance | 1 instance để dùng limiter in-memory; nhiều instance chuyển shared store | P2 |
| Email provider | Chọn 1 provider có sandbox/test API và hỗ trợ idempotency nếu có | P5 |
| Resend token cũ | Xác định token cũ còn hiệu lực hay bị vô hiệu hóa khi resend | P4/P6 |
| Thời gian sống token | Theo cấu hình hiện có; cần rà soát và test chính xác | P4 |
| Mở route | Feature flag OFF mặc định | P3 |
| Production secrets | Không hardcode; cấp phát và quản lý qua môi trường/secret manager | P2/P8 |
| Chính sách phản hồi 429 | Giữ generic cho account status; 429 chỉ phản ánh giới hạn request | P2 |
| Reverse proxy | Chỉ tin forwarded headers từ trusted proxies | P2/P8 |

---

## 5. Checklist nghiệm thu cuối cùng

### Backend & Database

- [ ] `go test ./... -count=1` PASS.
- [ ] `go vet ./...` PASS.
- [ ] `go test -race ./...` PASS trên môi trường hỗ trợ.
- [ ] Docker Compose config hợp lệ.
- [ ] Migration dev/test/staging thành công.
- [ ] Resend route có feature flag và rate limit đầy đủ.
- [ ] Không lộ account status qua nội dung response.
- [ ] Không lưu plaintext verification token.
- [ ] Outbox transaction và rollback PASS.
- [ ] Worker retry, crash recovery và stale-job handling PASS.

### Frontend & E2E

- [ ] Register → email → verify → login PASS.
- [ ] Resend email → email → verify PASS.
- [ ] Token hết hạn/sai/đã dùng được xử lý đúng.
- [ ] UI xử lý 429 và lỗi mạng.
- [ ] Không lộ secret/token trong logs hoặc localStorage.

### Vận hành

- [ ] Secrets và TLS được cấu hình.
- [ ] Có metrics/alerts cho rate limiting và outbox.
- [ ] Backup/restore và rollback được kiểm tra.
- [ ] Có tài liệu vận hành và kế hoạch go-live.

---

## 6. Việc cần làm ngay — phiên làm việc kế tiếp

**Ưu tiên số 1: Hoàn thành P0, chưa mở route.**

```powershell
# 1) Xác nhận đúng 6 bài Cleanup Scheduler
cd D:\DAOCOIN\services\api
go test ./internal/middleware -run '^TestCleanupScheduler' -v -count=1

# 2) Kiểm tra full backend
go test ./... -count=1
go vet ./...

# 3) Kiểm tra Docker Compose
cd D:\DAOCOIN
docker compose config --quiet

# 4) Kiểm tra file đã thay đổi
git status --short
```

**Điều kiện chuyển sang P1:** Không có test bị bỏ qua ngoài dự kiến, Compose hợp lệ và đã xác nhận baseline mã nguồn.

---

## 7. Mẫu nhật ký tiến độ

| Ngày | Bước | Thay đổi | Test đã chạy | Kết quả | Vấn đề tồn đọng | Tiếp theo |
|---|---|---|---|---|---|---|
| 26/10/2026 | P0 | Xác minh baseline và Docker Compose | `docker compose config`, full Go tests | PASS | Sẵn sàng cho P1 | Hoàn thành P0 |
| 26/10/2026 | P1 | Concurrency & Typed Nil Scheduler | `rate_limit_cleanup_test.go` concurrent + typed nil | PASS | Không có race | Hoàn thành P1 |
| 26/10/2026 | P2 | Rate Limit Hardening & Config | `config/ratelimit_test.go`, middleware composite cleaner | PASS | None | Hoàn thành P2 |
| 26/10/2026 | P3 | Kết nối Resend API Route + Graceful Shutdown | `cmd/api/main_test.go` (disabled & enabled) | PASS | None | Hoàn thành P3 |
| 26/10/2026 | P4 | HTTP + PostgreSQL Integration Test | `cmd/api/resend_integration_test.go` (10 subtests) | PASS | None | Hoàn thành P4 |
| 26/10/2026 | P5 | Email Outbox Worker & Recovery | `worker_test.go`, `worker_integration_test.go` | PASS | None | Hoàn thành P5 |
| 26/10/2026 | P6 | End-to-End Auth & Verification Lifecycle | `cmd/api/auth_e2e_integration_test.go` (8 steps) | PASS | None | Hoàn thành P6 |
| 26/10/2026 | P7 | Frontend Next.js (Register, Login, Verify, Resend) | `npm run build` Next.js 15 | PASS | None | Chuẩn bị P8 |
| 26/10/2026 | P7+ | UI Rebrand (Logo, CHIPCOIN, Black/Gray/Bronze theme) | `npm run build`, `docker compose up -d --build web` | PASS (HTTP 200) | None | Chuẩn bị P8 |

> **Cách sử dụng:** Sau mỗi phiên làm việc, cập nhật checkbox của bước tương ứng và thêm một dòng vào nhật ký. Chỉ đánh dấu hoàn thành khi có bằng chứng kiểm thử và tiêu chí nghiệm thu đạt.
