'use client';

// Helper to log sent email to localStorage so it appears in /system/email
function logOutboxEmail(entry: {
  id: string;
  template: string;
  recipient: string;
  status: 'SENT' | 'FAILED';
  note: string;
}) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('chipcoin_email_logs') || '[]';
    const list = JSON.parse(raw);
    const nowStr = new Date().toLocaleString('sv-SE').replace('T', ' ');
    list.unshift({
      id: entry.id,
      template: entry.template,
      recipient: entry.recipient,
      status: entry.status,
      retries: 0,
      latencyMs: Math.floor(120 + Math.random() * 80),
      createdAt: nowStr,
      note: entry.note,
    });
    localStorage.setItem('chipcoin_email_logs', JSON.stringify(list.slice(0, 100)));
    window.dispatchEvent(new Event('chipcoin_email_logged'));
  } catch (e) {}
}

export async function sendEmailViaRelay({
  to,
  subject,
  html,
  templateLabel,
}: {
  to: string;
  subject: string;
  html: string;
  templateLabel: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = '0123456789abcdef0123456789abcdef';
  const emailId = `EM-SYS-${Date.now().toString().slice(-6)}`;

  try {
    const res = await fetch('/api/internal/email-relay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        text: html.replace(/<[^>]*>/g, ''),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      logOutboxEmail({
        id: emailId,
        template: templateLabel,
        recipient: to,
        status: 'SENT',
        note: `Gửi thành công qua Gmail SMTP tới ${to}`,
      });
      return { success: true, messageId: data.messageId };
    } else {
      logOutboxEmail({
        id: emailId,
        template: templateLabel,
        recipient: to,
        status: 'FAILED',
        note: `Lỗi gửi SMTP: ${data.error || 'relay_failed'}`,
      });
      return { success: false, error: data.error || 'Không thể gửi email qua SMTP' };
    }
  } catch (err: any) {
    logOutboxEmail({
      id: emailId,
      template: templateLabel,
      recipient: to,
      status: 'FAILED',
      note: `Lỗi kết nối email: ${err.message}`,
    });
    return { success: false, error: err.message };
  }
}

// 1. Password Reset Email
export async function sendPasswordResetEmail(
  email: string,
  username: string,
  tempPassword: string
) {
  const subject = `[CHIPCOIN] Đặt lại mật khẩu đăng nhập tài khoản thành công`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #121418; color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #d4af37;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #f5d77f; margin: 0;">CHIPCOIN SECURITY CENTER</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Thông Báo Đặt Lại Mật Khẩu Tài Khoản</p>
      </div>

      <p>Xin chào <strong>${username || email}</strong>,</p>
      <p>Yêu cầu đặt lại mật khẩu cho tài khoản đăng ký của bạn đã được Quản trị viên hệ thống xác nhận và thực hiện thành công.</p>

      <div style="background: rgba(212, 175, 55, 0.1); border: 1.5px solid #d4af37; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <div style="font-size: 12px; color: #f5d77f; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Mật Khẩu Đăng Nhập Mới (Tạm Thời):</div>
        <div style="font-family: monospace; font-size: 22px; font-weight: bold; color: #38bdf8; letter-spacing: 2px;">
          ${tempPassword}
        </div>
      </div>

      <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
        <strong style="color: #f87171;">LƯU Ý BẢO MẬT QUAN TRỌNG:</strong>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          Để đảm bảo an toàn tuyệt đối cho tài khoản và số dư ví điểm thưởng của bạn, vui lòng <strong>đăng nhập ngay</strong> và tiến hành <strong>đổi lại mật khẩu cá nhân mới</strong> trong trang <em>Hồ Sơ & Bảo Mật</em>.
        </p>
      </div>

      <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px;">
        Nếu bạn không yêu cầu hành động này, vui lòng liên hệ ngay với Quản trị viên hệ thống CHIPCOIN để được hỗ trợ khẩn cấp.
      </p>
    </div>
  `;

  return sendEmailViaRelay({
    to: email,
    subject,
    html,
    templateLabel: 'Đặt Lại Mật Khẩu Hội Viên',
  });
}

// 2. Account Status Change Email (Dừng Hoạt Động / Kích Hoạt)
export async function sendStatusChangeEmail(
  email: string,
  username: string,
  newStatus: 'ACTIVE' | 'SUSPENDED',
  reason: string
) {
  const isSuspended = newStatus === 'SUSPENDED';
  const actionTitle = isSuspended ? 'TẠM DỪNG HOẠT ĐỘNG' : 'KÍCH HOẠT LẠI';
  const subject = `[CHIPCOIN] Thông báo ${isSuspended ? 'tạm dừng hoạt động' : 'kích hoạt lại'} tài khoản`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #121418; color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid ${isSuspended ? '#ef4444' : '#10b981'};">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: ${isSuspended ? '#f87171' : '#34d399'}; margin: 0;">CHIPCOIN SYSTEM NOTIFICATION</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Thông Báo Trạng Thái Hoạt Động Tài Khoản</p>
      </div>

      <p>Xin chào <strong>${username || email}</strong>,</p>
      <p>Ban Quản Trị Hệ Thống xin thông báo tài khoản của bạn đã được chuyển sang trạng thái: <strong style="color: ${isSuspended ? '#f87171' : '#34d399'};">${actionTitle}</strong>.</p>

      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.15); padding: 14px; border-radius: 8px; margin: 20px 0;">
        <div style="font-size: 12px; color: #f5d77f; text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">LÝ DO TỪ QUẢN TRỊ VIÊN XÁC NHẬN:</div>
        <div style="color: #ffffff; font-size: 14px; line-height: 1.6; font-style: italic;">
          "${reason}"
        </div>
      </div>

      ${isSuspended ? `
        <p style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          Trong thời gian tạm dừng hoạt động, bạn sẽ không thể thực hiện các giao dịch nhận thưởng, đổi thưởng hoặc rút tiền. Nếu bạn có bất kỳ thắc mắc hoặc cần giải trình, vui lòng phản hồi email này để được xem xét.
        </p>
      ` : `
        <p style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          Tài khoản của bạn hiện đã được kích hoạt đầy đủ quyền hạn. Bạn có thể đăng nhập bình thường và tiếp tục tham gia các hoạt động tích lũy điểm thưởng.
        </p>
      `}

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
        Ban Điều Hành & Bảo Mật Hệ Thống CHIPCOIN.
      </p>
    </div>
  `;

  return sendEmailViaRelay({
    to: email,
    subject,
    html,
    templateLabel: `Trạng Thái: ${actionTitle}`,
  });
}

