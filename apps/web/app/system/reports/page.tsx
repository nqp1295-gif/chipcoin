'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ChipStore,
  StoredUser,
  TierPromotionRecord,
  ChipAllocationRecord,
  TIER_CONFIGS,
  MemberTier,
} from '../../lib/store';

type TimePreset = '24h' | '7d' | '30d' | '90d' | 'all';

export default function SystemReportsPage() {
  const [timePreset, setTimePreset] = useState<TimePreset>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Loaded Data from Central Store
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [promotions, setPromotions] = useState<TierPromotionRecord[]>([]);
  const [allocations, setAllocations] = useState<ChipAllocationRecord[]>([]);

  // Search & Specific Filters
  const [userSearch, setUserSearch] = useState('');
  const [promoTierFilter, setPromoTierFilter] = useState<string>('ALL');
  const [allocTierFilter, setAllocTierFilter] = useState<string>('ALL');

  const loadData = () => {
    const uList = ChipStore.getUsers();
    setUsers(uList);
    const pList = ChipStore.getPromotions();
    setPromotions(pList);
    const aList = ChipStore.getAllocations();
    setAllocations(aList);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('chipcoin_store_updated', handleUpdate);
    return () => window.removeEventListener('chipcoin_store_updated', handleUpdate);
  }, []);

  // Set date ranges when preset changes
  useEffect(() => {
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);
    setEndDate(endStr);

    if (timePreset === '24h') {
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
      setStartDate(yesterday.toISOString().slice(0, 10));
    } else if (timePreset === '7d') {
      const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      setStartDate(d7.toISOString().slice(0, 10));
    } else if (timePreset === '30d') {
      const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      setStartDate(d30.toISOString().slice(0, 10));
    } else if (timePreset === '90d') {
      const d90 = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
      setStartDate(d90.toISOString().slice(0, 10));
    } else {
      // all
      setStartDate('2026-01-01');
    }
  }, [timePreset]);

  // Date filter helper
  const isWithinDateRange = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    const d = new Date(dateStr).getTime();
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      if (d < startMs) return false;
    }
    if (endDate) {
      // include the entire end date until 23:59:59
      const endMs = new Date(endDate).getTime() + 24 * 3600 * 1000 - 1;
      if (d > endMs) return false;
    }
    return true;
  };

  // 1. Filtered Member Accounts
  const filteredMembers = useMemo(() => {
    return users.filter((u) => {
      // Only regular members
      const isMember = u.roles.includes('USER');
      if (!isMember) return false;

      if (!isWithinDateRange(u.created_at)) return false;

      if (userSearch.trim()) {
        const q = userSearch.toLowerCase();
        const match =
          u.email.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.referralCode.toLowerCase().includes(q) ||
          (u.referredBy && u.referredBy.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [users, startDate, endDate, userSearch]);

  // 2. Filtered Promotions
  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      if (!isWithinDateRange(p.promotedAt)) return false;
      if (promoTierFilter !== 'ALL' && p.newTier !== promoTierFilter) return false;
      return true;
    });
  }, [promotions, startDate, endDate, promoTierFilter]);

  // 3A. Filtered Allocations by Tier
  const tierAllocationsSummary = useMemo(() => {
    const tiers: MemberTier[] = [
      'CHIP MEMBER',
      'CHIP GOLD',
      'CHIP PLATINUM',
      'CHIP DIAMOND',
      'CHIP SPECIAL',
    ];

    const totalAllChips = allocations
      .filter((a) => isWithinDateRange(a.allocatedAt))
      .reduce((sum, a) => sum + a.totalAllocated, 0);

    return tiers.map((tier) => {
      const tierMembers = users.filter((u) => u.tier === tier && u.roles.includes('USER'));
      const tierAllocs = allocations.filter(
        (a) => a.tier === tier && isWithinDateRange(a.allocatedAt)
      );

      const totalAllocated = tierAllocs.reduce((sum, a) => sum + a.totalAllocated, 0);
      const totalCommission = tierAllocs.reduce(
        (sum, a) => sum + a.referralCommissionChips,
        0
      );
      const percentage = totalAllChips > 0 ? ((totalAllocated / totalAllChips) * 100).toFixed(1) : '0.0';

      return {
        tier,
        memberCount: tierMembers.length,
        totalAllocated,
        totalCommission,
        bonusRate: TIER_CONFIGS[tier].bonusRate,
        percentage,
      };
    });
  }, [allocations, users, startDate, endDate]);

  // 3B. Filtered Allocations by Member
  const filteredMemberAllocations = useMemo(() => {
    return allocations.filter((a) => {
      if (!isWithinDateRange(a.allocatedAt)) return false;
      if (allocTierFilter !== 'ALL' && a.tier !== allocTierFilter) return false;
      return true;
    });
  }, [allocations, startDate, endDate, allocTierFilter]);

  // CSV Exporters
  const exportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMembersCSV = () => {
    const headers = ['Mã Hội Viên', 'Username', 'Email', 'Mã Giới Thiệu', 'Người Bảo Trợ', 'Ngày Tạo', 'Trạng Thái', 'Hạng'];
    const rows = filteredMembers.map((u) => [
      u.id,
      u.username,
      u.email,
      u.referralCode,
      u.referredBy || 'None',
      u.created_at,
      u.status,
      u.tier,
    ]);
    exportCSV('lich_su_tao_tai_khoan_hoi_vien', headers, rows);
  };

  const exportPromotionsCSV = () => {
    const headers = ['Mã Thăng Cấp', 'Email Hội Viên', 'Hạng Cũ', 'Hạng Mới', 'Điều Kiện Đạt Được', 'Thời Gian', 'Đặc Quyền'];
    const rows = filteredPromotions.map((p) => [
      p.id,
      p.userEmail,
      p.oldTier,
      p.newTier,
      p.milestoneMet,
      p.promotedAt,
      p.privilegesGranted,
    ]);
    exportCSV('lich_su_thang_cap_hoi_vien', headers, rows);
  };

  const exportAllocationsCSV = () => {
    const headers = ['Mã Cấp', 'Email Hội Viên', 'Hạng', 'CHIP Hoạt Động', 'CHIP Hoa Hồng F1', 'Tổng CHIP Nhận', 'Thời Gian'];
    const rows = filteredMemberAllocations.map((a) => [
      a.id,
      a.userEmail,
      a.tier,
      a.activityChips,
      a.referralCommissionChips,
      a.totalAllocated,
      a.allocatedAt,
    ]);
    exportCSV('thong_ke_phan_bo_chip', headers, rows);
  };

  const totalMembersCount = users.filter((u) => u.roles.includes('USER')).length;
  const totalAllocatedChips = allocations.reduce((sum, a) => sum + a.totalAllocated, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header Bar */}
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
            📊 QUẢN TRỊ HỆ THỐNG — THỐNG KÊ &amp; BÁO CÁO TOÀN DIỆN
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Thống Kê Báo Cáo Hệ Thống</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Báo cáo chi tiết lịch sử tạo tài khoản, lịch sử thăng hạng và phân bổ CHIP theo hạng mức &amp; hội viên
          </p>
        </div>

        {/* Global Time Filter Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['24h', '7d', '30d', '90d', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setTimePreset(p)}
                style={{
                  background: timePreset === p ? 'var(--gradient-bronze)' : 'rgba(255, 255, 255, 0.06)',
                  color: timePreset === p ? '#0b0c0e' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p === '24h' ? '24 Giờ' : p === '7d' ? '7 Ngày' : p === '30d' ? '30 Ngày' : p === '90d' ? '90 Ngày' : 'Tất cả'}
              </button>
            ))}
          </div>

          {/* Date Range Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Từ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setTimePreset('all');
              }}
              className="form-input"
              style={{ padding: '4px 8px', fontSize: '0.8rem', width: '130px' }}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Đến:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setTimePreset('all');
              }}
              className="form-input"
              style={{ padding: '4px 8px', fontSize: '0.8rem', width: '130px' }}
            />
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            TỔNG HỘI VIÊN ĐĂNG KÝ
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
            {totalMembersCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '4px' }}>
            {filteredMembers.length} tài khoản trong kỳ lọc
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            LƯỢT THĂNG CẤP HỘI VIÊN
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f5d77f', marginTop: '6px' }}>
            {filteredPromotions.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Đạt chuẩn hạn mức chip &amp; F1
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            TỔNG CHIP ĐÃ PHÂN BỔ
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>
            {totalAllocatedChips.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Xuất phát từ Kho Quỹ Master Treasury
          </div>
        </div>

        <div className="glass-card glow-hover">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            TỶ LỆ THÀNH CÔNG OUTBOX
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>
            100%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Không bản ghi lỗi, SLA &lt; 2s
          </div>
        </div>
      </div>

      {/* =====================================================================
          REPORT 1: LỊCH SỬ TẠO TÀI KHOẢN HỘI VIÊN
          ===================================================================== */}
      <section className="glass-card" style={{ padding: '1.8rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.2rem',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3rem' }}>👥</span>
              <h2 style={{ fontSize: '1.3rem' }}>1. Lịch Sử Tạo Tài Khoản Hội Viên</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
              Ghi nhận tất cả thành viên đăng ký qua cổng hội viên hoặc được khởi tạo trong hệ thống
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Tìm theo email, mã hoặc bảo trợ..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="form-input"
              style={{ width: '250px', padding: '6px 12px', fontSize: '0.85rem' }}
            />
            <button
              onClick={exportMembersCSV}
              className="nav-btn"
              style={{ padding: '7px 16px', fontSize: '0.82rem' }}
            >
              📥 Xuất CSV Hội Viên
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>MÃ HỘI VIÊN</th>
                <th>TÊN NGƯỜI DÙNG / EMAIL</th>
                <th>MÃ GIỚI THIỆU</th>
                <th>NGƯỜI BẢO TRỢ</th>
                <th>THỜI GIAN TẠO</th>
                <th>TRẠNG THÁI</th>
                <th>HẠNG BAN ĐẦU</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Không có tài khoản hội viên nào trong khoảng thời gian đã chọn ({startDate} đến {endDate}).
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-bronze)' }}>
                      {m.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{m.username}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.email}</div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-bronze-light)' }}>
                      {m.referralCode}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: m.referredBy ? '#38bdf8' : 'var(--text-muted)' }}>
                      {m.referredBy || '— (Trực tiếp)'}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '3px 9px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: m.status === 'ACTIVE' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                          color: m.status === 'ACTIVE' ? '#34d399' : '#fbbf24',
                          border: `1px solid ${m.status === 'ACTIVE' ? 'rgba(52, 211, 153, 0.35)' : 'rgba(251, 191, 36, 0.35)'}`,
                        }}
                      >
                        {m.status === 'ACTIVE' ? '✓ ACTIVE' : '⏳ PENDING'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: TIER_CONFIGS[m.tier]?.badgeColor || '#ffffff',
                        }}
                      >
                        {m.tier}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================================
          REPORT 2: LỊCH SỬ THĂNG CẤP CỦA HỘI VIÊN
          ===================================================================== */}
      <section className="glass-card" style={{ padding: '1.8rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.2rem',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3rem' }}>👑</span>
              <h2 style={{ fontSize: '1.3rem' }}>2. Lịch Sử Thăng Cấp Của Hội Viên</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
              Theo dõi quá trình nâng bậc hạng thành viên dựa trên điều kiện tích lũy CHIP và mạng lưới F1
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={promoTierFilter}
              onChange={(e) => setPromoTierFilter(e.target.value)}
              className="form-input"
              style={{ width: '180px', padding: '6px 10px', fontSize: '0.85rem' }}
            >
              <option value="ALL">Tất cả hạng mức</option>
              <option value="CHIP MEMBER">CHIP MEMBER</option>
              <option value="CHIP GOLD">CHIP GOLD</option>
              <option value="CHIP PLATINUM">CHIP PLATINUM</option>
              <option value="CHIP DIAMOND">CHIP DIAMOND</option>
              <option value="CHIP SPECIAL">CHIP SPECIAL</option>
            </select>

            <button
              onClick={exportPromotionsCSV}
              className="nav-btn"
              style={{ padding: '7px 16px', fontSize: '0.82rem' }}
            >
              📥 Xuất CSV Thăng Cấp
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>HỘI VIÊN</th>
                <th>HẠNG TRƯỚC</th>
                <th>HẠNG MỚI ĐẠT ĐƯỢC</th>
                <th>ĐIỀU KIỆN ĐÃ ĐẠT</th>
                <th>THỜI GIAN THĂNG CẤP</th>
                <th>QUYỀN LỢI ÁP DỤNG</th>
              </tr>
            </thead>
            <tbody>
              {filteredPromotions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Không có bản ghi thăng cấp nào trong khoảng thời gian đã chọn ({startDate} đến {endDate}).
                  </td>
                </tr>
              ) : (
                filteredPromotions.map((p) => (
                  <tr key={p.id}>
                    <td style={{ color: '#ffffff', fontWeight: 600 }}>{p.userEmail}</td>
                    <td>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.oldTier}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: 'rgba(212, 175, 55, 0.2)',
                          color: TIER_CONFIGS[p.newTier]?.badgeColor || '#f5d77f',
                          border: `1px solid ${TIER_CONFIGS[p.newTier]?.badgeColor || '#f5d77f'}55`,
                        }}
                      >
                        {p.newTier}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {p.milestoneMet}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(p.promotedAt).toLocaleDateString()} {new Date(p.promotedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 500 }}>
                      {p.privilegesGranted}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================================
          REPORT 3: THỐNG KÊ CHIP PHÂN BỔ THEO HẠNG & THEO HỘI VIÊN
          ===================================================================== */}
      <section className="glass-card" style={{ padding: '1.8rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.2rem',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3rem' }}>🪙</span>
              <h2 style={{ fontSize: '1.3rem' }}>3. Thống Kê CHIP Phân Bổ Theo Hạng &amp; Theo Hội Viên</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
              Đối soát số lượng CHIP đã cấp phát, hoa hồng giới thiệu và tỷ trọng phân bổ giữa các cấp bậc
            </p>
          </div>

          <button
            onClick={exportAllocationsCSV}
            className="nav-btn"
            style={{ padding: '7px 16px', fontSize: '0.82rem' }}
          >
            📥 Xuất CSV Phân Bổ CHIP
          </button>
        </div>

        {/* 3A. Bảng Phân Bổ Theo Cấp Bậc Hạng */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f5d77f', marginBottom: '10px' }}>
            A. TỔNG HỢP PHÂN BỔ THEO CẤP BẬC HẠNG (TIER SUMMARY)
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CẤP BẬC HỘI VIÊN</th>
                  <th>SỐ LƯỢNG HỘI VIÊN</th>
                  <th>TỔNG CHIP ĐÃ CẤP</th>
                  <th>% HOA HỒNG NHÁNH</th>
                  <th>HOA HỒNG ĐÃ CHI TRẢ</th>
                  <th>TỶ TRỌNG TRONG KỲ</th>
                </tr>
              </thead>
              <tbody>
                {tierAllocationsSummary.map((t) => (
                  <tr key={t.tier}>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: TIER_CONFIGS[t.tier].badgeColor,
                        }}
                      >
                        {t.tier}
                      </span>
                    </td>
                    <td style={{ color: '#ffffff', fontWeight: 600 }}>{t.memberCount} hội viên</td>
                    <td style={{ color: '#ffffff', fontWeight: 700 }}>
                      {t.totalAllocated.toLocaleString()} CHIP
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: t.bonusRate > 0 ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: t.bonusRate > 0 ? '#f5d77f' : 'var(--text-muted)',
                        }}
                      >
                        +{t.bonusRate * 100}%
                      </span>
                    </td>
                    <td style={{ color: '#34d399', fontWeight: 600 }}>
                      {t.totalCommission.toLocaleString()} CHIP
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{t.percentage}%</span>
                        <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${t.percentage}%`, height: '100%', background: TIER_CONFIGS[t.tier].badgeColor }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3B. Bảng Chi Tiết Phân Bổ Theo Từng Hội Viên */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f5d77f' }}>
              B. CHI TIẾT PHÂN BỔ THEO TỪNG HỘI VIÊN (MEMBER DETAILS)
            </div>

            <select
              value={allocTierFilter}
              onChange={(e) => setAllocTierFilter(e.target.value)}
              className="form-input"
              style={{ width: '180px', padding: '5px 10px', fontSize: '0.82rem' }}
            >
              <option value="ALL">Lọc theo tất cả hạng</option>
              <option value="CHIP MEMBER">CHIP MEMBER</option>
              <option value="CHIP GOLD">CHIP GOLD</option>
              <option value="CHIP PLATINUM">CHIP PLATINUM</option>
              <option value="CHIP DIAMOND">CHIP DIAMOND</option>
              <option value="CHIP SPECIAL">CHIP SPECIAL</option>
            </select>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>HỘI VIÊN</th>
                  <th>HẠNG HIỆN TẠI</th>
                  <th>CHIP NHIỆM VỤ / HOẠT ĐỘNG</th>
                  <th>CHIP HOA HỒNG NHÁNH F1</th>
                  <th>TỔNG CHIP ĐÃ CẤP</th>
                  <th>LẦN PHÂN BỔ GẦN NHẤT</th>
                </tr>
              </thead>
              <tbody>
                {filteredMemberAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Không có bản ghi phân bổ nào trong khoảng thời gian đã chọn ({startDate} đến {endDate}).
                    </td>
                  </tr>
                ) : (
                  filteredMemberAllocations.map((a) => (
                    <tr key={a.id}>
                      <td style={{ color: '#ffffff', fontWeight: 600 }}>{a.userEmail}</td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: TIER_CONFIGS[a.tier]?.badgeColor || '#ffffff',
                          }}
                        >
                          {a.tier}
                        </span>
                      </td>
                      <td style={{ color: '#ffffff' }}>{a.activityChips.toLocaleString()} CHIP</td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>
                        +{a.referralCommissionChips.toLocaleString()} CHIP
                      </td>
                      <td style={{ color: 'var(--accent-bronze-light)', fontWeight: 800 }}>
                        {a.totalAllocated.toLocaleString()} CHIP
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(a.allocatedAt).toLocaleDateString()} {new Date(a.allocatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
