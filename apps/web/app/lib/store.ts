'use client';

// ============================================================================
// CHIPCOIN CENTRALIZED DATA STORE & SYNCHRONIZATION ENGINE
// Bridges Member Portal & System Admin Portal in real time
// ============================================================================

export type MemberTier =
  | 'CHIP MEMBER'
  | 'CHIP GOLD'
  | 'CHIP PLATINUM'
  | 'CHIP DIAMOND'
  | 'CHIP SPECIAL';

export interface TierConfig {
  tier: MemberTier;
  name: string;
  minChips: number;
  minVerifiedReferrals: number;
  bonusRate: number; // e.g. 0.03 for 3%
  canTransferAndWithdraw: boolean;
  extendedPrivileges: boolean;
  badgeColor: string;
  gradient: string;
  description: string;
}

export const TIER_CONFIGS: Record<MemberTier, TierConfig> = {
  'CHIP MEMBER': {
    tier: 'CHIP MEMBER',
    name: 'CHIP MEMBER',
    minChips: 0,
    minVerifiedReferrals: 0,
    bonusRate: 0,
    canTransferAndWithdraw: false,
    extendedPrivileges: false,
    badgeColor: '#94a3b8',
    gradient: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
    description: 'Đã đăng ký tài khoản xác thực email (không có thưởng thêm)',
  },
  'CHIP GOLD': {
    tier: 'CHIP GOLD',
    name: 'CHIP GOLD',
    minChips: 100000,
    minVerifiedReferrals: 3,
    bonusRate: 0.03,
    canTransferAndWithdraw: false,
    extendedPrivileges: false,
    badgeColor: '#f59e0b',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
    description: 'Thu thập > 100k chip + Giới thiệu 3 người xác thực email (Thưởng 3% chip)',
  },
  'CHIP PLATINUM': {
    tier: 'CHIP PLATINUM',
    name: 'CHIP PLATINUM',
    minChips: 500000,
    minVerifiedReferrals: 10,
    bonusRate: 0.05,
    canTransferAndWithdraw: true,
    extendedPrivileges: false,
    badgeColor: '#38bdf8',
    gradient: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 100%)',
    description: 'Thu thập > 500k chip + Giới thiệu 10 người xác thực email (Thưởng 5%, mở gửi/nhận & rút chip)',
  },
  'CHIP DIAMOND': {
    tier: 'CHIP DIAMOND',
    name: 'CHIP DIAMOND',
    minChips: 1000000,
    minVerifiedReferrals: 30,
    bonusRate: 0.10,
    canTransferAndWithdraw: true,
    extendedPrivileges: true,
    badgeColor: '#a855f7',
    gradient: 'linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)',
    description: 'Thu thập > 1m chip + Giới thiệu 30 người xác thực email (Thưởng 10%, mở rút & đặc quyền hệ thống)',
  },
  'CHIP SPECIAL': {
    tier: 'CHIP SPECIAL',
    name: 'CHIP SPECIAL',
    minChips: 2000000,
    minVerifiedReferrals: 50,
    bonusRate: 0.20,
    canTransferAndWithdraw: true,
    extendedPrivileges: true,
    badgeColor: '#f43f5e',
    gradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
    description: 'Thu thập > 2m chip + Giới thiệu 50 người xác thực email (Thưởng 20%, đặc quyền VIP tối cao)',
  },
};

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  email_verified_at: string | null;
  created_at: string;
  tier: MemberTier;
  referralCode: string;
  referredBy?: string; // Referral code of inviter
  chipsBalance: number;
  streakDays: number;
  lastClaimDate?: string;
}

export interface StoredReferralLink {
  id: string;
  referrerCode: string;
  referredUserId: string;
  referredEmail: string;
  registeredAt: string;
  isEmailVerified: boolean;
  refereeChipsEarned: number;
  commissionPaidToReferrer: number;
}

export interface TierPromotionRecord {
  id: string;
  userId: string;
  userEmail: string;
  oldTier: MemberTier;
  newTier: MemberTier;
  milestoneMet: string;
  promotedAt: string;
  privilegesGranted: string;
}

export interface ChipAllocationRecord {
  id: string;
  userId: string;
  userEmail: string;
  tier: MemberTier;
  activityChips: number;
  referralCommissionChips: number;
  totalAllocated: number;
  allocatedAt: string;
}