// 3. Permanent Account Deletion Email with Treasury Return Info
export async function sendAccountDeletedEmail(
  email: string,
  username: string,
  reason: string,
  chipsRefunded: number,
  usdtRefunded: number,
  adminTonWallet: string
) {
  const subject = `[CHIPCOIN] Thông báo XÓA VĨNH VIỄN tài khoản và hoàn quỹ số dư`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #121418; color: #ffffff; padding: 24px; border-radius: 12px; border: 1.5px solid #ef4444;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #f87171; margin: 0;">CHIPCOIN ACCOUNT TERMINATION</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Thông Báo Xóa Vĩnh Viễn Tài Khoản &amp; Quyết Toán Số Dư</p>
      </div>

      <p>Xin chào <strong>${username || email}</strong>,</p>
      <p>Hệ thống CHIPCOIN thông báo tài khoản của bạn đã bị <strong>XÓA VĨNH VIỄN</strong> khỏi cơ sở dữ liệu hệ thống.</p>

      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; padding: 14px; border-radius: 8px; margin: 16px 0;">
        <div style="font-size: 12px; color: #f87171; text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">LÝ DO XÓA VĨNH VIỄN ĐƯỢC GHI CHÚ:</div>
        <div style="color: #ffffff; font-size: 14px; line-height: 1.6; font-style: italic;">
          "${reason}"
        </div>
      </div>

      <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(212, 175, 55, 0.3); padding: 16px; border-radius: 8px; margin: 20px 0;">
        <div style="font-size: 12px; color: #f5d77f; text-transform: uppercase; font-weight: bold; margin-bottom: 10px;">HẠCH TOÁN SỐ DƯ TÀI KHOẢN KHI XÓA:</div>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="color: #94a3b8; padding: 4px 0;">Số dư CHIP hoàn về Kho Quỹ Hệ Thống:</td>
            <td style="color: #f5d77f; font-weight: bold; text-align: right;">${chipsRefunded.toLocaleString()} CHIP</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 4px 0;">Số dư USDT hoàn về Ví Quản Trị:</td>
            <td style="color: #38bdf8; font-weight: bold; text-align: right;">${usdtRefunded.toFixed(4)} USDT</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 4px 0;">Ví TON Quản Trị thụ hưởng:</td>
            <td style="color: #34d399; font-family: monospace; font-size: 11px; text-align: right;">${adminTonWallet}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
        Hành động này đã được ghi nhận vào nhật ký kiểm toán hệ thống. Mọi quyền truy cập và dữ liệu liên quan đến tài khoản này đã chấm dứt hoàn toàn.
      </p>
    </div>
  `;

  return sendEmailViaRelay({
    to: email,
    subject,
    html,
    templateLabel: 'Xóa Vĩnh Viễn Tài Khoản & Hoàn Quỹ',
  });
}

// 4. Wallet Binding OTP Email (TON / TRON Network)
export async function sendWalletOtpEmail({
  email,
  username,
  otpCode,
  walletAddress,
  network = 'TON',
}: {
  email: string;
  username?: string;
  otpCode: string;
  walletAddress: string;
  network?: 'TON' | 'TRON';
}) {
  const networkName = network === 'TRON' ? 'TRON (TRC-20 USDT)' : 'The Open Network (TON)';
  const subject = `[CHIPCOIN] Mã OTP xác nhận liên kết ví ${networkName}: ${otpCode}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #121418; color: #ffffff; padding: 26px; border-radius: 12px; border: 1.5px solid #00c2ff;">
      <div style="text-align: center; margin-bottom: 22px;">
        <h2 style="color: #00c2ff; margin: 0; font-size: 22px; letter-spacing: 1px;">CHIPCOIN SECURITY CENTER</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 5px 0 0 0;">Xác Thực OTP 2 Lớp (2FA) — Liên Kết Ví Bảo Mật</p>
      </div>

      <p style="font-size: 14px; line-height: 1.6;">Xin chào <strong>${username || email}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
        Hệ thống CHIPCOIN ghi nhận yêu cầu liên kết địa chỉ ví <strong>${networkName}</strong> vào tài khoản của bạn.
      </p>

      <div style="background: rgba(0, 194, 255, 0.08); border: 1.5px solid #00c2ff; padding: 22px; border-radius: 10px; margin: 24px 0; text-align: center;">
        <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; font-weight: bold;">
          MÃ XÁC THỰC BẢO MẬT OTP (HIỆU LỰC 5 PHÚT):
        </div>
        <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; color: #38bdf8; letter-spacing: 8px;">
          ${otpCode}
        </div>
      </div>

      <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.12); padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
        <div style="font-size: 11px; color: #f5d77f; text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">
          ĐỊA CHỈ VÍ YÊU CẦU LIÊN KẾT (${networkName}):
        </div>
        <div style="font-family: monospace; font-size: 13px; color: #ffffff; word-break: break-all;">
          ${walletAddress}
        </div>
      </div>

      <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 12px 14px; border-radius: 4px; margin-bottom: 20px;">
        <strong style="color: #f87171; font-size: 13px;">LƯU Ý BẢO MẬT QUAN TRỌNG:</strong>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          Tuyệt đối <strong>không cung cấp mã OTP này cho bất kỳ ai</strong>, kể cả nhân viên tự xưng là Quản trị viên CHIPCOIN. Nếu bạn không thực hiện yêu cầu này, vui lòng đổi mật khẩu ngay lập tức.
        </p>
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 14px; text-align: center;">
        Email này được gửi tự động từ máy chủ bảo mật CHIPCOIN Web3 Platform.
      </p>
    </div>
  `;

  return sendEmailViaRelay({
    to: email,
    subject,
    html,
    templateLabel: `OTP Liên Kết Ví ${network}`,
  });
}

// 5. Withdrawal 2FA OTP Email
export async function sendWithdrawalOtpEmail({
  email,
  username,
  otpCode,
  amountUsdt,
  destAddress,
}: {
  email: string;
  username?: string;
  otpCode: string;
  amountUsdt: number;
  destAddress: string;
}) {
  const subject = `[CHIPCOIN] Mã OTP xác thực lệnh rút tiền ${amountUsdt} USDT: ${otpCode}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #121418; color: #ffffff; padding: 26px; border-radius: 12px; border: 1.5px solid #f5d77f;">
      <div style="text-align: center; margin-bottom: 22px;">
        <h2 style="color: #f5d77f; margin: 0; font-size: 22px;">CHIPCOIN SECURITY CENTER</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 5px 0 0 0;">Xác Thực OTP 2 Lớp (2FA) — Lệnh Rút USDT</p>
      </div>

      <p style="font-size: 14px; line-height: 1.6;">Xin chào <strong>${username || email}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
        Hệ thống nhận được yêu cầu rút <strong>${amountUsdt} USDT</strong> từ tài khoản của bạn.
      </p>

      <div style="background: rgba(245, 215, 127, 0.08); border: 1.5px solid #f5d77f; padding: 22px; border-radius: 10px; margin: 24px 0; text-align: center;">
        <div style="font-size: 12px; color: #f5d77f; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; font-weight: bold;">
          MÃ OTP XÁC NHẬN RÚT TIỀN (HIỆU LỰC 5 PHÚT):
        </div>
        <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; color: #f5d77f; letter-spacing: 8px;">
          ${otpCode}
        </div>
      </div>

      <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.12); padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">
          ĐỊA CHỈ VÍ ĐÍCH NHẬN TIỀN:
        </div>
        <div style="font-family: monospace; font-size: 13px; color: #38bdf8; word-break: break-all;">
          ${destAddress}
        </div>
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 14px; text-align: center;">
        Nếu bạn không thực hiện lệnh rút này, vui lòng khóa tài khoản hoặc liên hệ quản trị viên ngay lập tức.
      </p>
    </div>
  `;

  return sendEmailViaRelay({
    to: email,
    subject,
    html,
    templateLabel: 'OTP Rút Tiền USDT',
  });
}

