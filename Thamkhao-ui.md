# COINTIPLY — KIỂM KÊ GIAO DIỆN & TÍNH NĂNG

**Ngày khảo sát:** 26/10/2026  
**Phạm vi:** `cointiply.com`, trang giới thiệu `/v2`, `labs.cointiply.com`, trung tâm trợ giúp `support.cointiply.com` và `labs.cointiply.com/help`.  
**Mục tiêu:** Danh mục giao diện và chức năng để nghiên cứu sản phẩm, lập sitemap, thiết kế UI/UX và backlog phát triển nền tảng tương tự.

> **Giới hạn quan trọng:** Đây là kiểm kê dựa trên các trang công khai truy cập được bằng công cụ nghiên cứu và tài liệu chính thức mô tả các màn hình sau đăng nhập. Không có tài khoản đăng nhập để duyệt thực tế toàn bộ màn hình riêng tư, không thể xác nhận 100% mọi nút, modal, route, điều kiện mở khóa hoặc giao diện theo từng quốc gia. Những màn hình đăng nhập được mô tả từ tài liệu được đánh dấu **D** thay vì giả nhận đã trực tiếp thao tác. Tính năng Labs có thể đang triển khai theo đợt.

## 1. Quy ước xác minh

| Ký hiệu | Ý nghĩa |
|---|---|
| **P** | Đã truy cập/đọc trang công khai hoặc nội dung được index |
| **D** | Có tài liệu chính thức mô tả giao diện/chức năng, chưa xác minh trực tiếp trong tài khoản |
| **V** | Cần tài khoản/điều kiện bổ sung để xác minh giao diện thực tế |
| **L** | Tính năng phiên bản cũ/khác hoặc thông số thay đổi, không mặc định là trạng thái hiện hành |

## 2. Bản đồ sản phẩm và điều hướng

```text
Cointiply ecosystem
├── Classic website / marketing (P)
│   ├── Landing / homepage
│   ├── Login / Sign up / Forgot password
│   ├── Earn: Offers / Surveys / PTC / Videos
│   ├── Rewards: Spins / Boxes / Streak / Missions / Promo
│   ├── Play: Multiplier / Games
│   ├── Social: Chat / Referrals / Leaderboards
│   ├── Wallet / Cashout / Deposits / Interest / Activity
│   ├── Profile / Settings / Verification
│   └── Advertise / Blog / Help / Terms / Privacy
├── Cointiply Labs (P: landing, D: account screens)
│   ├── Home / Quick actions / Top offers / CointiBot
│   ├── Earn / Play / Daily / Social / Customize
│   ├── Wallet / History / Roadmap
│   ├── Buddy / Widgets / Store / Smart chats
│   └── Notifications / Profile / Settings / Support
└── Help centers (P)
    ├── Search / Categories / Articles
    └── Support assistant / Tickets / Contact
```

## 3. Bảng tổng hợp giao diện — Classic và trang công khai

