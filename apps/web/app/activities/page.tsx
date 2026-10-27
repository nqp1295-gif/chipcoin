'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '../lib/i18n';
import { ChipStore, StoredUser, TIER_CONFIGS } from '../lib/store';

interface ActivityTask {
  id: string;
  icon: string;
  title: string;
  rewardUnits: number;
  rewardText: string;
  category: 'DAILY' | 'ONE_TIME' | 'COMMUNITY' | 'REFERRAL';
  description: string;
  actionUrl?: string;
  actionText: string;
  canClaimDirectly?: boolean;
}

const TASKS: ActivityTask[] = [
  {
    id: 'task_daily_streak',
    icon: '📅',
    title: 'Điểm Danh Chuỗi Ngày (Daily Streak)',
    rewardUnits: 250,
    rewardText: '+250 đến +2,000 CHIP',
    category: 'DAILY',
    description: 'Đăng nhập và điểm danh mỗi ngày để duy trì chuỗi liên tục. Đạt mốc 7 ngày liên tiếp để nhận thưởng Hộp Quà Bí Mật.',
    actionText: 'Điểm danh ngay',
    canClaimDirectly: true,
  },
  {
    id: 'task_email_verify',
    icon: '✉️',
    title: 'Xác Minh Email Bảo Mật',
    rewardUnits: 5000,
    rewardText: '+5,000 CHIP',
    category: 'ONE_TIME',
    description: 'Xác thực địa chỉ email thành công qua đường dẫn kích hoạt bảo mật. Điểm thưởng sẽ được ghi ngay vào sổ cái kép của bạn.',
    actionUrl: '/resend-verification',
    actionText: 'Kích hoạt / Xác minh email',
  },
  {
    id: 'task_referral_bonus',
    icon: '🤝',
    title: 'Mời Bạn Bè Tham Gia Hệ Thống',
    rewardUnits: 10000,
    rewardText: '+10,000 CHIP / Bạn + Hoa Hồng Nhánh',
    category: 'REFERRAL',
    description: 'Chia sẻ mã giới thiệu hoặc liên kết cá nhân. Nhận hoa hồng thụ động (3% - 20%) từ mọi điểm thưởng người được giới thiệu kiếm được.',
    actionUrl: '/referrals',
    actionText: 'Xem mã & nhánh giới thiệu',
  },
  {
    id: 'task_community_telegram',
    icon: '🚀',
    title: 'Tham Gia Kênh Thông Báo Cộng Đồng',
    rewardUnits: 15000,
    rewardText: '+15,000 CHIP',
    category: 'COMMUNITY',
    description: 'Theo dõi tin tức phát triển công nghệ, đợt airdrop token nội bộ và đối soát sổ cái hàng tuần cùng các hội viên khác.',
    actionText: 'Hoàn thành nhiệm vụ',
    canClaimDirectly: true,
  },
  {
    id: 'task_security_profile',
    icon: '🛡️',
    title: 'Thiết Lập Bảo Mật & Hoàn Thiện Hồ Sơ',
    rewardUnits: 20000,
    rewardText: '+20,000 CHIP',
    category: 'ONE_TIME',
    description: 'Bảo vệ tài khoản tích lũy bằng xác thực hai lớp (2FA) và ghi nhận thông tin chủ sở hữu ví điểm.',
    actionText: 'Kích hoạt bảo mật',
    canClaimDirectly: true,
  },
  {
    id: 'task_ledger_test',
    icon: '⚡',
    title: 'Trải Nghiệm Khởi Tạo Giao Dịch Sổ Cái',
    rewardUnits: 5000,
    rewardText: '+5,000 CHIP',
    category: 'DAILY',
    description: 'Kiểm tra tốc độ hạch toán giao dịch sổ cái kép Double-entry Ledger bảo đảm cân bằng DEBIT / CREDIT tức thì.',
    actionUrl: '/wallet',
    actionText: 'Mở ví kiểm tra sổ cái',
  },
];

