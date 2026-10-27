'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useI18n } from '../lib/i18n';
import { ChipStore, StoredUser, TIER_CONFIGS } from '../lib/store';

export default function ProfilePage() {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  // Editable Form States
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const loadUser = () => {
    let mem = ChipStore.getCurrentMember();
    if (!mem) {
      // Default to first active user if session not explicitly initialized
      const users = ChipStore.getUsers();
      mem = users.find((u) => u.roles.includes('USER')) || users[0];
      if (mem) ChipStore.setMemberSession(mem);
    }
    setCurrentUser(mem);
    if (mem) {
      setUsername(mem.username || '');
      setAvatarUrl(mem.avatarUrl || '');
    }
  };

  useEffect(() => {
    loadUser();
    const handleUpdate = () => loadUser();
    window.addEventListener('chipcoin_store_updated', handleUpdate);
    window.addEventListener('chipcoin_session_changed', handleUpdate);
    return () => {
      window.removeEventListener('chipcoin_store_updated', handleUpdate);
      window.removeEventListener('chipcoin_session_changed', handleUpdate);
    };
  }, []);

  // Handle Avatar Image File Upload
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ message: 'Dung lượng ảnh tối đa là 2MB. Vui lòng chọn ảnh nhỏ hơn.', type: 'error' });
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Remove Avatar
  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit Profile Changes
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentUser) return;

    if (!username.trim()) {
      setFeedback({ message: 'Tên hiển thị không được để trống.', type: 'error' });
      return;
    }

    // Password validation if changing
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setFeedback({ message: 'Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu.', type: 'error' });
        return;
      }
      if (newPassword.length < 12) {
        setFeedback({ message: 'Mật khẩu mới phải có tối thiểu 12 ký tự.', type: 'error' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setFeedback({ message: 'Xác nhận mật khẩu mới không khớp.', type: 'error' });
        return;
      }
    }

    setSaving(true);
    setTimeout(() => {
      try {
        const updated = ChipStore.updateProfile(currentUser.id, {
          username: username.trim(),
          avatarUrl: avatarUrl,
        });

        setCurrentUser(updated);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSaving(false);
        setFeedback({ message: t('profile_success_msg'), type: 'success' });
        setTimeout(() => setFeedback(null), 4000);
      } catch (err: any) {
        setSaving(false);
        setFeedback({ message: 'Lỗi cập nhật thông tin.', type: 'error' });
      }
    }, 400);
  };

  const currentTierMeta = currentUser?.tier ? TIER_CONFIGS[currentUser.tier] : TIER_CONFIGS['CHIP MEMBER'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Top Banner */}
      <section
        className="glass-card"
        style={{
          background:
            'radial-gradient(circle at 100% 0%, rgba(212, 175, 55, 0.18) 0%, rgba(18, 20, 24, 0.95) 70%)',
          border: '1px solid var(--border-bronze)',
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '850px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '0.8rem' }}>
            <span className="badge badge-gold">{t('profile_badge')}</span>
          </div>

          <h1 style={{ fontSize: '2.3rem', lineHeight: 1.25, marginBottom: '0.8rem' }}>
            {t('profile_title')}
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {t('profile_desc')}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/wallet" className="nav-btn" style={{ fontSize: '0.9rem', padding: '9px 20px' }}>
              🪙 {t('nav_wallet')}
            </Link>
            <Link href="/ton-wallet" className="btn-secondary" style={{ fontSize: '0.9rem', padding: '9px 20px' }}>
              💎 {t('nav_ton_wallet')}
            </Link>
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="btn-secondary"
              style={{ fontSize: '0.9rem', padding: '9px 20px', cursor: 'pointer' }}
            >
              📞 {t('profile_contact_support')}
            </button>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={`alert-box ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}
          style={{ marginBottom: 0 }}
        >
          <span>{feedback.type === 'success' ? '🎉' : '⚠️'}</span>
          <div style={{ fontWeight: 600 }}>{feedback.message}</div>
        </div>
      )}

      {/* Main Grid: Left is Avatar & Editable Settings, Right is Read-Only Ledger Security Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
        {/* Left Column: Avatar & Editable fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Avatar Management Card */}
          <section className="glass-card" style={{ padding: '1.8rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🖼️</span> {t('profile_avatar_title')}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: currentTierMeta.gradient,
                  border: `3px solid ${currentTierMeta.badgeColor}`,
                  boxShadow: `0 0 20px ${currentTierMeta.badgeColor}44`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="User Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0b0c0e' }}>
                    {currentUser?.username?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: '180px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="nav-btn"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    📷 {t('profile_avatar_upload')}
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', color: '#f43f5e' }}
                    >
                      🗑️ {t('profile_avatar_remove')}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                  {t('profile_avatar_hint')}
                </div>
              </div>
            </div>
          </section>

          {/* Editable Information Form */}
          <section className="glass-card" style={{ padding: '1.8rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✏️</span> {t('profile_editable_title')}
            </h2>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Display Name */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="username">
                  {t('profile_username')}
                </label>
                <input
                  id="username"
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="vd: satoshi_vn"
                  required
                />
              </div>

              {/* Password Section */}
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f5d77f' }}>
                  🔒 Đổi Mật Khẩu Đăng Nhập (Bỏ trống nếu không đổi)
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="currentPass">
                    {t('profile_cur_pass')}
                  </label>
                  <input
                    id="currentPass"
                    type="password"
                    className="form-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="newPass">
                    {t('profile_new_pass')}
                  </label>
                  <input
                    id="newPass"
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="confirmPass">
                    {t('profile_confirm_pass')}
                  </label>
                  <input
                    id="confirmPass"
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
                style={{ marginTop: '0.5rem', textAlign: 'center' }}
              >
                {saving ? (
                  <>
                    <div className="spinner" />
                    Đang lưu thay đổi...
                  </>
                ) : (
                  `💾 ${t('profile_btn_save')}`
                )}
              </button>
            </form>
          </section>
        </div>

        {/* Right Column: Read-Only Locked Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section
            className="glass-card"
            style={{
              padding: '1.8rem',
              border: '1px solid var(--border-bronze)',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(18, 20, 24, 0.95) 100%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔒</span> {t('profile_readonly_title')}
              </h2>
              <span className="badge badge-gold">Ledger Sealed</span>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              {t('profile_readonly_hint')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* User ID */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {t('profile_user_id')}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--accent-bronze)', fontWeight: 700, marginTop: '2px' }}>
                  {currentUser?.id || 'usr-mem-001'}
                </div>
              </div>

              {/* Registered Email */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {t('profile_reg_email')}
                </div>
                <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600, marginTop: '2px' }}>
                  {currentUser?.email || 'member@chiprin.com'}
                </div>
              </div>

              {/* Referral Code */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {t('profile_ref_code')}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--accent-bronze-light)', fontWeight: 800, marginTop: '2px' }}>
                  {currentUser?.referralCode || 'CHIP-USER-7721'}
                </div>
              </div>

              {/* Current Tier */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {t('profile_tier')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span
                    style={{
                      padding: '3px 12px',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      background: currentTierMeta.gradient,
                      color: '#0b0c0e',
                    }}
                  >
                    👑 {currentUser?.tier || 'CHIP MEMBER'}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600 }}>
                    {currentTierMeta.bonusRate > 0 ? `+${currentTierMeta.bonusRate * 100}% bonus` : 'Active'}
                  </span>
                </div>
              </div>

              {/* Connected TON Wallet */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  VÍ TON ĐÃ KẾT NỐI
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: '8px' }}>
                  {currentUser?.tonWalletAddress ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentUser.tonWalletAddress}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Chưa liên kết ví TON
                    </span>
                  )}
                  <Link href="/ton-wallet" className="glance-link" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {currentUser?.tonWalletAddress ? 'Quản lý →' : 'Liên kết ngay →'}
                  </Link>
                </div>
              </div>

              {/* Registration Date */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {t('profile_reg_date')}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleString() : '2026-10-01 14:15'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="nav-btn"
                style={{ width: '100%', padding: '10px 18px', fontSize: '0.88rem' }}
              >
                📞 {t('profile_contact_support')}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Support Contact Modal */}
      {showSupportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowSupportModal(false)}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              border: '1.5px solid var(--border-bronze)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Trung Tâm Hỗ Trợ Hội Viên</h3>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.4rem' }}>
              Để bảo vệ an toàn số dư tài sản và tính toàn vẹn của sổ cái kép, các thông tin định danh như Email, User ID,
              hoặc yêu cầu hủy liên kết ví cần được xác minh trực tiếp bởi Bộ phận Quản trị An ninh Hệ thống:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px' }}>
                📧 <strong>Email Hỗ Trợ:</strong> support@chipcoin.io
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px' }}>
                💬 <strong>Telegram Security Desk:</strong> @ChipcoinSecurity247
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px' }}>
                ⏱️ <strong>Thời gian phản hồi:</strong> Trong vòng 15-30 phút (24/7)
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="btn-primary"
              style={{ width: '100%', marginTop: '1.5rem', textAlign: 'center' }}
            >
              Đã hiểu &amp; Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
