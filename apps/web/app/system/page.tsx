'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import { ChipStore } from '../lib/store';

interface AccountItem {
  id: string;
  username: string;
  email: string;
  status: string;
  email_verified_at: string | null;
  created_at: string;
  roles: string[];
}

export default function SystemDashboardPage() {
  const router = useRouter();

  // Current session
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Accounts list
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal create account
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'ASSISTANT' | 'SPECIALIST'>('ASSISTANT');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

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

    let apiList: AccountItem[] = [];

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
            status: u.status,
            email_verified_at: u.email_verified_at,
            created_at: u.created_at,
            roles: u.roles,
          });
        });

        // 2. Add or overwrite with API results
        apiList.forEach((a) => {
          mergedMap.set(a.email.toLowerCase(), a);
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

      // Reload accounts list
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
            🛡️ BẢNG ĐIỀU HÀNH NỘI BỘ
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Quản Trị Hệ Thống Accounts</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Phân quyền 4 cấp độ:{' '}
            <strong style={{ color: '#f5d77f' }}>Quản Trị Viên</strong> &bull;{' '}
            <strong style={{ color: '#a5b4fc' }}>Trợ Lý</strong> &bull;{' '}
            <strong style={{ color: '#7dd3fc' }}>Chuyên Viên</strong> &bull;{' '}
            <strong style={{ color: '#cbd5e1' }}>Người Dùng</strong>
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
            + Tạo Tài Khoản Mới
          </button>

          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Unauthorized warning if fetch failed with 401 */}
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
            <span className="badge badge-role-admin">Cấp 1 &bull; Tối Cao</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: '#f5d77f' }}>
            {adminCount}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', marginTop: '2px' }}>
            Quản Trị Viên (ADMIN)
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Toàn quyền hệ thống: quản lý tài khoản, tạo &amp; phân quyền, cấu hình outbox.
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
            <span className="badge badge-role-assistant">Cấp 2 &bull; Điều Hành</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: '#a5b4fc' }}>
            {assistantCount}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', marginTop: '2px' }}>
            Trợ Lý (ASSISTANT)
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Hỗ trợ ban quản trị, giám sát trạng thái tài khoản &amp; phê duyệt quy trình.
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
            <span className="badge badge-role-specialist">Cấp 3 &bull; Nghiệp Vụ</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: '#7dd3fc' }}>
            {specialistCount}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', marginTop: '2px' }}>
            Chuyên Viên (SPECIALIST)
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Thực hiện nghiệp vụ chuyên sâu, kiểm soát số dư điểm thưởng &amp; đối soát.
          </div>
        </div>

        {/* User Card */}
        <div
          className="glass-card"
          style={{
            padding: '1.4rem',
            borderLeft: '4px solid #94a3b8',
            background: 'rgba(148, 163, 184, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>👤</span>
            <span className="badge badge-role-user">Cấp 4 &bull; Thành Viên</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: '#cbd5e1' }}>
            {userCount}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', marginTop: '2px' }}>
            Người Dùng (USER)
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Thành viên thông thường nhận điểm thưởng, không có quyền quản lý hệ thống.
          </div>
        </div>
      </div>

      {/* Filter and Toolbar */}
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
            placeholder="🔍 Tìm theo email hoặc tên..."
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
            <option value="ALL">Tất cả phân quyền ({totalAccounts})</option>
            <option value="ADMIN">👑 Quản Trị Viên ({adminCount})</option>
            <option value="ASSISTANT">💼 Trợ Lý ({assistantCount})</option>
            <option value="SPECIALIST">🔍 Chuyên Viên ({specialistCount})</option>
            <option value="USER">👤 Người Dùng ({userCount})</option>
          </select>
        </div>

        <button
          onClick={loadAccounts}
          className="btn-secondary"
          disabled={loadingAccounts}
          style={{ padding: '8px 16px', fontSize: '0.88rem' }}
        >
          {loadingAccounts ? 'Đang làm mới...' : '🔄 Làm mới'}
        </button>
      </div>

      {/* Accounts Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tài Khoản / Email</th>
              <th>Cấp Phân Quyền</th>
              <th>Trạng Thái</th>
              <th>Xác Minh Email</th>
              <th>Thời Gian Tạo</th>
            </tr>
          </thead>
          <tbody>
            {loadingAccounts ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'inline-block' }} className="spinner" />
                  <div style={{ marginTop: '10px', color: 'var(--text-muted)' }}>
                    Đang tải danh sách tài khoản hệ thống...
                  </div>
                </td>
              </tr>
            ) : filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Không tìm thấy tài khoản nào phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>{account.email}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {account.username || 'Chưa đặt tên'} &bull; ID: {account.id.substring(0, 8)}...
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
                        <span className="badge badge-role-user">👤 Người Dùng</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {account.status === 'ACTIVE' ? (
                      <span className="badge badge-active">Hoạt động</span>
                    ) : (
                      <span className="badge badge-draft">{account.status}</span>
                    )}
                  </td>
                  <td>
                    {account.email_verified_at ? (
                      <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>
                        ✓ Đã xác minh
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Chưa xác minh
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {formatDate(account.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Tạo tài khoản quản trị mới */}
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
                <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Tạo Tài Khoản Quản Trị Mới</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Tài khoản hệ thống được kích hoạt ngay và gán quyền trực tiếp.
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
                  Cấp Phân Quyền Quản Trị
                </label>
                <select
                  id="new-role"
                  className="form-input"
                  value={newRole}
                  onChange={(e: any) => setNewRole(e.target.value)}
                >
                  <option value="ADMIN">👑 Quản Trị Viên (ADMIN) — Toàn quyền</option>
                  <option value="ASSISTANT">💼 Trợ Lý (ASSISTANT) — Điều hành &amp; Giám sát</option>
                  <option value="SPECIALIST">🔍 Chuyên Viên (SPECIALIST) — Nghiệp vụ &amp; Đối soát</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-email">
                  Email Tài Khoản
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
                  Tên Hiển Thị / Bí danh (Không bắt buộc)
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
                  Mật Khẩu Khởi Tạo (Tối thiểu 12 ký tự)
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
                  Độ dài tối thiểu 12 ký tự theo tiêu chuẩn bảo mật hệ thống.
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
                  {creating ? 'Đang tạo...' : 'Tạo Tài Khoản Hệ Thống'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function roleToTitle(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '👑 Quản Trị Viên';
    case 'ASSISTANT':
      return '💼 Trợ Lý';
    case 'SPECIALIST':
      return '🔍 Chuyên Viên';
    case 'USER':
      return '👤 Người Dùng';
    case 'OWNER':
      return '👑 Sở Hữu';
    default:
      return role;
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return iso;
  }
}