// Initial Seed Data for immediate testing & demo
const SEED_USERS: StoredUser[] = [
  {
    id: 'usr-admin-001',
    username: 'admin_master',
    email: 'admin@chiprin.com',
    roles: ['ADMIN'],
    status: 'ACTIVE',
    email_verified_at: '2026-09-01T08:00:00Z',
    created_at: '2026-09-01T08:00:00Z',
    tier: 'CHIP SPECIAL',
    referralCode: 'CHIP-ADMIN-01',
    chipsBalance: 500000000,
    streakDays: 45,
  },
  {
    id: 'usr-asst-002',
    username: 'assistant_ops',
    email: 'assistant@chiprin.com',
    roles: ['ASSISTANT'],
    status: 'ACTIVE',
    email_verified_at: '2026-09-05T09:30:00Z',
    created_at: '2026-09-05T09:30:00Z',
    tier: 'CHIP DIAMOND',
    referralCode: 'CHIP-ASST-02',
    chipsBalance: 1500000,
    streakDays: 28,
  },
  {
    id: 'usr-spec-003',
    username: 'specialist_sec',
    email: 'specialist@chiprin.com',
    roles: ['SPECIALIST'],
    status: 'ACTIVE',
    email_verified_at: '2026-09-10T10:15:00Z',
    created_at: '2026-09-10T10:15:00Z',
    tier: 'CHIP PLATINUM',
    referralCode: 'CHIP-SPEC-03',
    chipsBalance: 850000,
    streakDays: 19,
  },
  {
    id: 'usr-mem-001',
    username: 'alex_investor',
    email: 'alex.investor@example.com',
    roles: ['USER'],
    status: 'ACTIVE',
    email_verified_at: '2026-10-01T14:20:00Z',
    created_at: '2026-10-01T14:15:00Z',
    tier: 'CHIP SPECIAL',
    referralCode: 'CHIP-ALEX-99',
    chipsBalance: 2450000,
    streakDays: 22,
  },
  {
    id: 'usr-mem-002',
    username: 'sophia_crypto',
    email: 'sophia.chain@example.com',
    roles: ['USER'],
    status: 'ACTIVE',
    email_verified_at: '2026-10-05T11:00:00Z',
    created_at: '2026-10-05T10:50:00Z',
    tier: 'CHIP DIAMOND',
    referralCode: 'CHIP-SOPH-77',
    referredBy: 'CHIP-ALEX-99',
    chipsBalance: 1250000,
    streakDays: 14,
  },
  {
    id: 'usr-mem-003',
    username: 'david_tran',
    email: 'david.tran@example.com',
    roles: ['USER'],
    status: 'ACTIVE',
    email_verified_at: '2026-10-12T16:45:00Z',
    created_at: '2026-10-12T16:30:00Z',
    tier: 'CHIP PLATINUM',
    referralCode: 'CHIP-DAVI-55',
    referredBy: 'CHIP-SOPH-77',
    chipsBalance: 680000,
    streakDays: 9,
  },
  {
    id: 'usr-mem-004',
    username: 'minh_hoang',
    email: 'minh.hoang@example.com',
    roles: ['USER'],
    status: 'ACTIVE',
    email_verified_at: '2026-10-18T08:10:00Z',
    created_at: '2026-10-18T08:00:00Z',
    tier: 'CHIP GOLD',
    referralCode: 'CHIP-MINH-33',
    referredBy: 'CHIP-DAVI-55',
    chipsBalance: 220000,
    streakDays: 5,
  },
  {
    id: 'usr-mem-005',
    username: 'emma_watson',
    email: 'emma.newbie@example.com',
    roles: ['USER'],
    status: 'ACTIVE',
    email_verified_at: '2026-10-24T15:20:00Z',
    created_at: '2026-10-24T15:10:00Z',
    tier: 'CHIP MEMBER',
    referralCode: 'CHIP-EMMA-11',
    referredBy: 'CHIP-MINH-33',
    chipsBalance: 45000,
    streakDays: 2,
  },
  {
    id: 'usr-mem-006',
    username: 'lucas_pending',
    email: 'lucas.pending@example.com',
    roles: ['USER'],
    status: 'PENDING',
    email_verified_at: null,
    created_at: '2026-10-26T18:05:00Z',
    tier: 'CHIP MEMBER',
    referralCode: 'CHIP-LUCA-09',
    referredBy: 'CHIP-MINH-33',
    chipsBalance: 5000,
    streakDays: 0,
  },
];

