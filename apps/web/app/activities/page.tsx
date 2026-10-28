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
  canClaimDirectly: boolean;
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
    description: 'Xác thực địa chỉ email thành công qua đường dẫn kích hoạt bảo mật. Điểm thưởng sẽ tự động được cộng vào ví điểm thưởng của bạn.',
    actionUrl: '/verify-email',
    actionText: 'Xác minh email',
    canClaimDirectly: true,
  },
  {
    id: 'task_referral_bonus',
    icon: '🤝',
    title: 'Mời Bạn Bè Tham Gia Hệ Thống',
    rewardUnits: 10000,
    rewardText: '+10,000 CHIP / Bạn + Hoa Hồng Nhánh',
    category: 'REFERRAL',
    description: 'Chia sẻ mã giới thiệu hoặc liên kết cá nhân. Yêu cầu có ít nhất 1 bạn bè đăng ký thành công qua mã giới thiệu để mở khóa phần thưởng.',
    actionUrl: '/referrals',
    actionText: 'Mở trang giới thiệu',
    canClaimDirectly: true,
  },
  {
    id: 'task_community_telegram',
    icon: '🚀',
    title: 'Tham Gia Kênh Thông Báo Cộng Đồng',
    rewardUnits: 15000,
    rewardText: 'COMING SOON',
    category: 'COMMUNITY',
    description: 'Kênh cộng đồng chính thức đang được chuẩn bị. Tính năng nhận thưởng sẽ tự động mở khi kênh thông báo chính thức đi vào hoạt động.',
    actionText: 'Kênh cộng đồng (Sắp mở)',
    canClaimDirectly: false,
  },
  {
    id: 'task_security_profile',
    icon: '🛡️',
    title: 'Thiết Lập Bảo Mật & Hoàn Thiện Hồ Sơ',
    rewardUnits: 20000,
    rewardText: '+20,000 CHIP',
    category: 'ONE_TIME',
    description: 'Bảo vệ tài khoản tích lũy bằng xác thực hai lớp (2FA) và ghi nhận đầy đủ thông tin hồ sơ (Họ tên, SĐT, Bảo mật ví).',
    actionUrl: '/profile',
    actionText: 'Mở hồ sơ cá nhân',
    canClaimDirectly: true,
  },
  {
    id: 'task_ledger_test',
    icon: '⚡',
    title: 'Trải Nghiệm Khởi Tạo Giao Dịch Thử Nghiệm',
    rewardUnits: 5000,
    rewardText: '+5,000 CHIP',
    category: 'DAILY',
    description: 'Kiểm tra tốc độ hạch toán giao dịch tức thì. Yêu cầu hoàn thành ít nhất 1 lần nạp tiền thành công vào ví USDT để nhận thưởng.',
    actionUrl: '/wallet/deposit',
    actionText: 'Mở ví nạp tiền',
    canClaimDirectly: true,
  },
];

// Helper: get today's date string in YYYY-MM-DD format (local timezone)
function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface PersistedTasksData {
  daily: Record<string, string>; // taskId -> 'YYYY-MM-DD'
  oneTime: Record<string, boolean>; // taskId -> true
}

// Helper: load persisted claimed tasks from localStorage for a given user
function loadClaimedTasks(userId: string): PersistedTasksData {
  if (typeof window === 'undefined') return { daily: {}, oneTime: {} };
  try {
    const raw = localStorage.getItem(`chipcoin_claimed_tasks_${userId}`);
    if (!raw) return { daily: {}, oneTime: {} };
    const parsed = JSON.parse(raw);
    if (!parsed.daily && !parsed.oneTime) {
      return { daily: {}, oneTime: parsed };
    }
    return {
      daily: parsed.daily || {},
      oneTime: parsed.oneTime || {},
    };
  } catch {
    return { daily: {}, oneTime: {} };
  }
}

// Helper: save claimed tasks to localStorage for a given user
function saveClaimedTasks(userId: string, data: PersistedTasksData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`chipcoin_claimed_tasks_${userId}`, JSON.stringify(data));
  } catch {}
}

// Helper: check if profile is complete (Họ tên, SĐT, Bảo mật)
function checkProfileCompleted(user: StoredUser | null): boolean {
  if (!user) return false;
  const hasName = Boolean(user.fullName && user.fullName.trim().length >= 2);
  const hasPhone = Boolean(user.phoneNumber && user.phoneNumber.trim().length >= 8);
  const hasSecurity = Boolean(user.twoFactorEnabled || user.tonWalletAddress || (user.avatarUrl && user.avatarUrl.length > 0));
  return hasName && hasPhone && hasSecurity;
}

