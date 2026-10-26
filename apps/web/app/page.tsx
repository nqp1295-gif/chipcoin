import Link from 'next/link';

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '1.2rem' }}>
          <span className="badge badge-draft">Giai đoạn thử nghiệm MVP</span>
        </div>

        <h1 style={{ fontSize: '2.8rem', lineHeight: 1.2, marginBottom: '1.2rem' }}>
          Hệ Thống Tích Luỹ Điểm Thưởng{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #f5d77f 0%, #d4af37 50%, #9b711e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            CHIPCOIN
          </span>
        </h1>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '1.15rem',
            maxWidth: '680px',
            margin: '0 auto 2.2rem auto',
            lineHeight: 1.6,
          }}
        >
          CHIP là điểm thưởng nội bộ cho cộng đồng, không phải coin khai thác qua CPU/GPU.
          Hệ thống đảm bảo tính toàn vẹn sổ cái hai chiều và bảo vệ xác thực qua Transactional Outbox.
        </p>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" className="nav-btn" style={{ fontSize: '1rem', padding: '12px 28px' }}>
            Tạo tài khoản mới
          </Link>
          <Link href="/resend-verification" className="btn-secondary" style={{ padding: '12px 24px' }}>
            Gửi lại email xác minh
          </Link>
        </div>
      </section>

      {/* Grid Features & Status */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '3rem',
        }}
      >
        <div className="glass-card glow-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Trạng thái tài sản</h3>
            <span className="badge badge-active">Active Sổ cái</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.2rem' }}>
            Điểm CHIP được quản lý qua hệ thống hạch toán kép (Double-entry Ledger), liên kết với ví người dùng.
          </p>
          <div
            style={{
              background: 'rgba(0,0,0,0.45)',
              borderRadius: '10px',
              padding: '12px 16px',
              border: '1px solid var(--border-bronze)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.85rem',
            }}
          >
            <div>Mã tài sản: <strong style={{ color: 'var(--accent-bronze)' }}>CHIP</strong></div>
            <div>Loại: Điểm thưởng nội bộ</div>
            <div>Rút tiền: <span style={{ color: '#f87171' }}>Tạm khóa</span></div>
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Bảo mật xác minh email</h3>
            <span className="badge badge-draft">Transactional Outbox</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.2rem' }}>
            Token xác thực được mã hoá AES-256-GCM trong Outbox, lưu SHA-256 hash và chống brute-force 3 tầng.
          </p>
          <div
            style={{
              background: 'rgba(0,0,0,0.45)',
              borderRadius: '10px',
              padding: '12px 16px',
              border: '1px solid var(--border-bronze)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.85rem',
            }}
          >
            <div>Rate Limiter: Global + IP + Email HMAC</div>
            <div>Outbox Worker: Crash Recovery</div>
            <div>Cooldown: 60s / 5 lần giờ</div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <section className="glass-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>Trung tâm hành động người dùng</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '580px', margin: '0 auto 2rem auto' }}>
          Bạn đã đăng ký tài khoản nhưng chưa nhận được email, hoặc muốn xác thực token kích hoạt?
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/verify-email" className="btn-secondary" style={{ padding: '10px 20px' }}>
            🔗 Nhập mã xác minh
          </Link>
          <Link href="/resend-verification" className="btn-secondary" style={{ padding: '10px 20px' }}>
            📧 Gửi lại liên kết email
          </Link>
          <Link href="/login" className="btn-secondary" style={{ padding: '10px 20px' }}>
            🔑 Đăng nhập hệ thống
          </Link>
        </div>
      </section>
    </div>
  );
}