| ID | Giao diện | Thành phần / hành động người dùng | Xác minh |
|---|---|---|---|
| C01 | Homepage / Landing | Logo, thông điệp kiếm crypto, CTA đăng ký, mô tả cơ chế, social proof, lợi ích, FAQ, footer | P |
| C02 | Sign up | Email / mật khẩu hoặc phương thức đăng ký được hệ thống cung cấp; tạo tài khoản | P/D |
| C03 | Login | Email, mật khẩu, đăng nhập Google (tùy phiên bản), link quên mật khẩu, link đăng ký | P |
| C04 | Forgot / Reset password | Yêu cầu email khôi phục, đặt lại mật khẩu qua liên kết | D |
| C05 | Earn / Offerwalls | Danh sách đối tác, chọn offerwall, mở nhiệm vụ, điều kiện nhận thưởng, kiểm tra ghi nhận | D |
| C06 | Surveys | Danh sách khảo sát, chọn nhà cung cấp, làm khảo sát, thưởng và trường hợp bị loại | D |
| C07 | Games / App offers | Nhiệm vụ cài ứng dụng, chơi game, đạt mốc, theo dõi thưởng | D |
| C08 | PTC ads | Danh sách quảng cáo trả tiền theo lượt xem, mở quảng cáo, chờ/hoàn thành điều kiện | D |
| C09 | Videos | Chọn nhà cung cấp video, xem clip, tích điểm và chuyển thưởng | D |
| C10 | Free Spins / Daily Wheel | Số lượt quay, quay nhận Coin/bonus, số lượt được cấp theo level | D |
| C11 | Mystery Boxes | Hộp thưởng khả dụng, mở hộp, nhận Coins/Spins/bonus | D |
| C12 | Daily Streak | Tiến độ mục tiêu ngày, chuỗi ngày, nút Claim, phần thưởng tăng theo chuỗi | D |
| C13 | Bonus Missions | Danh sách nhiệm vụ, tiến độ, Claim, mở nhiệm vụ kế tiếp | D |
| C14 | Promo Codes | Nhập mã khuyến mãi, xác thực và nhận Coins | D |
| C15 | CointiPlay Multiplier | Nhập mức cược, chọn hệ số, chơi, kết quả; nội dung may rủi cần kiểm soát pháp lý | D |
| C16 | Community Chat | Phòng chat, thành viên, nội dung tin nhắn, quy tắc, Chat Rain | D |
| C17 | Referrals | Link giới thiệu, banner, thống kê lượt giới thiệu và hoa hồng, contest | D |
| C18 | Wallet / Balance | Số dư Coins, quy đổi, tình trạng đủ ngưỡng rút | D |
| C19 | Cashout / Withdraw | Chọn BTC/LTC/DOGE/DASH, địa chỉ ví, số tiền, xác nhận, trạng thái | D |
| C20 | Deposit | Thông tin nạp crypto (nếu khả dụng), địa chỉ nạp, trạng thái | D/L |
| C21 | Interest Settings | Bật/tắt lãi suất, điều kiện số dư, lịch ghi nhận lãi | D |
| C22 | Activity / History | Lịch sử thu nhập, bonus, referral, interest, rút tiền | D |
| C23 | Account / Settings | Hồ sơ, bảo mật, tùy chọn, thông báo, hỗ trợ tài khoản | D/V |
| C24 | Verification | Xác minh tài khoản/chi trả khi bị yêu cầu | D/V |
| C25 | Advertise | Thông tin quảng cáo PTC, tiếp cận người dùng, nhắm vùng/quốc gia | P/D |
| C26 | Blog | Bài viết hướng dẫn kiếm Coins, survey, offers, interest | P |
| C27 | Help Center | Danh mục bài viết, tìm kiếm, hướng dẫn thanh toán, nhiệm vụ, referrals | P |
| C28 | Terms / Privacy | Điều khoản sử dụng, chính sách dữ liệu | P |

### 3.1. Các trạng thái và logic cần ghi nhận khi thiết kế lại

- **Offers:** available → started → pending verification → credited / rejected / reversed; thưởng và thời gian xác minh do đối tác quyết định.
- **Surveys:** available → screening → qualified / disqualified → completed → credited; số offer phụ thuộc quốc gia, thiết bị, nhà cung cấp.
- **PTC:** hiển thị nhiệm vụ và điều kiện xem, ghi nhận khi hoàn thành hợp lệ.
- **Streak:** tài liệu Classic nêu điều kiện kiếm ít nhất **300 Coins/ngày** và **Claim trước cuối ngày**; không đủ điều kiện sẽ reset.
- **Missions:** nhóm Earning, Feature, Special, Streak; tự tăng tiến độ, hiển thị Claim khi đạt mốc.
- **Wallet:** Coins là đơn vị nội bộ, **10.000 Coins = 1 USD**, không phải cryptocurrency; khi rút quy đổi theo giá crypto lúc xử lý.
- **Interest:** tài liệu nêu **5%/năm**, tính theo số dư bình quân tuần đủ điều kiện từ **35.000 Coins**, cần bật trong Settings và có hoạt động kiếm thưởng mỗi tuần; ghi nhận Chủ nhật GMT.
- **Referral Classic:** tài liệu chính thức nêu 25% một số thưởng faucet/spin/box và 10% offer/game; một số khoản như interest không trả referral.

## 4. Bảng tổng hợp giao diện — Cointiply Labs