const SEED_REFERRAL_LINKS: StoredReferralLink[] = [
  {
    id: 'ref-001',
    referrerCode: 'CHIP-ALEX-99',
    referredUserId: 'usr-mem-002',
    referredEmail: 'sophia.chain@example.com',
    registeredAt: '2026-10-05T10:50:00Z',
    isEmailVerified: true,
    refereeChipsEarned: 1250000,
    commissionPaidToReferrer: 250000, // 20% tier
  },
  {
    id: 'ref-002',
    referrerCode: 'CHIP-SOPH-77',
    referredUserId: 'usr-mem-003',
    referredEmail: 'david.tran@example.com',
    registeredAt: '2026-10-12T16:30:00Z',
    isEmailVerified: true,
    refereeChipsEarned: 680000,
    commissionPaidToReferrer: 68000, // 10% tier
  },
  {
    id: 'ref-003',
    referrerCode: 'CHIP-DAVI-55',
    referredUserId: 'usr-mem-004',
    referredEmail: 'minh.hoang@example.com',
    registeredAt: '2026-10-18T08:00:00Z',
    isEmailVerified: true,
    refereeChipsEarned: 220000,
    commissionPaidToReferrer: 11000, // 5% tier
  },
  {
    id: 'ref-004',
    referrerCode: 'CHIP-MINH-33',
    referredUserId: 'usr-mem-005',
    referredEmail: 'emma.newbie@example.com',
    registeredAt: '2026-10-24T15:10:00Z',
    isEmailVerified: true,
    refereeChipsEarned: 45000,
    commissionPaidToReferrer: 1350, // 3% tier
  },
  {
    id: 'ref-005',
    referrerCode: 'CHIP-MINH-33',
    referredUserId: 'usr-mem-006',
    referredEmail: 'lucas.pending@example.com',
    registeredAt: '2026-10-26T18:05:00Z',
    isEmailVerified: false,
    refereeChipsEarned: 5000,
    commissionPaidToReferrer: 0,
  },
];

const SEED_PROMOTIONS: TierPromotionRecord[] = [
  {
    id: 'prm-001',
    userId: 'usr-mem-001',
    userEmail: 'alex.investor@example.com',
    oldTier: 'CHIP DIAMOND',
    newTier: 'CHIP SPECIAL',
    milestoneMet: 'Thu thập > 2,000,000 CHIP + 52 F1 xác thực email',
    promotedAt: '2026-10-22T09:15:00Z',
    privilegesGranted: 'Thưởng 20% hoa hồng nhánh, quyền rút chip & đặc quyền hệ thống tối đa',
  },
  {
    id: 'prm-002',
    userId: 'usr-mem-002',
    userEmail: 'sophia.chain@example.com',
    oldTier: 'CHIP PLATINUM',
    newTier: 'CHIP DIAMOND',
    milestoneMet: 'Thu thập > 1,000,000 CHIP + 34 F1 xác thực email',
    promotedAt: '2026-10-20T14:30:00Z',
    privilegesGranted: 'Thưởng 10% hoa hồng nhánh, quyền rút chip & đặc quyền mở rộng',
  },
  {
    id: 'prm-003',
    userId: 'usr-mem-003',
    userEmail: 'david.tran@example.com',
    oldTier: 'CHIP GOLD',
    newTier: 'CHIP PLATINUM',
    milestoneMet: 'Thu thập > 500,000 CHIP + 12 F1 xác thực email',
    promotedAt: '2026-10-19T11:00:00Z',
    privilegesGranted: 'Thưởng 5% hoa hồng nhánh, quyền gửi/nhận & rút chip',
  },
  {
    id: 'prm-004',
    userId: 'usr-mem-004',
    userEmail: 'minh.hoang@example.com',
    oldTier: 'CHIP MEMBER',
    newTier: 'CHIP GOLD',
    milestoneMet: 'Thu thập > 100,000 CHIP + 3 F1 xác thực email',
    promotedAt: '2026-10-25T16:20:00Z',
    privilegesGranted: 'Thưởng 3% hoa hồng nhánh từ người được giới thiệu',
  },
];