// Helper: check if user has at least 1 settled deposit
function checkHasCompletedDeposit(user: StoredUser | null): boolean {
  if (!user) return false;
  const deposits = ChipStore.getDeposits();
  return deposits.some((d) => d.userId === user.id && d.status === 'SETTLED');
}

// Helper: check if a task is already claimed
function isTaskClaimed(
  task: ActivityTask,
  user: StoredUser | null,
  tasksData: PersistedTasksData
): boolean {
  if (!user) return false;
  const today = getTodayDateStr();

  if (task.category === 'DAILY') {
    if (task.id === 'task_daily_streak') {
      return user.lastClaimDate === today || tasksData.daily[task.id] === today;
    }
    return tasksData.daily[task.id] === today;
  }

  // ONE_TIME email verification: if email is already verified / active, treat as claimed
  if (task.id === 'task_email_verify') {
    if (user.emailVerifiedRewardClaimed || tasksData.oneTime[task.id]) return true;
    if (user.status === 'ACTIVE' && user.email_verified_at) return true;
  }

  // ONE_TIME, COMMUNITY, REFERRAL
  return Boolean(tasksData.oneTime[task.id]);
}

export default function ActivitiesPage() {
  const { t } = useI18n();

  const getTaskMeta = (task: ActivityTask) => {
    switch (task.id) {
      case 'task_daily_streak':
        return {
          title: t('task_streak_title'),
          rewardText: t('task_streak_reward'),
          description: t('task_streak_desc'),
          actionText: t('task_streak_action'),
        };
      case 'task_email_verify':
        return {
          title: t('task_email_title'),
          rewardText: task.rewardText,
          description: t('task_email_desc'),
          actionText: t('task_email_action'),
        };
      case 'task_referral_bonus':
        return {
          title: t('task_referral_title'),
          rewardText: t('task_referral_reward'),
          description: t('task_referral_desc'),
          actionText: t('task_referral_action'),
        };
      case 'task_community_telegram':
        return {
          title: t('task_community_title'),
          rewardText: 'COMING SOON',
          description: t('task_community_desc'),
          actionText: t('task_community_action'),
        };
      case 'task_security_profile':
        return {
          title: t('task_profile_title'),
          rewardText: task.rewardText,
          description: t('task_profile_desc'),
          actionText: t('task_profile_action'),
        };
      case 'task_ledger_test':
        return {
          title: t('task_deposit_title'),
          rewardText: task.rewardText,
          description: t('task_deposit_desc'),
          actionText: t('task_deposit_action'),
        };
      default:
        return {
          title: task.title,
          rewardText: task.rewardText,
          description: task.description,
          actionText: task.actionText,
        };
    }
  };

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [tasksData, setTasksData] = useState<PersistedTasksData>({ daily: {}, oneTime: {} });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const loadMember = () => {
    const mem = ChipStore.getCurrentMember();
    setCurrentUser(mem);

    if (mem) {
      const loaded = loadClaimedTasks(mem.id);
      // Synchronize daily check-in from user's lastClaimDate
      if (mem.lastClaimDate === getTodayDateStr()) {
        loaded.daily['task_daily_streak'] = getTodayDateStr();
      }
      setTasksData(loaded);
    }
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
    if (!currentUser) {
      setNotification({
        message: 'Vui lòng đăng nhập để nhận thưởng vào ví cá nhân của bạn!',
        type: 'info',
      });
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    // 1. Task: Community Telegram -> Coming Soon
    if (task.id === 'task_community_telegram') {
      setNotification({
        message: 'Kênh cộng đồng chính thức đang được chuẩn bị (Coming Soon). Vui lòng đón chờ!',
        type: 'info',
      });
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    const currentTasksData = loadClaimedTasks(currentUser.id);
    if (isTaskClaimed(task, currentUser, currentTasksData)) {
      if (task.category === 'DAILY') {
        setNotification({
          message: 'Bạn đã hoàn thành nhiệm vụ này hôm nay rồi! Hãy quay lại vào ngày mai.',
          type: 'info',
        });
      } else if (task.id === 'task_email_verify') {
        setNotification({
          message: 'Tài khoản của bạn đã được nhận thưởng xác minh email thành công rồi!',
          type: 'info',
        });
      } else {
        setNotification({
          message: 'Bạn đã nhận phần thưởng cho nhiệm vụ này rồi!',
          type: 'info',
        });
      }
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    // 2. Task: Referral Bonus -> Requires at least 1 referral
    if (task.id === 'task_referral_bonus') {
      const referrals = ChipStore.getReferralsByReferrer(currentUser.referralCode);
      if (referrals.length === 0) {
        setNotification({
          message: `Bạn chưa có bạn bè nào đăng ký qua mã giới thiệu (${currentUser.referralCode}). Hãy chia sẻ mã mời của bạn để mở khóa thưởng!`,
          type: 'info',
        });
        setTimeout(() => setNotification(null), 4500);
        return;
      }
    }

    // 3. Task: Security & Profile -> Requires completed profile
    if (task.id === 'task_security_profile') {
      if (!checkProfileCompleted(currentUser)) {
        setNotification({
          message: 'Hồ sơ chưa hoàn thiện! Bạn cần vào trang Hồ Sơ Cá Nhân điền Họ Tên, Số Điện Thoại và Thiết Lập Bảo Mật trước khi nhận thưởng.',
          type: 'info',
        });
        setTimeout(() => setNotification(null), 5000);
        return;
      }
    }

    // 4. Task: Ledger Test -> Requires at least 1 settled deposit
    if (task.id === 'task_ledger_test') {
      if (!checkHasCompletedDeposit(currentUser)) {
        setNotification({
          message: 'Nhiệm vụ yêu cầu bạn phải hoàn thành ít nhất 1 lần nạp tiền thành công vào ví USDT trước khi nhận thưởng!',
          type: 'info',
        });
        setTimeout(() => setNotification(null), 5000);
        return;
      }
    }

    try {
      const { user, promoted } = ChipStore.addChips(
        currentUser.id,
        task.rewardUnits,
        `Hoàn thành hoạt động: ${task.title}`
      );

      const today = getTodayDateStr();
      const updatedData: PersistedTasksData = {
        daily: { ...currentTasksData.daily },
        oneTime: { ...currentTasksData.oneTime },
      };

      if (task.category === 'DAILY') {
        updatedData.daily[task.id] = today;
        if (task.id === 'task_daily_streak') {
          ChipStore.recordDailyCheckin(currentUser.id);
        }
      } else {
        updatedData.oneTime[task.id] = true;
      }

      saveClaimedTasks(currentUser.id, updatedData);
      setTasksData(updatedData);

      const refreshed = ChipStore.getUserById(currentUser.id) || user;
      setCurrentUser(refreshed);

      if (promoted) {
        setNotification({
          message: `🎉 XUẤT SẮC! Bạn đã được thăng hạng lên [${user.tier}]! Đặc quyền mới đã được kích hoạt.`,
          type: 'success',
        });
      } else {
        setNotification({
          message: `✨ Thành công! Đã cộng +${task.rewardUnits.toLocaleString()} CHIP vào ví của bạn. Số dư mới: ${refreshed.chipsBalance.toLocaleString()} CHIP.`,
          type: 'success',
        });
      }
      setTimeout(() => setNotification(null), 5000);
    } catch (e: any) {
      setNotification({ message: 'Lỗi ghi nhận điểm thưởng.', type: 'info' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const isDailyStreakClaimed = isTaskClaimed(TASKS[0], currentUser, tasksData);
  const streakDays = currentUser?.streakDays || 1;

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
            <span className="badge badge-gold">{t('act_badge')}</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', lineHeight: 1.25, marginBottom: '0.8rem' }}>
            {t('act_title')}
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: 1.6, marginBottom: '1.6rem' }}>
            {t('act_desc')}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/rank" className="nav-btn" style={{ fontSize: '0.92rem', padding: '9px 20px' }}>
              👑 {t('nav_rank')}
            </Link>
            <Link href="/referrals" className="btn-secondary" style={{ fontSize: '0.92rem', padding: '9px 20px' }}>
              🤝 {t('nav_referrals')}
            </Link>
            <Link href="/wallet" className="btn-secondary" style={{ fontSize: '0.92rem', padding: '9px 20px' }}>
              🪙 {t('nav_wallet')}
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
              <h2 style={{ fontSize: '1.4rem' }}>{t('act_streak_title')}</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '2px' }}>
              {t('act_streak_desc')}
            </p>
          </div>

          <button
            onClick={() => handleClaim(TASKS[0])}
            disabled={isDailyStreakClaimed}
            className="nav-btn"
            style={{
              padding: '10px 22px',
              background: isDailyStreakClaimed ? 'rgba(52, 211, 153, 0.2)' : 'var(--gradient-bronze)',
              color: isDailyStreakClaimed ? '#34d399' : '#0b0c0e',
              border: isDailyStreakClaimed ? '1px solid rgba(52, 211, 153, 0.4)' : 'none',
              cursor: isDailyStreakClaimed ? 'default' : 'pointer',
              fontWeight: 700,
            }}
          >
            {isDailyStreakClaimed ? t('act_streak_done') : t('act_streak_btn')}
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
            const isToday = day === streakDays + (isDailyStreakClaimed ? 0 : 1);
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
                  {t('act_day')} {day}
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
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{t('act_all_title')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            {t('act_all_desc')}
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
            const meta = getTaskMeta(task);
            const isClaimed = isTaskClaimed(task, currentUser, tasksData);
            const isCommunity = task.id === 'task_community_telegram';
            const isRefTask = task.id === 'task_referral_bonus';
            const hasRefs = currentUser ? ChipStore.getReferralsByReferrer(currentUser.referralCode).length >= 1 : false;
            const isProfTask = task.id === 'task_security_profile';
            const isProfDone = checkProfileCompleted(currentUser);
            const isDepTask = task.id === 'task_ledger_test';
            const hasDep = checkHasCompletedDeposit(currentUser);

            return (
              <div
                key={task.id}
                className="glass-card glow-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.6rem',
                  borderColor: isClaimed ? 'rgba(52, 211, 153, 0.35)' : undefined,
                  background: isClaimed ? 'rgba(52, 211, 153, 0.03)' : undefined,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '2rem' }}>{task.icon}</span>
                    <span className={`badge ${isClaimed ? 'badge-pulse' : isCommunity ? 'badge-neutral' : 'badge-gold'}`}>
                      {isClaimed
                        ? (task.category === 'DAILY' ? `✓ ${t('act_claimed_today')}` : t('act_claimed'))
                        : isCommunity
                        ? `⏳ ${t('act_coming_soon')}`
                        : meta.rewardText}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>{meta.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
                    {meta.description}
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
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  {isClaimed ? (
                    <span
                      style={{
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        color: '#34d399',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                      }}
                    >
                      {task.category === 'DAILY' ? `✓ ${t('act_claimed_today')}` : `✓ ${t('act_completed')}`}
                    </span>
                  ) : isCommunity ? (
                    <button
                      disabled
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-medium)',
                        padding: '7px 16px',
                        borderRadius: '6px',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        fontSize: '0.88rem',
                      }}
                    >
                      ⏳ {t('act_coming_soon')}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleClaim(task)}
                        style={{
                          background:
                            isRefTask && !hasRefs
                              ? 'rgba(212, 175, 55, 0.15)'
                              : isProfTask && !isProfDone
                              ? 'rgba(239, 68, 68, 0.15)'
                              : isDepTask && !hasDep
                              ? 'rgba(56, 189, 248, 0.15)'
                              : 'var(--gradient-bronze)',
                          color:
                            isRefTask && !hasRefs
                              ? '#f5d77f'
                              : isProfTask && !isProfDone
                              ? '#fca5a5'
                              : isDepTask && !hasDep
                              ? '#7dd3fc'
                              : '#0b0c0e',
                          border:
                            isRefTask && !hasRefs
                              ? '1px solid rgba(212, 175, 55, 0.3)'
                              : isProfTask && !isProfDone
                              ? '1px solid rgba(239, 68, 68, 0.3)'
                              : isDepTask && !hasDep
                              ? '1px solid rgba(56, 189, 248, 0.3)'
                              : 'none',
                          padding: '7px 16px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.88rem',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {task.id === 'task_daily_streak'
                          ? t('act_streak_btn')
                          : isRefTask && !hasRefs
                          ? t('act_req_referral_not_met')
                          : isProfTask && !isProfDone
                          ? t('act_req_profile_not_met')
                          : isDepTask && !hasDep
                          ? t('act_req_deposit_not_met')
                          : t('act_claim_btn')}
                      </button>

                      {task.actionUrl && (
                        <Link
                          href={task.actionUrl}
                          className="glance-link"
                          style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}
                        >
                          ({meta.actionText} ↗)
                        </Link>
                      )}
                    </div>
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