| ID | Màn hình / phân hệ | Thành phần và thao tác cụ thể | Xác minh |
|---|---|---|---|
| L01 | Labs Landing | Giới thiệu sản phẩm, đăng ký Google/email, kết nối tài khoản Classic, giới thiệu trò chơi, FAQ | P |
| L02 | Account Setup | Onboarding qua CointiBot: spin đầu tiên, chọn sở thích kiếm thưởng, nhiệm vụ đầu tiên | D |
| L03 | Home | CointiBot + buddy, gợi ý theo ngữ cảnh, thanh tin nhanh, số dư, streak, cashout progress | D |
| L04 | Quick Actions | Tối đa 8 shortcut; Spin, Orb Rush, Streak, PTC, Quests, Surveys, Offers, Play; sắp xếp | D |
| L05 | Top Offers | Tabs All/Games/Surveys/Apps/Sign-ups/Started, search, lọc payout/device/time, xem chi tiết, Start | D |
| L06 | Earn Hub | Offers, surveys, offerwalls, PTC, videos, started offers, saved offers | D |
| L07 | Play Hub | CoinWord, CoinTrail, Daily Fortune, Price Prophet, Orb Rush, Crack the Vault | D |
| L08 | Daily Hub | Spin, Mystery Boxes, Streak, Quests, leaderboards, invites | D |
| L09 | Social Hub | Community chat, leaderboard, Refer & Earn, public profile | D |
| L10 | Customize Hub | Layout, section order, quick actions, theme, buddy, widgets, store, chat display | D |
| L11 | CointiBot Chat | Hỏi về số dư, gợi ý offer, quest, cashout, trợ giúp; không tự rút tiền nếu chưa xác nhận | D |
| L12 | Buddy | Nhân vật đồng hành, tương tác, trang trí bằng vật phẩm/hiệu ứng | D |
| L13 | Community Chat | Chat overlay, thành viên online, tùy chỉnh độ rộng, cỡ chữ, danh sách thành viên | D |
| L14 | Orb Rush | Đua theo lượt/ranked, lobby, Elo, phần thưởng Coin/Gem; Career Mode | D |
| L15 | Crack the Vault | Heist cộng đồng, Gems, mùa giải, kho đồ, crafting, sự kiện, bảng xếp hạng, thưởng | D |
| L16 | Gems | Số dư Gems dùng trong game; **không rút thành crypto**; nguồn kiếm từ nhiệm vụ/game | D |
| L17 | Wallet | Balance Coins/USD/satoshi, quy đổi BTC/LTC/DOGE/DASH, withdraw wizard, deposit, pending payouts | D |
| L18 | History | Earnings 6 tháng, biểu đồ theo ngày, top sources, lọc loại; withdrawals và trạng thái | D |
| L19 | Roadmap | Tạo feedback/bug/feature, đính tối đa 6 ảnh, vote, boost vote, sort/filter, comment | D |
| L20 | Refer & Earn | Link cá nhân, thống kê, QR, nội dung chia sẻ, chỉnh trang referral, preview | D |
| L21 | Public Profile | Hồ sơ công khai, username, level, tier, streak, game records, banner/theme | D |
| L22 | Settings / Notifications | Cấu hình CointiBot, tin tức/sự kiện, tùy chọn hiển thị và thông báo | D |
| L23 | Widgets | Ghim widget, mục tiêu, cảnh báo, bố cục dashboard | D |
| L24 | Store / Plugins | Tùy chỉnh buddy, theme, vật phẩm và các plugin/loadout tùy khả dụng | D/V |
| L25 | Smart Chat Allowance | Hạn mức chat thông minh, chế độ chat cơ bản và top-up nếu được hỗ trợ | D/V |
| L26 | Support Assistant | Tìm trợ giúp theo tài liệu, chuyển live chat/ticket khi cần | P/D |
| L27 | Ticket Center | Danh sách ticket và trạng thái xử lý (cần đăng nhập để xem riêng) | P/D |

### 4.1. Labs Home — thành phần UI chi tiết

- **Desktop:** side rail; **mobile:** bottom navigation.
- **Header:** Coins và USD tương đương, Gems, community online, avatar/menu.
- **CointiBot:** lời nhắc một ý mỗi lần, CTA Claim/Spin/See details; có thể ẩn hoặc đổi gợi ý.
- **Slim bar:** câu hỏi nhanh, gợi ý, tin sự kiện Vault, lobby Orb Rush, hoạt động thưởng mới.
- **Glance cards:** số dư, streak hôm nay, tiến độ đủ điều kiện cashout.
- **Quick actions:** shortcut tối đa 8 nút, có badge đếm số việc chờ.
- **Features/Top offers:** danh sách đề xuất và tabs lọc, có thể mở offer trong overlay hoặc tab mới.
- **Customize:** độ rộng Standard/Wide, mật độ Comfortable/Compact, ghim quick actions, đổi thứ tự và ẩn/hiện section, cấu hình chat và buddy.
- **Failure states:** thẻ báo không tải được với Try again; hết phiên yêu cầu kết nối tài khoản; mất mạng có cảnh báo.

### 4.2. Labs Wallet và History — dữ liệu hiển thị

