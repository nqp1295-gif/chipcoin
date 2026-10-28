'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import { ChipStore, ADMIN_TON_WALLET, detectWalletNetwork } from '../lib/store';
import { useI18n } from '../lib/i18n';
import {
  sendPasswordResetEmail,
  sendStatusChangeEmail,
  sendAccountDeletedEmail,
} from '../lib/systemEmail';

interface AccountItem {
  id: string;
  username: string;
  email: string;
  status: string;
  statusReason?: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at?: string;
  roles: string[];
  chipsBalance?: number;
  usdtBalance?: number;
}

export default function SystemAccountsPage() {
  const router = useRouter();
  const { t } = useI18n();

  const roleToTitle = (role: string): string => {
    switch (role) {
      case 'ADMIN':
        return '👑 ' + t('role_admin', 'Quản Trị Viên');
      case 'ASSISTANT':
        return '💼 ' + t('role_assistant', 'Trợ Lý');
      case 'SPECIALIST':
        return '🔍 ' + t('role_specialist', 'Chuyên Viên');
      case 'USER':
        return '👤 ' + t('role_user', 'Người Dùng');
      case 'OWNER':
        return '👑 ' + t('role_owner', 'Sở Hữu');
      default:
        return role;
    }
  };

  // Current session
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Accounts list
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal 1: Create Account
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'ASSISTANT' | 'SPECIALIST'>('ASSISTANT');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Modal 2: Reset Password
  const [resetModalAccount, setResetModalAccount] = useState<AccountItem | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Modal 3: Dừng Hoạt Động / Kích Hoạt (Yêu cầu ghi chú cụ thể lý do)
  const [statusModalAccount, setStatusModalAccount] = useState<AccountItem | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Modal 4: Xóa Vĩnh Viễn Tài Khoản & Hoàn Quỹ
  const [deleteModalAccount, setDeleteModalAccount] = useState<AccountItem | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success', duration = 5000) => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), duration);
  };

  // Check session on mount
  useEffect(() => {
    let storedSession: any = null;
    try {
      const raw = localStorage.getItem('chipcoin_system_session');
      if (raw) storedSession = JSON.parse(raw);
    } catch (e) {}

    if (storedSession) {
      setCurrentUser(storedSession);
    }

    loadAccounts();

    const handleUpdate = () => loadAccounts();
    window.addEventListener('chipcoin_store_updated', handleUpdate);
    return () => window.removeEventListener('chipcoin_store_updated', handleUpdate);
  }, []);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    setFetchError(null);

    let apiList: any[] = [];

    try {
      const res = await apiRequest('/api/v1/system/accounts', {
        method: 'GET',
      });

      if (res.success) {
        apiList = Array.isArray(res.data) ? res.data : (res.data?.accounts || []);
      }
    } catch (err: any) {
      // API offline fallback to local store
    } finally {
      // Merge with shared store so newly registered members are immediately visible
      try {
        const storedUsers = ChipStore.getUsers();
        const mergedMap = new Map<string, AccountItem>();

        // 1. Add all from storedUsers
        storedUsers.forEach((u: any) => {
          mergedMap.set(u.email.toLowerCase(), {
            id: u.id,
            username: u.username,
            email: u.email,
            status: u.status || 'ACTIVE',
            statusReason: u.statusReason,
            email_verified_at: u.email_verified_at,
            created_at: u.created_at,
            updated_at: u.updated_at || u.created_at,
            roles: u.roles || ['USER'],
            chipsBalance: u.chipsBalance || 0,
            usdtBalance: u.usdtBalance || 0,
          });
        });

        // 2. Add or overwrite with API results
        apiList.forEach((a: any) => {
          const key = a.email.toLowerCase();
          const existing = mergedMap.get(key);
          mergedMap.set(key, {
            id: a.id || existing?.id || `usr-${Date.now()}`,
            username: a.username || existing?.username || a.email.split('@')[0],
            email: a.email,
            status: a.status || existing?.status || 'ACTIVE',
            statusReason: a.statusReason || existing?.statusReason,
            email_verified_at: a.email_verified_at !== undefined ? a.email_verified_at : existing?.email_verified_at,
            created_at: a.created_at || existing?.created_at || new Date().toISOString(),
            updated_at: a.updated_at || existing?.updated_at || a.created_at || new Date().toISOString(),
            roles: a.roles || existing?.roles || ['USER'],
            chipsBalance: existing?.chipsBalance ?? 0,
            usdtBalance: existing?.usdtBalance ?? 0,
          });
        });

        setAccounts(Array.from(mergedMap.values()));
      } catch (e) {
        setAccounts(apiList);
      }

      setLoadingAccounts(false);
      setLoadingSession(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('chipcoin_system_session');
    } catch (e) {}
    router.push('/system/login');
  };

  // 1. Handler Tạo tài khoản mới
  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!newEmail.trim() || !newPassword) {
      setCreateError('Vui lòng nhập email và mật khẩu.');
      return;
    }

    if (newPassword.length < 12) {
      setCreateError('Mật khẩu tài khoản quản trị hệ thống phải có ít nhất 12 ký tự.');
      return;
    }

    setCreating(true);

    try {
      const res = await apiRequest('/api/v1/system/accounts', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername.trim() || undefined,
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          role: newRole,
        }),
      });

      if (!res.success) {
        setCreateError(res.message || 'Tạo tài khoản quản trị thất bại.');
        return;
      }

      // Synchronize with Central Store
      try {
        ChipStore.upsertUser({
          id: `usr-${Date.now()}`,
          username: newUsername.trim() || newEmail.split('@')[0],
          email: newEmail.trim().toLowerCase(),
          roles: [newRole],
          status: 'ACTIVE',
          email_verified_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tier: newRole === 'ADMIN' ? 'CHIP SPECIAL' : newRole === 'ASSISTANT' ? 'CHIP DIAMOND' : 'CHIP PLATINUM',
          referralCode: `CHIP-${newRole.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
          chipsBalance: 1000000,
          usdtBalance: 0,
          streakDays: 1,
        });
      } catch (e) {}

      setCreateSuccess(`Tạo thành công tài khoản ${newEmail} với quyền ${roleToTitle(newRole)}.`);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('ASSISTANT');

      loadAccounts();

      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
      }, 1500);
    } catch (err: any) {
      setCreateError('Lỗi kết nối tới máy chủ quản trị.');
    } finally {
      setCreating(false);
    }
  };

  // 2. Action: Reset Password
  const handleOpenResetModal = (acc: AccountItem) => {
    setResetModalAccount(acc);
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    setTempPassword(`Chip@${randomSuffix}#Pass`);
    setCopiedPass(false);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetModalAccount) return;
    setIsResetting(true);

    try {
      // 1. Cập nhật mật khẩu trong kho dữ liệu
      ChipStore.resetUserPassword(resetModalAccount.id, tempPassword);

      // 2. Gửi email thông báo tự động cho hội viên
      await sendPasswordResetEmail(
        resetModalAccount.email,
        resetModalAccount.username,
        tempPassword
      );

      showToast(
        `✓ Đã đặt lại mật khẩu cho ${resetModalAccount.email}! Email thông báo và mật khẩu mới đã được gửi tới hội viên.`,
        'success',
        6000
      );

      loadAccounts();
      setResetModalAccount(null);
    } catch (err: any) {
      showToast(err.message || 'Lỗi đặt lại mật khẩu.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // 3. Action: Dừng Hoạt Động / Kích Hoạt
  const handleOpenStatusModal = (acc: AccountItem) => {
    setStatusModalAccount(acc);
    setStatusReason('');
  };

  const handleConfirmStatusChange = async () => {
    if (!statusModalAccount) return;
    if (statusReason.trim().length < 5) {
      showToast('Vui lòng ghi chú lý do cụ thể (tối thiểu 5 ký tự) trước khi xác nhận.', 'error');
      return;
    }

    setIsUpdatingStatus(true);
    const isCurrentlyActive = statusModalAccount.status === 'ACTIVE';
    const nextStatus = isCurrentlyActive ? 'SUSPENDED' : 'ACTIVE';

    try {
      // 1. Cập nhật trạng thái
      ChipStore.updateUserStatus(statusModalAccount.id, nextStatus, statusReason.trim());

      // 2. Gửi email thông báo cho hội viên kèm lý do
      await sendStatusChangeEmail(
        statusModalAccount.email,
        statusModalAccount.username,
        nextStatus,
        statusReason.trim()
      );

      showToast(
        `✓ Đã chuyển trạng thái tài khoản ${statusModalAccount.email} sang "${nextStatus === 'ACTIVE' ? 'Hoạt Động' : 'Tạm Dừng'}". Đã gửi email thông báo kèm lý do cho hội viên!`,
        'success',
        6000
      );

      loadAccounts();
      setStatusModalAccount(null);
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật trạng thái tài khoản.', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 4. Action: Xóa Vĩnh Viễn Tài Khoản & Hoàn Quỹ
  const handleOpenDeleteModal = (acc: AccountItem) => {
    setDeleteModalAccount(acc);
    setDeleteReason('');
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deleteModalAccount) return;
    if (deleteReason.trim().length < 5) {
      showToast('Vui lòng ghi chú lý do cụ thể xóa vĩnh viễn (tối thiểu 5 ký tự) trước khi xác nhận.', 'error');
      return;
    }

    setIsDeleting(true);

    try {
      // 1. Thực hiện xóa vĩnh viễn và hoàn quỹ
      const res = ChipStore.deleteUserPermanently(deleteModalAccount.id, deleteReason.trim());

      // 2. Gửi email thông báo cho hội viên về việc xóa vĩnh viễn
      await sendAccountDeletedEmail(
        deleteModalAccount.email,
        deleteModalAccount.username,
        deleteReason.trim(),
        res.chipsRefunded,
        res.usdtRefunded,
        res.destinationTonWallet
      );

      const refundDest = res.destinationTonWallet || ChipStore.getActiveAdminWallet().address;
      const destMeta = detectWalletNetwork(refundDest);
      showToast(
        `🗑️ Đã xóa vĩnh viễn tài khoản ${deleteModalAccount.email}. Đã hoàn +${res.chipsRefunded.toLocaleString()} CHIP về Kho Quỹ Hệ Thống & +${res.usdtRefunded.toFixed(4)} USDT về ${destMeta.icon} Ví ${destMeta.shortName} Quản Trị (${refundDest.slice(0, 6)}...${refundDest.slice(-6)})!`,
        'success',
        8000
      );

      loadAccounts();
      setDeleteModalAccount(null);
    } catch (err: any) {
      showToast(err.message || 'Lỗi xóa tài khoản.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.username && acc.username.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (roleFilter === 'ALL') return true;
    return acc.roles.includes(roleFilter);
  });

  // Calculate stats
  const totalAccounts = accounts.length;
  const adminCount = accounts.filter((a) => a.roles.includes('ADMIN')).length;
  const assistantCount = accounts.filter((a) => a.roles.includes('ASSISTANT')).length;
  const specialistCount = accounts.filter((a) => a.roles.includes('SPECIALIST')).length;
  const userCount = accounts.filter(
    (a) => a.roles.includes('USER') || a.roles.length === 0
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`alert-box ${
            toastMessage.type === 'success'
              ? 'alert-success'
              : toastMessage.type === 'error'
              ? 'alert-error'
              : 'alert-info'
          }`}
          style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 99999, maxWidth: '520px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        >
          <span>{toastMessage.type === 'success' ? '✅' : toastMessage.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <div style={{ fontWeight: 600 }}>{toastMessage.message}</div>
        </div>
      )}

      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          paddingBottom: '1.2rem',
          borderBottom: '1px solid var(--border-bronze)',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--accent-bronze)',
              fontSize: '0.82rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}
          >
            {t('sys_acc_badge')}
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>{t('sys_acc_title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            {t('sys_acc_desc')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUser && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                  {currentUser.email}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-bronze)' }}>
                  {currentUser.roles?.map((r: string) => roleToTitle(r)).join(', ') || 'System Staff'}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="nav-btn"
            style={{ cursor: 'pointer', border: 'none' }}
          >
            {t('sys_btn_create_acc')}
          </button>

          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            {t('btn_logout')}
          </button>
        </div>
      </div>

      {/* Unauthorized warning if fetch failed */}
      {fetchError && (
        <div className="alert-box alert-error">
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{fetchError}</div>
            <div style={{ marginTop: '8px' }}>
              <Link
                href="/system/login"
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  background: 'rgba(212, 175, 55, 0.2)',
                  border: '1px solid var(--accent-bronze)',
                  borderRadius: '6px',
                  color: '#f5d77f',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                👉 Bấm vào đây để Đăng nhập lại Cổng Quản Trị Hệ Thống
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Role Hierarchy Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Admin Card */}
        <div
          className="glass-card"
          style={{
            padding: '1.4rem',
            borderLeft: '4px solid #d4af37',
            background: 'rgba(212, 175, 55, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>👑</span>
            <span className="badge badge-role-admin">{t('sys_role_card_admin_badge', 'Cấp 1 • Tối Cao')}</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: '#f5d77f' }}>
            {adminCount}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', marginTop: '2px' }}>
            {t('sys_role_card_admin_title', 'Quản Trị Viên (ADMIN)')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {t('sys_role_card_admin_desc', 'Toàn quyền hệ thống: quản lý tài khoản, tạo & phân quyền, cấu hình outbox.')}
          </div>
        </div>

        {/* Assistant Card */}
        <div
          className="glass-card"
          style={{
            padding: '1.4rem',
            borderLeft: '4px solid #818cf8',
            background: 'rgba(129, 140, 248, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>💼</span>
            <span className="badge badge-role-assistant">{t('sys_role_card_asst_badge', 'Cấp 2 • Điều Hành')}</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: '#a5b4fc' }}>
            {assistantCount}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', marginTop: '2px' }}>
            {t('sys_role_card_asst_title', 'Trợ Lý (ASSISTANT)')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {t('sys_role_card_asst_desc', 'Hỗ trợ ban quản trị, giám sát trạng thái tài khoản & phê duyệt quy trình.')}
          </div>
        </div>

        {/* Specialist Card */}
        <div
          className="glass-card"
          style={{
            padding: '1.4rem',
            borderLeft: '4px solid #38bdf8',
            background: 'rgba(56, 189, 248, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>🔍</span>
            <span className="badge badge-role-specialist">{t('sys_role_card_spec_badge', 'Cấp 3 • Nghiệp Vụ')}</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: '#7dd3fc' }}>
            {specialistCount}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', marginTop: '2px' }}>
            {t('sys_role_card_spec_title', 'Chuyên Viên (SPECIALIST)')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {t('sys_role_card_spec_desc', 'Thực hiện nghiệp vụ chuyên sâu, kiểm soát số dư điểm thưởng & đối soát.')}
          </div>
        </div>

        {/* User Card */}
        <div
          className="glass-card"
          style={{
            padding: '1.4rem',
            borderLeft: '4px solid #64748b',
            background: 'rgba(100, 116, 139, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>👤</span>
            <span className="badge badge-role-user">{t('sys_role_card_user_badge', 'Cấp 4 • Thành Viên')}</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: '#cbd5e1' }}>
            {userCount}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', marginTop: '2px' }}>
            {t('sys_role_card_user_title', 'Người Dùng (USER)')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {t('sys_role_card_user_desc', 'Thành viên thông thường nhận điểm thưởng, không có quyền quản lý hệ thống.')}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.2rem 1.6rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            className="form-input"
            placeholder={t('sys_search_placeholder', '🔍 Tìm theo email hoặc tên...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '360px' }}
          />

          <select
            className="form-input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ maxWidth: '220px' }}
          >
            <option value="ALL">{t('sys_filter_role_all', 'Tất Cả Vai Trò')} ({totalAccounts})</option>
            <option value="ADMIN">👑 {t('role_admin', 'Quản Trị Viên')} ({adminCount})</option>
            <option value="ASSISTANT">💼 {t('role_assistant', 'Trợ Lý')} ({assistantCount})</option>
            <option value="SPECIALIST">🔍 {t('role_specialist', 'Chuyên Viên')} ({specialistCount})</option>
            <option value="USER">👤 {t('role_user', 'Người Dùng')} ({userCount})</option>
          </select>
        </div>

        <button
          onClick={loadAccounts}
          className="btn-secondary"
          disabled={loadingAccounts}
          style={{ padding: '8px 16px', fontSize: '0.88rem' }}
        >
          {loadingAccounts ? '...' : '🔄 ' + t('btn_filter', 'Lọc')}
        </button>
      </div>

      {/* Accounts Table with 2 new columns: Thời Gian Cập Nhật & Thao Tác */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('sys_col_acc_email', 'Tài Khoản / Email')}</th>
              <th>{t('sys_col_role', 'Cấp Phân Quyền')}</th>
              <th>{t('sys_col_status', 'Trạng Thái')}</th>
              <th>{t('sys_col_email_verified', 'Xác Minh Email')}</th>
              <th>{t('sys_col_created_at', 'Thời Gian Tạo')}</th>
              <th>{t('sys_col_updated_at', 'Thời Gian Cập Nhật')}</th>
              <th style={{ textAlign: 'center' }}>{t('sys_col_actions', 'Thao Tác')}</th>
            </tr>
          </thead>
          <tbody>
            {loadingAccounts ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'inline-block' }} className="spinner" />
                  <div style={{ marginTop: '10px', color: 'var(--text-muted)' }}>
                    {t('sys_loading_accounts', 'Đang tải danh sách tài khoản hệ thống...')}
                  </div>
                </td>
              </tr>
            ) : filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  {t('sys_no_accounts_found', 'Không tìm thấy tài khoản nào phù hợp bộ lọc.')}
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>{account.email}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {account.username || t('sys_unnamed_user', 'Chưa đặt tên')} &bull; ID: {account.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {account.roles.length > 0 ? (
                        account.roles.map((role) => (
                          <span key={role} className={`badge badge-role-${role.toLowerCase()}`}>
                            {roleToTitle(role)}
                          </span>
                        ))
                      ) : (
                        <span className="badge badge-role-user">👤 {t('role_user', 'Người Dùng')}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {account.status === 'ACTIVE' ? (
                      <span className="badge badge-active">{t('status_active', 'Hoạt động')}</span>
                    ) : (
                      <span className="badge badge-draft" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {account.status === 'SUSPENDED' ? t('status_suspended', 'Tạm Dừng') : account.status}
                      </span>
                    )}
                  </td>
                  <td>
                    {account.email_verified_at ? (
                      <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>
                        ✓ {t('status_verified', 'Đã xác minh')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {t('status_unverified', 'Chưa xác minh')}
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatDateTime(account.created_at)}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#f5d77f', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatDateTime(account.updated_at || account.created_at)}
                  </td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {/* 1. Reset Password */}
                      <button
                        onClick={() => handleOpenResetModal(account)}
                        title={t('sys_act_reset_pwd_tip', 'Đặt lại mật khẩu và tự động gửi email')}
                        className="btn-secondary"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.78rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          background: 'rgba(56, 189, 248, 0.1)',
                          borderColor: 'rgba(56, 189, 248, 0.35)',
                          color: '#38bdf8',
                        }}
                      >
                        🔑 {t('sys_action_reset_pwd', 'Reset Pass')}
                      </button>

                      {/* 2. Dừng hoạt động / Kích hoạt */}
                      {account.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleOpenStatusModal(account)}
                          title={t('sys_act_suspend_tip', 'Tạm dừng hoạt động tài khoản (Yêu cầu ghi chú lý do)')}
                          className="btn-secondary"
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            background: 'rgba(245, 158, 11, 0.1)',
                            borderColor: 'rgba(245, 158, 11, 0.35)',
                            color: '#fbbf24',
                          }}
                        >
                          ⏸️ {t('sys_action_suspend', 'Dừng')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenStatusModal(account)}
                          title={t('sys_act_activate_tip', 'Kích hoạt lại tài khoản (Yêu cầu ghi chú lý do)')}
                          className="btn-secondary"
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            background: 'rgba(16, 185, 129, 0.12)',
                            borderColor: 'rgba(16, 185, 129, 0.4)',
                            color: '#34d399',
                          }}
                        >
                          ▶️ {t('sys_action_activate', 'Kích Hoạt')}
                        </button>
                      )}

                      {/* 3. Xóa Vĩnh Viễn */}
                      <button
                        onClick={() => handleOpenDeleteModal(account)}
                        title={t('sys_act_delete_tip', 'Xóa vĩnh viễn tài khoản & hoàn quỹ về ví TON quản trị')}
                        className="btn-secondary"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.78rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          background: 'rgba(239, 68, 68, 0.12)',
                          borderColor: 'rgba(239, 68, 68, 0.4)',
                          color: '#f87171',
                        }}
                      >
                        🗑️ {t('sys_action_delete', 'Xóa')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: RESET PASSWORD */}
      {resetModalAccount && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              borderColor: 'var(--accent-bronze)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 175, 55, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#f5d77f' }}>{t('sys_modal_reset_title', '🔑 Đặt Lại Mật Khẩu Hội Viên')}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  {t('sys_account_label', 'Tài khoản:')} <strong style={{ color: '#ffffff' }}>{resetModalAccount.email}</strong>
                </p>
              </div>
              <button
                onClick={() => setResetModalAccount(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '14px', borderRadius: '8px', marginBottom: '1.4rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                {t('sys_auto_temp_pwd_label', 'Mật Khẩu Tạm Thời Được Tạo Tự Động:')}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const rand = Math.floor(100000 + Math.random() * 900000);
                    setTempPassword(`Chip@${rand}#Pass`);
                  }}
                  className="btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  title={t('sys_btn_generate_random', 'Tạo chuỗi mật khẩu ngẫu nhiên khác')}
                >
                  {t('sys_btn_generate_random', '🎲 Tạo mới')}
                </button>
              </div>
            </div>

            <div style={{ background: 'rgba(212, 175, 55, 0.08)', borderLeft: '4px solid #d4af37', padding: '12px', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              <strong style={{ color: '#f5d77f' }}>{t('sys_auto_email_mechanism', 'Cơ chế tự động gửi email:')}</strong>
              <p style={{ margin: '4px 0 0 0' }}>
                {t('sys_reset_email_desc', 'Khi bạn xác nhận reset, hệ thống sẽ tự động gửi một email thông báo chứa thông tin mật khẩu tạm thời trên kèm nội dung nhắc nhở hội viên đăng nhập và đổi lại password khác ngay để đảm bảo bảo mật.')}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setResetModalAccount(null)}
                style={{ flex: 1 }}
                disabled={isResetting}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmResetPassword}
                disabled={isResetting || !tempPassword.trim()}
                style={{ flex: 2 }}
              >
                {isResetting ? t('sys_btn_resetting', 'Đang hạch toán & Gửi email...') : t('sys_btn_confirm_reset', '✓ Xác Nhận Reset & Gửi Email')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DỪNG HOẠT ĐỘNG / KÍCH HOẠT (BẮT BUỘC GHI CHÚ LÝ DO) */}
      {statusModalAccount && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              borderColor: statusModalAccount.status === 'ACTIVE' ? 'var(--accent-bronze)' : '#10b981',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: statusModalAccount.status === 'ACTIVE' ? '#fbbf24' : '#34d399' }}>
                  {statusModalAccount.status === 'ACTIVE' ? t('sys_modal_suspend_title', '⏸️ Tạm Dừng Hoạt Động Tài Khoản') : t('sys_modal_activate_title', '▶️ Kích Hoạt Lại Tài Khoản')}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  {t('sys_account_label', 'Tài khoản:')} <strong style={{ color: '#ffffff' }}>{statusModalAccount.email}</strong>
                </p>
              </div>
              <button
                onClick={() => setStatusModalAccount(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('sys_reason_label', 'Lý Do Thực Hiện Hành Động')} <span style={{ color: '#f43f5e' }}>* ({t('sys_required', 'Bắt buộc')})</span></span>
                <span style={{ fontSize: '0.78rem', color: statusReason.trim().length >= 5 ? '#34d399' : '#f87171' }}>
                  {statusReason.trim().length}/5 {t('sys_min_chars', 'ký tự tối thiểu')}
                </span>
              </label>
              <textarea
                className="form-input"
                rows={4}
                placeholder={t('sys_status_reason_ph', 'Ghi chú cụ thể lý do (VD: Phát hiện hoạt động bất thường / Đã xác minh hoàn tất giải trình...')}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                ℹ️ {t('sys_status_email_note', 'Hệ thống sẽ tự động gửi email thông báo chính thức đến hộp thư của hội viên kèm lý do bạn đã ghi chú ở trên.')}
              </div>
            </div>

            {/* Điều kiện bắt buộc có lý do mới hiện nút xác nhận */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStatusModalAccount(null)}
                style={{ flex: 1 }}
                disabled={isUpdatingStatus}
              >
                Hủy Bỏ
              </button>

              {statusReason.trim().length >= 5 ? (
                <button
                  type="button"
                  className={statusModalAccount.status === 'ACTIVE' ? 'nav-btn' : 'btn-primary'}
                  onClick={handleConfirmStatusChange}
                  disabled={isUpdatingStatus}
                  style={{ flex: 2, cursor: 'pointer', border: 'none' }}
                >
                  {isUpdatingStatus
                    ? t('sys_btn_processing_email', 'Đang xử lý & Gửi email...')
                    : statusModalAccount.status === 'ACTIVE'
                    ? t('sys_btn_confirm_suspend', '⏸️ Xác Nhận Tạm Dừng & Gửi Email')
                    : t('sys_btn_confirm_activate', '▶️ Xác Nhận Kích Hoạt & Gửi Email')}
                </button>
              ) : (
                <div
                  style={{
                    flex: 2,
                    textAlign: 'center',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    border: '1px dashed var(--border-medium)',
                  }}
                >
                  {t('sys_reason_min_warning', '🔒 Nhập lý do (≥ 5 ký tự) để mở nút xác nhận')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: XÓA VĨNH VIỄN TÀI KHOẢN & HOÀN QUỸ */}
      {deleteModalAccount && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              borderColor: '#ef4444',
              boxShadow: '0 24px 70px rgba(0, 0, 0, 0.9), 0 0 35px rgba(239, 68, 68, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', margin: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠️</span> {t('sys_modal_delete_title', 'Xóa Vĩnh Viễn Tài Khoản')}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  {t('sys_account_label', 'Tài khoản:')} <strong style={{ color: '#ffffff' }}>{deleteModalAccount.email}</strong>
                </p>
              </div>
              <button
                onClick={() => setDeleteModalAccount(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Quyết toán thu hồi số dư về quỹ */}
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '14px',
                borderRadius: '8px',
                marginBottom: '1.2rem',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                {t('sys_refund_title', 'HẠCH TOÁN THU HỒI TÀI SẢN KHI XÓA VĨNH VIỄN:')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{t('sys_refund_chip_label', 'Số dư CHIP hoàn về hệ thống:')}</div>
                  <div style={{ color: '#f5d77f', fontWeight: 800, fontSize: '1.1rem', marginTop: '2px' }}>
                    +{(deleteModalAccount.chipsBalance || 0).toLocaleString()} CHIP
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>&rarr; {t('sys_refund_chip_dest', 'Kho Quỹ Master CHIP')}</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{t('sys_refund_usdt_label', 'Số dư USDT hoàn về ví Quản Trị:')}</div>
                  <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '1.1rem', marginTop: '2px' }}>
                    +{(deleteModalAccount.usdtBalance || 0).toFixed(4)} USDT
                  </div>
                  <div style={{ color: '#34d399', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                    {(() => {
                      const addr = ChipStore.getActiveAdminWallet().address;
                      return `→ ${addr.slice(0, 6)}...${addr.slice(-6)}`;
                    })()}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                {(() => {
                  const currentAdminWallet = ChipStore.getActiveAdminWallet().address;
                  const meta = detectWalletNetwork(currentAdminWallet);
                  return (
                    <>
                      {meta.icon} <strong>{t('sys_refund_usdt_dest_label', 'Địa chỉ Ví Quản Trị nhận hoàn số dư USDT:')}</strong>
                      <div style={{ fontFamily: 'var(--font-mono)', color: meta.isTron ? '#fca5a5' : '#38bdf8', fontSize: '0.8rem', marginTop: '2px', wordBreak: 'break-all' }}>
                        {currentAdminWallet}{' '}
                        <a
                          href={meta.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: meta.isTron ? '#f87171' : '#38bdf8', fontWeight: 600, textDecoration: 'underline', marginLeft: '6px' }}
                        >
                          ({t('sys_view_on_explorer', 'Xem trên explorer')} ↗)
                        </a>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('sys_delete_reason_label', 'Lý Do Xóa Vĩnh Viễn')} <span style={{ color: '#f43f5e' }}>* ({t('sys_delete_reason_req', 'Bắt buộc ghi chú cụ thể')})</span></span>
                <span style={{ fontSize: '0.78rem', color: deleteReason.trim().length >= 5 ? '#34d399' : '#f87171' }}>
                  {deleteReason.trim().length}/5 {t('sys_min_chars', 'ký tự tối thiểu')}
                </span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder={t('sys_delete_reason_ph', 'Ghi chú cụ thể lý do xóa vĩnh viễn (VD: Vi phạm điều khoản gian lận hoa hồng hệ thống / Yêu cầu hủy tài khoản...')}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                ℹ️ {t('sys_delete_email_note', 'Hệ thống sẽ tự động gửi email thông báo chính thức đến hội viên về việc xóa vĩnh viễn và lý do tương ứng đã ghi chú.')}
              </div>
            </div>

            {/* Điều kiện bắt buộc có lý do mới hiện nút xác nhận */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteModalAccount(null)}
                style={{ flex: 1 }}
                disabled={isDeleting}
              >
                Hủy Bỏ
              </button>

              {deleteReason.trim().length >= 5 ? (
                <button
                  type="button"
                  onClick={handleConfirmDeleteAccount}
                  disabled={isDeleting}
                  style={{
                    flex: 2,
                    cursor: 'pointer',
                    background: '#ef4444',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  {isDeleting ? t('sys_btn_liquidating', 'Đang quyết toán & Gửi email...') : t('sys_btn_confirm_delete', '🔥 Xác Nhận Xóa Vĩnh Viễn & Hoàn Quỹ')}
                </button>
              ) : (
                <div
                  style={{
                    flex: 2,
                    textAlign: 'center',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    border: '1px dashed var(--border-medium)',
                  }}
                >
                  {t('sys_delete_min_warning', '🔒 Nhập lý do (≥ 5 ký tự) để mở nút xác nhận xóa')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TẠO TÀI KHOẢN MỚI */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              borderColor: 'var(--border-bronze)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 175, 55, 0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{t('sys_modal_create_title', 'Tạo Tài Khoản Quản Trị Mới')}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  {t('sys_modal_create_sub', 'Tài khoản hệ thống được kích hoạt ngay và gán quyền trực tiếp.')}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>
            </div>

            {createError && (
              <div className="alert-box alert-error" style={{ padding: '0.8rem 1rem' }}>
                <span>⚠️</span>
                <div>{createError}</div>
              </div>
            )}

            {createSuccess && (
              <div className="alert-box alert-success" style={{ padding: '0.8rem 1rem' }}>
                <span>✓</span>
                <div>{createSuccess}</div>
              </div>
            )}

            <form onSubmit={handleCreateAccount}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-role">
                  {t('sys_field_role', 'Cấp Phân Quyền Quản Trị')}
                </label>
                <select
                  id="new-role"
                  className="form-input"
                  value={newRole}
                  onChange={(e: any) => setNewRole(e.target.value)}
                >
                  <option value="ADMIN">{t('sys_role_admin_opt', '👑 Quản Trị Viên (ADMIN) — Toàn quyền')}</option>
                  <option value="ASSISTANT">{t('sys_role_asst_opt', '💼 Trợ Lý (ASSISTANT) — Điều hành & Giám sát')}</option>
                  <option value="SPECIALIST">{t('sys_role_spec_opt', '🔍 Chuyên Viên (SPECIALIST) — Nghiệp vụ & Đối soát')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-email">
                  {t('sys_field_email', 'Email Tài Khoản')}
                </label>
                <input
                  id="new-email"
                  type="email"
                  className="form-input"
                  placeholder="nhanvien@chiprin.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={creating}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-username">
                  {t('sys_field_name', 'Tên Hiển Thị / Bí danh (Không bắt buộc)')}
                </label>
                <input
                  id="new-username"
                  type="text"
                  className="form-input"
                  placeholder="e.g. troly_kinhdoanh"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-password">
                  {t('sys_field_init_pwd', 'Mật Khẩu Khởi Tạo (Tối thiểu 12 ký tự)')}
                </label>
                <input
                  id="new-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={creating}
                  required
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {t('sys_pwd_min_hint', 'Độ dài tối thiểu 12 ký tự theo tiêu chuẩn bảo mật hệ thống.')}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1.8rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  style={{ flex: 1 }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                  style={{ flex: 2 }}
                >
                  {creating ? t('sys_btn_creating', 'Đang tạo...') : t('sys_btn_create_acc', 'Tạo Tài Khoản Hệ Thống')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
  } catch (e) {
    return iso;
  }
}