const SEED_ALLOCATIONS: ChipAllocationRecord[] = [
  {
    id: 'alc-001',
    userId: 'usr-mem-001',
    userEmail: 'alex.investor@example.com',
    tier: 'CHIP SPECIAL',
    activityChips: 1800000,
    referralCommissionChips: 650000,
    totalAllocated: 2450000,
    allocatedAt: '2026-10-26T20:10:00Z',
  },
  {
    id: 'alc-002',
    userId: 'usr-mem-002',
    userEmail: 'sophia.chain@example.com',
    tier: 'CHIP DIAMOND',
    activityChips: 950000,
    referralCommissionChips: 300000,
    totalAllocated: 1250000,
    allocatedAt: '2026-10-26T18:45:00Z',
  },
  {
    id: 'alc-003',
    userId: 'usr-mem-003',
    userEmail: 'david.tran@example.com',
    tier: 'CHIP PLATINUM',
    activityChips: 520000,
    referralCommissionChips: 160000,
    totalAllocated: 680000,
    allocatedAt: '2026-10-26T15:30:00Z',
  },
  {
    id: 'alc-004',
    userId: 'usr-mem-004',
    userEmail: 'minh.hoang@example.com',
    tier: 'CHIP GOLD',
    activityChips: 185000,
    referralCommissionChips: 35000,
    totalAllocated: 220000,
    allocatedAt: '2026-10-25T12:00:00Z',
  },
  {
    id: 'alc-005',
    userId: 'usr-mem-005',
    userEmail: 'emma.newbie@example.com',
    tier: 'CHIP MEMBER',
    activityChips: 45000,
    referralCommissionChips: 0,
    totalAllocated: 45000,
    allocatedAt: '2026-10-24T19:25:00Z',
  },
];

const STORAGE_KEYS = {
  USERS: 'chipcoin_synced_users_v2',
  REFERRALS: 'chipcoin_synced_referrals_v2',
  PROMOTIONS: 'chipcoin_synced_promotions_v2',
  ALLOCATIONS: 'chipcoin_synced_allocations_v2',
  USER_SESSION: 'chipcoin_user_session',
  SYSTEM_SESSION: 'chipcoin_system_session',
};

// Safe LocalStorage helpers
function safeGet<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('chipcoin_store_updated'));
  } catch (e) {}
}

export function calculateTier(chips: number, verifiedReferrals: number): MemberTier {
  if (chips >= 2000000 && verifiedReferrals >= 50) return 'CHIP SPECIAL';
  if (chips >= 1000000 && verifiedReferrals >= 30) return 'CHIP DIAMOND';
  if (chips >= 500000 && verifiedReferrals >= 10) return 'CHIP PLATINUM';
  if (chips >= 100000 && verifiedReferrals >= 3) return 'CHIP GOLD';
  return 'CHIP MEMBER';
}