- **Wallet:** Coins hiện có, quy đổi USD/satoshi; từng lựa chọn crypto; trạng thái sẵn sàng rút hoặc thiếu bao nhiêu Coins; wizard rút tiền; địa chỉ nạp; danh sách pending withdrawals.
- **Ngưỡng theo tài liệu Labs:** BTC **50.000 Coins**, LTC/DOGE/DASH **30.000 Coins**. Trang marketing Classic có thể nói chung 30.000 Coins; cần ưu tiên kiểm tra ngưỡng hiện hành ngay trong tài khoản.
- **Earnings History:** tổng hợp 6 tháng, biểu đồ ngày, nguồn thu chính, filter Offers/Faucet/Bonuses/Referrals/Games, phân trang.
- **Withdrawals History:** trạng thái Pending/Verifying/Held/Sent, filter, phân trang, detail drawer; có trường hợp cần xác minh danh tính trên site Classic.

### 4.3. Labs Referrals — lưu ý khác Classic

- Link `/i/<personal-link>`, ghi nhận giới thiệu trong 30 ngày theo tài liệu Labs.
- Labs công bố **20% eligible free-roll** và **10% eligible offer/game** đối với signup mới; khác mức Classic **25%** cho một số loại bonus. Không gộp thành một tỷ lệ duy nhất.
- Dashboard: lifetime/pending earnings, 30-day signups, total/active referrals, recent signups.
- Share: copy link, mẫu nội dung, QR, preview trang, regenerate link.
- Trang referral công khai có thể tùy chỉnh headline, lời nhắn, màu accent, username, level/tier/streak, banner FX.

## 5. Giao diện Help & Support

| ID | Giao diện | Thành phần | Xác minh |
|---|---|---|---|
| H01 | Help landing | Ô tìm kiếm, popular queries, popular articles, danh mục | P |
| H02 | Help category | Danh sách bài viết theo nhóm FAQ, Tips, Payments, Referrals, Games, Chat, PTC, Missions | P |
| H03 | Help article | Breadcrumb, tiêu đề, nội dung, related articles, đánh giá hữu ích | P |
| H04 | Support Assistant | Chọn vấn đề, mô tả sự cố, nhận hướng dẫn từ knowledge base | P |
| H05 | My Tickets | Điểm truy cập danh sách ticket, chi tiết phụ thuộc đăng nhập | P/V |
| H06 | Payment/Offer support | Hướng dẫn đối soát, chưa nhận thưởng, liên hệ offerwall, chứng cứ | P |
| H07 | Roadmap / Product feedback | Report, vote, trạng thái, bình luận (Labs) | D |

Các danh mục Help Labs công khai gồm: Quick Answers, Labs, Widgets, Plugins, Modes, Usage, FAQ, Tips, Payments, Referrals, CointiPlay, Chat, PTC, Missions.

## 6. Danh mục chức năng nghiệp vụ (đề xuất làm backlog)

| Nhóm | Tính năng lõi | UI bắt buộc | Thành phần backend gợi ý |
|---|---|---|---|
| Identity | Register/login/reset/link account | Forms, validation, loading, errors | Users, auth sessions, verification |
| Wallet ledger | Ghi nhận thưởng và số dư | Balance, transaction history | Double-entry ledger, immutable events |
| Offer aggregator | Đồng bộ offer/offerwall | Tabs, filters, details, status | Partner adapters, callbacks, anti-duplication |
| Surveys | Match khảo sát, ghi nhận kết quả | Survey list, screening, status | Survey providers, callbacks |
| PTC | Xem quảng cáo nhận thưởng | Ad list, timer, claim | Eligibility, fraud controls |
| Daily rewards | Spin, boxes, streak | Wheel, box reveal, streak calendar | Reward rules, daily limits |
| Missions | Nhiệm vụ, progress, claim | Quest cards, progress bars | Rules engine, event counters |
| Games | Mini-games, rankings | Play lobby, result, rewards | Game services, integrity checks |
| Referral | Link, attribution, commissions | Share/QR, stats, reports | Referral attribution, payout engine |
| Community | Chat, moderation, rain | Chat UI, members, notifications | Real-time gateway, moderation |
| Withdrawal | Crypto cashout | Currency selector, confirmation, history | Withdrawal queue, security, custody |
| Deposit/Interest | Nạp và lãi theo điều kiện | Addresses, settings, history | On-chain reconciliation, interest jobs |
| Support | Help, ticket, dispute | Search, article, ticket forms | Knowledge base, ticketing |
| AI assistant | CointiBot suggestions | Chat, action CTA, message list | Retrieval, tool permissions, audit logs |
| Personalization | Theme, layout, buddy, widgets | Customize, previews, store | Preferences, inventory |
| Analytics | Earnings, activity, leaderboard | Charts, filters, badges | Aggregations, leaderboard jobs |
| Compliance | Identity checks, payout holds | Verification, status explanations | KYC/AML where applicable, risk review |

## 7. Những giao diện chưa thể xác minh trực tiếp