export default function ActivitiesPage() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [claimedTasks, setClaimedTasks] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const loadMember = () => {
    const mem = ChipStore.getCurrentMember();
    setCurrentUser(mem);
  };

  useEffect(() => {
    loadMember();
    const handleUpdate = () => loadMember();
    window.addEventListener('chipcoin_store_updated', handleUpdate);
    window.addEventListener('chipcoin_session_changed', handleUpdate);
    return () => {
      window.removeEventListener('chipcoin_store_updated', handleUpdate);
      window.removeEventListener('chipcoin_session_changed', handleUpdate);
    };
  }, []);

  const handleClaim = (task: ActivityTask) => {
    if (claimedTasks[task.id]) return;

    if (!currentUser) {
      setNotification({
        message: 'Vui lòng đăng nhập để nhận thưởng vào ví cá nhân của bạn!',
        type: 'info',
      });
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    try {
      const { user, promoted } = ChipStore.addChips(
        currentUser.id,
        task.rewardUnits,
        `Hoàn thành hoạt động: ${task.title}`
      );
      setCurrentUser(user);
      setClaimedTasks((prev) => ({ ...prev, [task.id]: true }));

      if (promoted) {
        setNotification({
          message: `🎉 XUẤT SẮC! Bạn đã được thăng hạng lên [${user.tier}]! Đặc quyền mới đã được kích hoạt.`,
          type: 'success',
        });
      } else {
        setNotification({
          message: `✨ Thành công! Đã cộng +${task.rewardUnits.toLocaleString()} CHIP vào ví của bạn. Số dư mới: ${user.chipsBalance.toLocaleString()} CHIP.`,
          type: 'success',
        });
      }
      setTimeout(() => setNotification(null), 5000);
    } catch (e: any) {
      setNotification({ message: 'Lỗi ghi nhận điểm thưởng.', type: 'info' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const streakDays = currentUser?.streakDays || 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
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
            <span className="badge badge-gold">⭐ TRUNG TÂM HOẠT ĐỘNG &amp; NHIỆM VỤ</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', lineHeight: 1.25, marginBottom: '0.8rem' }}>
            Hoạt Động Tích Lũy Điểm Thưởng
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: 1.6, marginBottom: '1.6rem' }}>
            Khám phá các nhiệm vụ điểm danh hàng ngày, mở rộng mạng lưới giới thiệu và hoàn tất hoạt động cộng đồng
            để thu thập điểm thưởng CHIP và gia tăng tiến trình thăng hạng VIP.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/rank" className="nav-btn" style={{ fontSize: '0.92rem', padding: '9px 20px' }}>
              👑 Xem Điều Kiện Thăng Hạng →
            </Link>
            <Link href="/referrals" className="btn-secondary" style={{ fontSize: '0.92rem', padding: '9px 20px' }}>
              🤝 Nhận Link &amp; Mã Giới Thiệu
            </Link>
            <Link href="/wallet" className="btn-secondary" style={{ fontSize: '0.92rem', padding: '9px 20px' }}>
              🪙 Mở Ví Cá Nhân
            </Link>
          </div>
        </div>
      </section>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`alert-box ${notification.type === 'success' ? 'alert-success' : 'alert-error'}`}
          style={{ marginBottom: 0 }}
        >
          <span>{notification.type === 'success' ? '🎉' : 'ℹ️'}</span>
          <div style={{ fontWeight: 600 }}>{notification.message}</div>
        </div>
      )}

      {/* Daily Check-in Streak Visualizer */}
      <section className="glass-card" style={{ padding: '1.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>🔥</span>
              <h2 style={{ fontSize: '1.4rem' }}>Chuỗi Điểm Danh Hàng Ngày</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '2px' }}>
              Duy trì chuỗi điểm danh 7 ngày liên tục để nhận thưởng Hòm Bí Mật lên đến +5,000 CHIP
            </p>
          </div>

          <button
            onClick={() => handleClaim(TASKS[0])}
            disabled={claimedTasks['task_daily_streak']}
            className="nav-btn"
            style={{
              padding: '10px 22px',
              background: claimedTasks['task_daily_streak'] ? 'rgba(52, 211, 153, 0.2)' : 'var(--gradient-bronze)',
              color: claimedTasks['task_daily_streak'] ? '#34d399' : '#0b0c0e',
              border: claimedTasks['task_daily_streak'] ? '1px solid rgba(52, 211, 153, 0.4)' : 'none',
              cursor: claimedTasks['task_daily_streak'] ? 'default' : 'pointer',
            }}
          >
            {claimedTasks['task_daily_streak'] ? '✓ Đã Điểm Danh Hôm Nay' : '🎁 Điểm Danh Nhận +250 CHIP'}
          </button>
        </div>

        {/* 7-Day Visual Progress */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '10px',
            marginTop: '1.2rem',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const isCompleted = day <= streakDays;
            const isToday = day === streakDays + (claimedTasks['task_daily_streak'] ? 0 : 1);
            return (
              <div
                key={day}
                style={{
                  background: isCompleted
                    ? 'rgba(212, 175, 55, 0.16)'
                    : isToday
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: isCompleted
                    ? '1.5px solid var(--accent-bronze)'
                    : isToday
                    ? '1.5px dashed var(--accent-bronze-light)'
                    : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px 6px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: isCompleted ? 'var(--accent-bronze-light)' : 'var(--text-muted)', fontWeight: 700 }}>
                  NGÀY {day}
                </div>
                <div style={{ fontSize: '1.5rem', margin: '6px 0' }}>
                  {day === 7 ? '🎁' : isCompleted ? '✓' : '🪙'}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isCompleted ? '#34d399' : '#ffffff' }}>
                  {day === 7 ? '+2,000' : `+${200 + day * 50}`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Full Task Grid */}
      <section>
        <div style={{ marginBottom: '1.2rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Tất Cả Nhiệm Vụ &amp; Hoạt Động</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Hoàn tất các mục tiêu dưới đây để tự động cộng điểm thưởng vào tài khoản
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.3rem',
          }}
        >
          {TASKS.map((task) => {
            const isClaimed = claimedTasks[task.id];
            return (
              <div
                key={task.id}
                className="glass-card glow-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.6rem',
                  borderColor: isClaimed ? 'rgba(52, 211, 153, 0.3)' : undefined,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '2rem' }}>{task.icon}</span>
                    <span className={`badge ${isClaimed ? 'badge-pulse' : 'badge-gold'}`}>
                      {isClaimed ? '✓ ĐÃ NHẬN' : task.rewardText}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>{task.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
                    {task.description}
                  </p>
                </div>

                <div
                  style={{
                    paddingTop: '1.2rem',
                    borderTop: '1px solid var(--border-subtle)',
                    marginTop: '1.2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  {task.canClaimDirectly ? (
                    <button
                      onClick={() => handleClaim(task)}
                      disabled={isClaimed}
                      style={{
                        background: isClaimed ? 'rgba(52, 211, 153, 0.15)' : 'none',
                        border: isClaimed ? '1px solid rgba(52, 211, 153, 0.3)' : 'none',
                        padding: isClaimed ? '6px 14px' : 0,
                        borderRadius: '6px',
                        color: isClaimed ? '#34d399' : 'var(--accent-bronze)',
                        fontWeight: 700,
                        cursor: isClaimed ? 'default' : 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isClaimed ? '✓ Đã nhận thưởng' : 'Nhấn nhận thưởng ngay →'}
                    </button>
                  ) : (
                    <Link
                      href={task.actionUrl || '#'}
                      className="glance-link"
                      style={{ fontSize: '0.9rem', fontWeight: 600 }}
                    >
                      {task.actionText} →
                    </Link>
                  )}

                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {task.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