export const ChipStore = {
  // 1. Get all Users
  getUsers(): StoredUser[] {
    return safeGet<StoredUser[]>(STORAGE_KEYS.USERS, SEED_USERS);
  },

  getUserById(id: string): StoredUser | undefined {
    const users = this.getUsers();
    return users.find((u) => u.id === id);
  },

  getUserByEmail(email: string): StoredUser | undefined {
    const users = this.getUsers();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  getUserByReferralCode(code: string): StoredUser | undefined {
    const users = this.getUsers();
    return users.find((u) => u.referralCode.toUpperCase() === code.toUpperCase());
  },

  // 2. Add or Register a new user
  registerUser(
    username: string,
    email: string,
    referredByCode?: string
  ): StoredUser {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) return existing;

    const codeSuffix = Math.floor(1000 + Math.random() * 9000);
    const newCode = `CHIP-${username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'USER'}-${codeSuffix}`;

    const newUser: StoredUser = {
      id: `usr-${Date.now()}`,
      username: username.trim(),
      email: cleanEmail,
      roles: ['USER'],
      status: 'ACTIVE', // Automatically active or pending
      email_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      tier: 'CHIP MEMBER',
      referralCode: newCode,
      referredBy: referredByCode?.trim() || undefined,
      chipsBalance: 5000, // Welcome gift +5,000 CHIP
      streakDays: 1,
    };

    users.unshift(newUser);
    safeSet(STORAGE_KEYS.USERS, users);

    // If referred by someone, record referral branch
    if (referredByCode) {
      const referrer = this.getUserByReferralCode(referredByCode);
      if (referrer) {
        this.addReferralLink({
          id: `ref-${Date.now()}`,
          referrerCode: referrer.referralCode,
          referredUserId: newUser.id,
          referredEmail: newUser.email,
          registeredAt: newUser.created_at,
          isEmailVerified: true,
          refereeChipsEarned: 5000,
          commissionPaidToReferrer: Math.round(5000 * (TIER_CONFIGS[referrer.tier]?.bonusRate || 0)),
        });

        // Credit referral welcome bonus to referrer (+10,000 CHIP)
        this.addChips(referrer.id, 10000, 'Hoa hồng giới thiệu thành viên mới');
      }
    }

    return newUser;
  },

  // 3. Update Chips balance & Check Tier Promotion
  addChips(userId: string, amount: number, reason: string): { user: StoredUser; promoted: boolean } {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const u = users[idx];
    const oldTier = u.tier;
    u.chipsBalance += amount;

    // Count verified referrals
    const referrals = this.getReferralsByReferrer(u.referralCode);
    const verifiedRefs = referrals.filter((r) => r.isEmailVerified).length;

    const newTier = calculateTier(u.chipsBalance, verifiedRefs);
    let promoted = false;

    if (newTier !== oldTier) {
      u.tier = newTier;
      promoted = true;

      // Log promotion event
      const promoRecord: TierPromotionRecord = {
        id: `prm-${Date.now()}`,
        userId: u.id,
        userEmail: u.email,
        oldTier,
        newTier,
        milestoneMet: `Thu thập > ${u.chipsBalance.toLocaleString()} CHIP + ${verifiedRefs} F1 xác thực email`,
        promotedAt: new Date().toISOString(),
        privilegesGranted: TIER_CONFIGS[newTier].description,
      };
      const promos = this.getPromotions();
      promos.unshift(promoRecord);
      safeSet(STORAGE_KEYS.PROMOTIONS, promos);
    }

    // Log chip allocation
    const allocRecord: ChipAllocationRecord = {
      id: `alc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: u.id,
      userEmail: u.email,
      tier: u.tier,
      activityChips: amount > 0 ? amount : 0,
      referralCommissionChips: 0,
      totalAllocated: amount,
      allocatedAt: new Date().toISOString(),
    };
    const allocs = this.getAllocations();
    allocs.unshift(allocRecord);
    safeSet(STORAGE_KEYS.ALLOCATIONS, allocs);

    users[idx] = u;
    safeSet(STORAGE_KEYS.USERS, users);

    // Also update active session if it matches this user
    try {
      const cur = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
      if (cur) {
        const parsed = JSON.parse(cur);
        if (parsed.email === u.email || parsed.id === u.id) {
          localStorage.setItem(
            STORAGE_KEYS.USER_SESSION,
            JSON.stringify({ ...parsed, ...u })
          );
        }
      }
    } catch (e) {}

    return { user: u, promoted };
  },

  // 4. Referral Management
  getReferrals(): StoredReferralLink[] {
    return safeGet<StoredReferralLink[]>(STORAGE_KEYS.REFERRALS, SEED_REFERRAL_LINKS);
  },

  getReferralsByReferrer(referrerCode: string): StoredReferralLink[] {
    const list = this.getReferrals();
    return list.filter((r) => r.referrerCode.toUpperCase() === referrerCode.toUpperCase());
  },

  addReferralLink(link: StoredReferralLink): void {
    const list = this.getReferrals();
    list.unshift(link);
    safeSet(STORAGE_KEYS.REFERRALS, list);
  },

  // 5. Promotion History
  getPromotions(): TierPromotionRecord[] {
    return safeGet<TierPromotionRecord[]>(STORAGE_KEYS.PROMOTIONS, SEED_PROMOTIONS);
  },

  // 6. Allocations History
  getAllocations(): ChipAllocationRecord[] {
    return safeGet<ChipAllocationRecord[]>(STORAGE_KEYS.ALLOCATIONS, SEED_ALLOCATIONS);
  },

  // 7. Active User Session (Member portal)
  getCurrentMember(): StoredUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Fetch latest from user list
      const u = this.getUserByEmail(parsed.email || '');
      return u || parsed;
    } catch (e) {
      return null;
    }
  },

  setMemberSession(user: StoredUser): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(user));
      window.dispatchEvent(new Event('chipcoin_session_changed'));
    } catch (e) {}
  },

  clearMemberSession(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
      window.dispatchEvent(new Event('chipcoin_session_changed'));
    } catch (e) {}
  },

  // 8. Active System Session (Admin portal)
  getCurrentSystemStaff(): any | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SYSTEM_SESSION);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  clearSystemSession(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.SYSTEM_SESSION);
      window.dispatchEvent(new Event('chipcoin_session_changed'));
    } catch (e) {}
  },
};