1. Mọi route riêng tư sau đăng nhập trên Classic và Labs (không có session được cấp).
2. Toàn bộ popup/modal, toast, thông báo lỗi, empty states và responsive breakpoint thực tế.
3. Các offerwall theo quốc gia, đối tác và thiết bị; mức thưởng theo tài khoản.
4. Luồng nạp/rút thực tế, yêu cầu KYC cụ thể, thời gian xử lý theo tài khoản.
5. Các event/season, store items, game modes có thể thay đổi theo thời gian.
6. Các màn hình admin, advertiser self-service hoặc nội bộ không được công khai.
7. Các tính năng A/B testing hoặc Labs rollout chỉ mở cho nhóm người dùng nhất định.

**Không nên diễn giải tài liệu này là kết quả click-test 100% giao diện.** Muốn đạt mức đó cần một tài khoản thử nghiệm được phép sử dụng, kiểm thử desktop/mobile và ghi lại screenshot/sitemap cho từng trạng thái.

## 8. Checklist kiểm thử giao diện khi có tài khoản

- [ ] Login / signup / reset / logout / session timeout
- [ ] Home desktop + mobile, menu đầy đủ, từng quick action
- [ ] Earn: mỗi tab, filter, search, detail, started/saved, missing-credit
- [ ] Survey: đủ điều kiện, loại, hoàn thành, credited
- [ ] PTC / Videos: các trạng thái xem và thưởng
- [ ] Spin / Box / Streak / Mission: đủ/thiếu điều kiện, claim, reset
- [ ] Play: từng trò, kết quả, bảng xếp hạng, phần thưởng
- [ ] Community: gửi tin, rain, moderation, notifications
- [ ] Referrals: link, QR, thống kê, chỉnh public page
- [ ] Wallet: balances, currency, withdrawal wizard, pending, history
- [ ] Settings: security, interest, notifications, personalization
- [ ] Support: tìm kiếm, ticket, escalation
- [ ] Labs: CointiBot, buddy, widgets, Store, Roadmap, Vault
- [ ] Tất cả modal/toast/error/empty/loading state và breakpoint mobile

## 9. Nguồn chính thức và đường dẫn khảo sát

1. Homepage: https://cointiply.com/
2. Classic marketing: https://cointiply.com/v2
3. Labs landing: https://labs.cointiply.com/
4. Labs Help Center: https://labs.cointiply.com/help
5. Labs Home: https://labs.cointiply.com/help/labs-your-home
6. Labs Wallet / History / Roadmap: https://labs.cointiply.com/help/labs-wallet-history-and-roadmap
7. Labs account setup: https://labs.cointiply.com/help/labs-new-account-setup
8. Labs Refer & Earn: https://labs.cointiply.com/help/labs-invite-friends
9. Classic support FAQ: https://support.cointiply.com/en/support/solutions/folders/36000053289
10. Classic support categories: https://support.cointiply.com/en/support/solutions/36000035168
11. Offerwalls: https://support.cointiply.com/en/support/solutions/articles/36000011878-what-are-offerwalls-
12. Earn methods: https://support.cointiply.com/en/support/solutions/articles/36000011889-how-to-earn-more-coins-from-cointiply
13. Coins: https://support.cointiply.com/en/support/solutions/articles/36000011880-what-are-coins-
14. Interest: https://support.cointiply.com/en/support/solutions/articles/36000104026-earn-5-interest-on-your-coins-faq-how-it-works
15. Missions: https://support.cointiply.com/en/support/solutions/articles/36000339656-types-of-missions-how-to-complete-earning-missions
16. Daily streak: https://support.cointiply.com/en/support/solutions/articles/36000581782-how-does-the-cointiply-daily-streak-work-
17. Classic referrals: https://support.cointiply.com/en/support/solutions/articles/36000127372-how-does-cointiply-s-referral-system-work-

## 10. Kết luận và cách sử dụng tài liệu

- **Classic** tập trung vào earning workflows: offers, surveys, PTC, videos, spins, missions, referral, wallet.
- **Labs** mở rộng thành gamified hub: Home cá nhân hóa, AI, mini-games, Vault, Gems, widgets, store, social, roadmap.
- **Thiết kế hệ thống tương tự:** ưu tiên Auth → Ledger/Wallet → Offerwalls/Surveys → Rewards/Missions → Withdrawals → Referrals → Community → AI/Personalization.
- **Chú ý:** game multiplier, crypto withdrawals, deposits, interest và quảng cáo thưởng có thể phát sinh nghĩa vụ pháp lý, bảo vệ người tiêu dùng, chống gian lận và điều kiện của đối tác theo thị trường triển khai.
