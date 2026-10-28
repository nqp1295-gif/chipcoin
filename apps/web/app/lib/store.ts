'use client';

// ============================================================================
// CHIPCOIN CENTRALIZED DATA STORE & TON / TELEGRAM WALLET LEDGER ENGINE (v4)
// Implements: 1 USDT = 5,000,000 CHIP fixed internal conversion rate
// Telegram Wallet & TON Connect Integration, Deposit/Withdrawal State Machines
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

// ============================================================================
// OFFICIAL FIXED EXCHANGE RATE DEFINITIONS (CHIPCOIN_TELEGRAM_WALLET.md)
// 1 USDT = 5,000,000 CHIP (1 micro-USDT = 5 CHIP)
// ============================================================================
export const CHIP_PER_USDT = 5000000;
export const USDT_PER_CHIP = 1 / 5000000; // 0.0000002

export function chipToUsdt(chips: number): number {
  if (!chips || chips <= 0) return 0;
  return Number((chips / CHIP_PER_USDT).toFixed(6));
}

export function usdtToChip(usdt: number): number {
  if (!usdt || usdt <= 0) return 0;
  return Math.round(usdt * CHIP_PER_USDT);
}

// 1. Updated Tier Conditions:
// - CHIP MEMBER: Registered + Email verified (0%)
// - CHIP GOLD: > 1,000,000 chips (1m) + 3 email-verified refs (3%)
// - CHIP PLATINUM: > 5,000,000 chips (5m) + 10 email-verified refs (5%, withdraw/transfer)
// - CHIP DIAMOND: > 15,000,000 chips (15m) + 30 email-verified refs (10%, withdraw, system perks)
// - CHIP SPECIAL: > 50,000,000 chips (50m) + 50 email-verified refs (20%, withdraw, max system perks)
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
    minChips: 1000000, // 1m
    minVerifiedReferrals: 3,
    bonusRate: 0.03,
    canTransferAndWithdraw: false,
    extendedPrivileges: false,
    badgeColor: '#f5d77f',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
    description: 'Thu thập > 1m chip + Giới thiệu 3 người xác thực email (Thưởng 3% chip)',
  },
  'CHIP PLATINUM': {
    tier: 'CHIP PLATINUM',
    name: 'CHIP PLATINUM',
    minChips: 5000000, // 5m
    minVerifiedReferrals: 10,
    bonusRate: 0.05,
    canTransferAndWithdraw: true,
    extendedPrivileges: false,
    badgeColor: '#38bdf8',
    gradient: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 100%)',
    description: 'Thu thập > 5m chip + Giới thiệu 10 người xác thực email (Thưởng 5%, mở gửi/nhận & rút chip)',
  },
  'CHIP DIAMOND': {
    tier: 'CHIP DIAMOND',
    name: 'CHIP DIAMOND',
    minChips: 15000000, // 15m
    minVerifiedReferrals: 30,
    bonusRate: 0.10,
    canTransferAndWithdraw: true,
    extendedPrivileges: true,
    badgeColor: '#a855f7',
    gradient: 'linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)',
    description: 'Thu thập > 15m chip + Giới thiệu 30 người xác thực email (Thưởng 10%, mở rút & đặc quyền mở rộng)',
  },
  'CHIP SPECIAL': {
    tier: 'CHIP SPECIAL',
    name: 'CHIP SPECIAL',
    minChips: 50000000, // 50m
    minVerifiedReferrals: 50,
    bonusRate: 0.20,
    canTransferAndWithdraw: true,
    extendedPrivileges: true,
    badgeColor: '#f43f5e',
    gradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
    description: 'Thu thập > 50m chip + Giới thiệu 50 người xác thực email (Thưởng 20%, đặc quyền VIP tối cao)',
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
  updated_at?: string; // Thời gian cập nhật gần nhất
  statusReason?: string; // Lý do cập nhật trạng thái gần nhất
  password?: string; // Mật khẩu người dùng (nếu lưu local)
  tier: MemberTier;
  referralCode: string;
  referredBy?: string;
  fullName?: string; // Họ và tên đầy đủ
  phoneNumber?: string; // Số điện thoại liên hệ
  emailVerifiedRewardClaimed?: boolean; // Đã nhận chip thưởng xác thực email chưa
  chipsBalance: number;
  usdtBalance: number; // Internal USDT balance (6 decimal precision)
  streakDays: number;
  lastClaimDate?: string;
  avatarUrl?: string; // Custom uploaded avatar base64 or URL
  tonWalletAddress?: string; // Connected TON wallet address (EQ... / UQ...)
  tonBoundAt?: string;
  telegramUserId?: string; // Connected Telegram ID e.g. "tg_982144912"
  telegramUsername?: string; // Telegram @username
  twoFactorEnabled?: boolean; // 2FA protection for withdrawals/conversions
}

// ============================================================================
// SYSTEM ADMIN TREASURY & 1% TRANSACTION FEE ENGINE
// Connected TON Wallet: TBztwgxtzSBPvFA56VM5Mpozh6Gj84KPhh
// All member USDT transactions incur 1% fee transferred to this treasury
// ============================================================================
export const ADMIN_TON_WALLET = 'TBztwgxtzSBPvFA56VM5Mpozh6Gj84KPhh';
export const USDT_TRANSACTION_FEE_RATE = 0.01; // 1%

export interface AdminFeeRecord {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  txType: 'CONVERT_CHIP_TO_USDT' | 'CONVERT_USDT_TO_CHIP' | 'WITHDRAW_USDT' | 'DEPOSIT_USDT';
  txTypeLabel: string;
  volumeUsdt: number;
  feeRate: number; // 0.01 (1%)
  feeUsdt: number;
  beneficiaryWallet: string; // "TBztwgxtzSBPvFA56VM5Mpozh6Gj84KPhh"
  orderId: string;
  txHash?: string;
  status: 'RECORDED';
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

// Conversion Order (CHIP <-> USDT)
export interface ConversionOrder {
  id: string;
  userId: string;
  userEmail: string;
  fromAsset: 'CHIP' | 'USDT';
  toAsset: 'CHIP' | 'USDT';
  sourceAmount: number;
  targetAmount: number;
  rateApplied: string; // e.g. "1 USDT = 5,000,000 CHIP"
  createdAt: string;
  status: 'SETTLED';
}

// Deposit Intent (USDT on TON/Telegram Wallet -> CHIPCOIN)
export interface DepositIntent {
  id: string;
  userId: string;
  userEmail: string;
  amountUsdt: number;
  equivalentChip: number;
  depositAddress: string;
  memo: string;
  network: 'TON Mainnet';
  asset: 'USDT (TON Jetton)';
  status: 'PENDING' | 'CONFIRMED' | 'SETTLED';
  txHash?: string;
  createdAt: string;
  settledAt?: string;
}

// Withdrawal Order (CHIPCOIN -> USDT on TON / Telegram Wallet)
export interface WithdrawalOrder {
  id: string;
  userId: string;
  userEmail: string;
  amountUsdt: number;
  feeUsdt: number;
  netAmountUsdt: number;
  destinationTonAddress: string;
  network: 'TON Mainnet';
  status: 'AWAITING_2FA' | 'REVIEW' | 'QUEUED' | 'CONFIRMED' | 'SETTLED';
  txHash?: string;
  createdAt: string;
  settledAt?: string;
}

// ============================================================================
// ENVIRONMENT GATE: Seed data is ONLY used when NEXT_PUBLIC_USE_SEED_DATA=true
// In production, all seed arrays are empty — real data comes from the backend API.
// ============================================================================
const IS_LOCAL_DEV =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_USE_SEED_DATA === 'true';

// Initial Seed Data aligned strictly with 1 USDT = 5,000,000 CHIP
// These are ONLY loaded in local dev mode (NEXT_PUBLIC_USE_SEED_DATA=true)
const _RAW_SEED_USERS: StoredUser[] = [
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
    usdtBalance: 100.00, // 500,000,000 CHIP / 5,000,000 = 100 USDT
    streakDays: 45,
    avatarUrl: '',
    tonWalletAddress: 'EQBvW8Z5huBkMJYdn3PCDnHoKK3xNJa_W0C_z8LgqG12Ton',
    tonBoundAt: '2026-09-02T10:00:00Z',
    telegramUserId: 'tg_889102481',
    telegramUsername: 'admin_chipcoin',
    twoFactorEnabled: true,
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
    chipsBalance: 16500000,
    usdtBalance: 3.30, // 16.5M / 5M = 3.3 USDT
    streakDays: 28,
    twoFactorEnabled: true,
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
    chipsBalance: 6500000,
    usdtBalance: 1.30, // 6.5M / 5M = 1.3 USDT
    streakDays: 19,
    twoFactorEnabled: true,
  },
  {
    id: 'usr-mem-001',
    username: 'alex_investor',
    email: 'alex.investor@example.com',
    roles: ['USER'],
    status: 'ACTIVE',
    email_verified_at: '2026-10-01T14:20:00Z',
    created_at: '2026-10-01T14:15:00Z',
    tier: 'CHIP SPECIAL', // > 50m chips + 50 refs
    referralCode: 'CHIP-ALEX-99',
    chipsBalance: 52000000,
    usdtBalance: 10.40, // 52M / 5M = 10.4 USDT
    streakDays: 22,
    tonWalletAddress: 'EQC3_a78WJkl92NxOpmLkQwErTy1408ZzX9AklPq90Ton',
    tonBoundAt: '2026-10-15T08:30:00Z',
    telegramUserId: 'tg_149201948',
    telegramUsername: 'alex_investor',
    twoFactorEnabled: true,
  },
  {
    id: 'usr-mem-002',
    username: 'sophia_crypto',
    email: 'sophia.chain@example.com',
    roles: ['USER'],
    status: 'ACTIVE',
    email_verified_at: '2026-10-05T11:00:00Z',
    created_at: '2026-10-05T10:50:00Z',
    tier: 'CHIP DIAMOND', // > 15m chips + 30 refs
    referralCode: 'CHIP-SOPH-77',
    referredBy: 'CHIP-ALEX-99',
    chipsBalance: 16250000,
    usdtBalance: 3.25, // 16.25M / 5M = 3.25 USDT
    streakDays: 14,
    tonWalletAddress: 'UQDFG78_aZqR91KlmOxWqPq78119028AkLmOp120Ton',
    tonBoundAt: '2026-10-20T12:00:00Z',
    telegramUserId: 'tg_602189412',
    telegramUsername: 'sophia_crypto',
    twoFactorEnabled: true,
  },
  {
    id: 'usr-mem-003',
    username: 'david_tran',
    email: 'david.tran@example.com',
    roles: ['USER'],
    status: 'ACTIVE',
    email_verified_at: '2026-10-12T16:45:00Z',
    created_at: '2026-10-12T16:30:00Z',
    tier: 'CHIP PLATINUM', // > 5m chips + 10 refs
    referralCode: 'CHIP-DAVI-55',
    referredBy: 'CHIP-SOPH-77',
    chipsBalance: 5800000,
    usdtBalance: 1.16, // 5.8M / 5M = 1.16 USDT
    streakDays: 9,
    twoFactorEnabled: true,
  },
  {
    id: 'usr-mem-004',
    username: 'minh_hoang',
    email: 'minh.hoang@example.com',
    roles: ['USER'],
    status: 'ACTIVE',
    email_verified_at: '2026-10-18T08:10:00Z',
    created_at: '2026-10-18T08:00:00Z',
    tier: 'CHIP GOLD', // > 1m chips + 3 refs
    referralCode: 'CHIP-MINH-33',
    referredBy: 'CHIP-DAVI-55',
    chipsBalance: 1250000,
    usdtBalance: 0.25, // 1.25M / 5M = 0.25 USDT
    streakDays: 5,
    twoFactorEnabled: false,
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
    usdtBalance: 0.009,
    streakDays: 2,
    twoFactorEnabled: false,
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
    usdtBalance: 0.001,
    streakDays: 0,
    twoFactorEnabled: false,
  },
];
const SEED_USERS: StoredUser[] = IS_LOCAL_DEV ? _RAW_SEED_USERS : [];

const _RAW_SEED_CONVERSIONS: ConversionOrder[] = [
  {
    id: 'ord-conv-001',
    userId: 'usr-mem-001',
    userEmail: 'alex.investor@example.com',
    fromAsset: 'USDT',
    toAsset: 'CHIP',
    sourceAmount: 10,
    targetAmount: 50000000,
    rateApplied: '1 USDT = 5,000,000 CHIP',
    createdAt: '2026-10-24T10:15:00Z',
    status: 'SETTLED',
  },
  {
    id: 'ord-conv-002',
    userId: 'usr-mem-002',
    userEmail: 'sophia.chain@example.com',
    fromAsset: 'CHIP',
    toAsset: 'USDT',
    sourceAmount: 10000000,
    targetAmount: 2.0,
    rateApplied: '1 USDT = 5,000,000 CHIP',
    createdAt: '2026-10-25T14:30:00Z',
    status: 'SETTLED',
  },
];
const SEED_CONVERSIONS: ConversionOrder[] = IS_LOCAL_DEV ? _RAW_SEED_CONVERSIONS : [];

const _RAW_SEED_DEPOSITS: DepositIntent[] = [
  {
    id: 'dep-intent-001',
    userId: 'usr-mem-001',
    userEmail: 'alex.investor@example.com',
    amountUsdt: 10.0,
    equivalentChip: 50000000,
    depositAddress: 'EQBvW8Z5huBkMJYdn3PCDnHoKK3xNJa_W0C_z8LgqG12Ton',
    memo: 'DEP-ALEX-9901',
    network: 'TON Mainnet',
    asset: 'USDT (TON Jetton)',
    status: 'SETTLED',
    txHash: '0x7e29...9a12',
    createdAt: '2026-10-24T09:40:00Z',
    settledAt: '2026-10-24T09:42:15Z',
  },
];
const SEED_DEPOSITS: DepositIntent[] = IS_LOCAL_DEV ? _RAW_SEED_DEPOSITS : [];

const _RAW_SEED_WITHDRAWALS: WithdrawalOrder[] = [
  {
    id: 'wdr-ord-001',
    userId: 'usr-mem-001',
    userEmail: 'alex.investor@example.com',
    amountUsdt: 5.0,
    feeUsdt: 0.1,
    netAmountUsdt: 4.9,
    destinationTonAddress: 'EQC3_a78WJkl92NxOpmLkQwErTy1408ZzX9AklPq90Ton',
    network: 'TON Mainnet',
    status: 'SETTLED',
    txHash: '0x94fb...31de',
    createdAt: '2026-10-25T16:00:00Z',
    settledAt: '2026-10-25T16:05:00Z',
  },
];
const SEED_WITHDRAWALS: WithdrawalOrder[] = IS_LOCAL_DEV ? _RAW_SEED_WITHDRAWALS : [];

const _RAW_SEED_REFERRAL_LINKS: StoredReferralLink[] = [
  {
    id: 'ref-001',
    referrerCode: 'CHIP-ALEX-99',
    referredUserId: 'usr-mem-002',
    referredEmail: 'sophia.chain@example.com',
    registeredAt: '2026-10-05T10:50:00Z',
    isEmailVerified: true,
    refereeChipsEarned: 16250000,
    commissionPaidToReferrer: 3250000, // 20% tier
  },
  {
    id: 'ref-002',
    referrerCode: 'CHIP-SOPH-77',
    referredUserId: 'usr-mem-003',
    referredEmail: 'david.tran@example.com',
    registeredAt: '2026-10-12T16:30:00Z',
    isEmailVerified: true,
    refereeChipsEarned: 5800000,
    commissionPaidToReferrer: 580000, // 10% tier
  },
  {
    id: 'ref-003',
    referrerCode: 'CHIP-DAVI-55',
    referredUserId: 'usr-mem-004',
    referredEmail: 'minh.hoang@example.com',
    registeredAt: '2026-10-18T08:00:00Z',
    isEmailVerified: true,
    refereeChipsEarned: 1250000,
    commissionPaidToReferrer: 62500, // 5% tier
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
const SEED_REFERRAL_LINKS: StoredReferralLink[] = IS_LOCAL_DEV ? _RAW_SEED_REFERRAL_LINKS : [];

const _RAW_SEED_PROMOTIONS: TierPromotionRecord[] = [
  {
    id: 'prm-001',
    userId: 'usr-mem-001',
    userEmail: 'alex.investor@example.com',
    oldTier: 'CHIP DIAMOND',
    newTier: 'CHIP SPECIAL',
    milestoneMet: 'Thu thập > 50,000,000 CHIP + 50 F1 xác thực email',
    promotedAt: '2026-10-22T09:15:00Z',
    privilegesGranted: 'Thưởng 20% hoa hồng nhánh, quyền rút chip & đặc quyền hệ thống tối đa',
  },
  {
    id: 'prm-002',
    userId: 'usr-mem-002',
    userEmail: 'sophia.chain@example.com',
    oldTier: 'CHIP PLATINUM',
    newTier: 'CHIP DIAMOND',
    milestoneMet: 'Thu thập > 15,000,000 CHIP + 30 F1 xác thực email',
    promotedAt: '2026-10-20T14:30:00Z',
    privilegesGranted: 'Thưởng 10% hoa hồng nhánh, quyền rút chip & đặc quyền mở rộng',
  },
  {
    id: 'prm-003',
    userId: 'usr-mem-003',
    userEmail: 'david.tran@example.com',
    oldTier: 'CHIP GOLD',
    newTier: 'CHIP PLATINUM',
    milestoneMet: 'Thu thập > 5,000,000 CHIP + 10 F1 xác thực email',
    promotedAt: '2026-10-19T11:00:00Z',
    privilegesGranted: 'Thưởng 5% hoa hồng nhánh, quyền gửi/nhận & rút chip sang USDT ví TON',
  },
  {
    id: 'prm-004',
    userId: 'usr-mem-004',
    userEmail: 'minh.hoang@example.com',
    oldTier: 'CHIP MEMBER',
    newTier: 'CHIP GOLD',
    milestoneMet: 'Thu thập > 1,000,000 CHIP + 3 F1 xác thực email',
    promotedAt: '2026-10-25T16:20:00Z',
    privilegesGranted: 'Thưởng 3% hoa hồng nhánh từ người được giới thiệu',
  },
];
const SEED_PROMOTIONS: TierPromotionRecord[] = IS_LOCAL_DEV ? _RAW_SEED_PROMOTIONS : [];

const _RAW_SEED_ALLOCATIONS: ChipAllocationRecord[] = [
  {
    id: 'alc-001',
    userId: 'usr-mem-001',
    userEmail: 'alex.investor@example.com',
    tier: 'CHIP SPECIAL',
    activityChips: 35000000,
    referralCommissionChips: 17000000,
    totalAllocated: 52000000,
    allocatedAt: '2026-10-26T20:10:00Z',
  },
  {
    id: 'alc-002',
    userId: 'usr-mem-002',
    userEmail: 'sophia.chain@example.com',
    tier: 'CHIP DIAMOND',
    activityChips: 11500000,
    referralCommissionChips: 4750000,
    totalAllocated: 16250000,
    allocatedAt: '2026-10-26T18:45:00Z',
  },
  {
    id: 'alc-003',
    userId: 'usr-mem-003',
    userEmail: 'david.tran@example.com',
    tier: 'CHIP PLATINUM',
    activityChips: 4200000,
    referralCommissionChips: 1600000,
    totalAllocated: 5800000,
    allocatedAt: '2026-10-26T15:30:00Z',
  },
  {
    id: 'alc-004',
    userId: 'usr-mem-004',
    userEmail: 'minh.hoang@example.com',
    tier: 'CHIP GOLD',
    activityChips: 950000,
    referralCommissionChips: 300000,
    totalAllocated: 1250000,
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
const SEED_ALLOCATIONS: ChipAllocationRecord[] = IS_LOCAL_DEV ? _RAW_SEED_ALLOCATIONS : [];

const _RAW_SEED_ADMIN_FEES: AdminFeeRecord[] = [
  {
    id: 'fee-seed-001',
    timestamp: '2026-10-25 16:00:00',
    userId: 'usr-mem-001',
    userEmail: 'alex.investor@example.com',
    txType: 'WITHDRAW_USDT',
    txTypeLabel: 'Rút USDT về ví TON cá nhân',
    volumeUsdt: 5.0,
    feeRate: 0.01,
    feeUsdt: 0.05,
    beneficiaryWallet: ADMIN_TON_WALLET,
    orderId: 'wdr-ord-001',
    txHash: '0x94fb...31de',
    status: 'RECORDED',
  },
  {
    id: 'fee-seed-002',
    timestamp: '2026-10-25 14:30:00',
    userId: 'usr-mem-002',
    userEmail: 'sophia.chain@example.com',
    txType: 'CONVERT_CHIP_TO_USDT',
    txTypeLabel: 'Quy đổi CHIP sang USDT',
    volumeUsdt: 2.0,
    feeRate: 0.01,
    feeUsdt: 0.02,
    beneficiaryWallet: ADMIN_TON_WALLET,
    orderId: 'ord-conv-002',
    status: 'RECORDED',
  },
  {
    id: 'fee-seed-003',
    timestamp: '2026-10-24 10:15:00',
    userId: 'usr-mem-001',
    userEmail: 'alex.investor@example.com',
    txType: 'CONVERT_USDT_TO_CHIP',
    txTypeLabel: 'Quy đổi USDT sang CHIP',
    volumeUsdt: 10.0,
    feeRate: 0.01,
    feeUsdt: 0.10,
    beneficiaryWallet: ADMIN_TON_WALLET,
    orderId: 'ord-conv-001',
    status: 'RECORDED',
  },
];
const SEED_ADMIN_FEES: AdminFeeRecord[] = IS_LOCAL_DEV ? _RAW_SEED_ADMIN_FEES : [];

const STORAGE_KEYS = {
  USERS: 'chipcoin_synced_users_v4',
  REFERRALS: 'chipcoin_synced_referrals_v4',
  PROMOTIONS: 'chipcoin_synced_promotions_v4',
  ALLOCATIONS: 'chipcoin_synced_allocations_v4',
  CONVERSIONS: 'chipcoin_synced_conversions_v4',
  DEPOSITS: 'chipcoin_synced_deposits_v4',
  WITHDRAWALS: 'chipcoin_synced_withdrawals_v4',
  ADMIN_FEES: 'chipcoin_admin_fees_v1',
  USER_SESSION: 'chipcoin_user_session',
  SYSTEM_SESSION: 'chipcoin_system_session',
};

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

/**
 * STRICT TIER QUALIFICATION LOGIC:
 * A tier is ONLY activated when BOTH conditions are met:
 * 1. chips collected >= minChips
 * 2. verifiedReferrals >= minVerifiedReferrals
 */
export function calculateTier(chips: number, verifiedReferrals: number): MemberTier {
  if (chips >= 50000000 && verifiedReferrals >= 50) return 'CHIP SPECIAL';
  if (chips >= 15000000 && verifiedReferrals >= 30) return 'CHIP DIAMOND';
  if (chips >= 5000000 && verifiedReferrals >= 10) return 'CHIP PLATINUM';
  if (chips >= 1000000 && verifiedReferrals >= 3) return 'CHIP GOLD';
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

  getUserByReferralCode(code?: string): StoredUser | undefined {
    if (!code) return undefined;
    const clean = code.trim().toUpperCase();
    const users = this.getUsers();
    return users.find((u) => 
      (u.referralCode && u.referralCode.trim().toUpperCase() === clean) ||
      (u.username && u.username.trim().toUpperCase() === clean)
    );
  },

  saveUsers(users: StoredUser[]): void {
    safeSet(STORAGE_KEYS.USERS, users);
  },

  upsertUser(user: StoredUser): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.unshift(user);
    }
    safeSet(STORAGE_KEYS.USERS, users);
    this.syncSessionIfActive(user);
  },

  // 2. Register user
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
    const cleanRef = referredByCode?.trim() || undefined;

    const newUser: StoredUser = {
      id: `usr-${Date.now()}`,
      username: username.trim(),
      email: cleanEmail,
      roles: ['USER'],
      status: 'ACTIVE',
      email_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      tier: 'CHIP MEMBER',
      referralCode: newCode,
      referredBy: cleanRef,
      chipsBalance: 5000, // Welcome gift +5,000 CHIP
      usdtBalance: 0.001,
      streakDays: 1,
      avatarUrl: '',
      twoFactorEnabled: false,
    };

    users.unshift(newUser);
    safeSet(STORAGE_KEYS.USERS, users);

    if (cleanRef) {
      const referrer = this.getUserByReferralCode(cleanRef);
      const effectiveReferrerCode = referrer ? referrer.referralCode : cleanRef.toUpperCase();

      this.addReferralLink({
        id: `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        referrerCode: effectiveReferrerCode,
        referredUserId: newUser.id,
        referredEmail: newUser.email,
        registeredAt: newUser.created_at,
        isEmailVerified: true,
        refereeChipsEarned: 5000,
        commissionPaidToReferrer: referrer
          ? Math.round(5000 * (TIER_CONFIGS[referrer.tier]?.bonusRate || 0.05))
          : 250,
      });

      if (referrer) {
        this.addChips(referrer.id, 10000, `Hoa hồng giới thiệu thành viên mới: ${newUser.username}`);
      }
    }

    return newUser;
  },

  // 3. Add Chips balance & Check Tier Promotion
  addChips(userId: string, amount: number, reason: string): { user: StoredUser; promoted: boolean } {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const u = users[idx];
    const oldTier = u.tier;
    u.chipsBalance += amount;

    const referrals = this.getReferralsByReferrer(u.referralCode);
    const verifiedRefs = referrals.filter((r) => r.isEmailVerified).length;

    const newTier = calculateTier(u.chipsBalance, verifiedRefs);
    let promoted = false;

    if (newTier !== oldTier) {
      u.tier = newTier;
      promoted = true;

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

    this.syncSessionIfActive(u);
    return { user: u, promoted };
  },

  // 3b. Record Daily Check-in (update lastClaimDate & streakDays)
  recordDailyCheckin(userId: string): StoredUser {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const u = users[idx];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Check if last claim was yesterday to maintain streak
    if (u.lastClaimDate) {
      const lastDate = new Date(u.lastClaimDate);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      if (u.lastClaimDate === yesterdayStr) {
        // Consecutive day — increment streak (max 7, then reset to 1)
        u.streakDays = u.streakDays >= 7 ? 1 : u.streakDays + 1;
      } else if (u.lastClaimDate === todayStr) {
        // Already claimed today — no change
        return u;
      } else {
        // Streak broken — reset to 1
        u.streakDays = 1;
      }
    } else {
      // First ever check-in
      u.streakDays = 1;
    }

    u.lastClaimDate = todayStr;
    users[idx] = u;
    safeSet(STORAGE_KEYS.USERS, users);
    this.syncSessionIfActive(u);
    return u;
  },

  // 4. Update Profile
  updateProfile(
    userId: string,
    updates: {
      username?: string;
      fullName?: string;
      phoneNumber?: string;
      avatarUrl?: string;
      twoFactorEnabled?: boolean;
    }
  ): StoredUser {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const u = users[idx];
    if (updates.username && updates.username.trim()) {
      u.username = updates.username.trim();
    }
    if (typeof updates.fullName === 'string') {
      u.fullName = updates.fullName.trim();
    }
    if (typeof updates.phoneNumber === 'string') {
      u.phoneNumber = updates.phoneNumber.trim();
    }
    if (typeof updates.avatarUrl === 'string') {
      u.avatarUrl = updates.avatarUrl;
    }
    if (typeof updates.twoFactorEnabled === 'boolean') {
      u.twoFactorEnabled = updates.twoFactorEnabled;
    }

    users[idx] = u;
    safeSet(STORAGE_KEYS.USERS, users);
    this.syncSessionIfActive(u);
    return u;
  },

  // 4b. Reset User Password (by Admin)
  resetUserPassword(userId: string, newPassword?: string): { user: StoredUser; tempPassword: string } {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (idx === -1) throw new Error('Không tìm thấy tài khoản người dùng.');

    const u = users[idx];
    const generated = newPassword && newPassword.trim() 
      ? newPassword.trim() 
      : `Chip@${Math.floor(100000 + Math.random() * 900000)}#Pass`;

    u.password = generated;
    u.updated_at = new Date().toISOString();

    users[idx] = u;
    safeSet(STORAGE_KEYS.USERS, users);
    this.syncSessionIfActive(u);
    return { user: u, tempPassword: generated };
  },

  // 4c. Update User Status (Dừng hoạt động / Kích hoạt với lý do cụ thể)
  updateUserStatus(
    userId: string,
    newStatus: 'ACTIVE' | 'SUSPENDED',
    reason: string
  ): StoredUser {
    if (!reason || reason.trim().length < 3) {
      throw new Error('Vui lòng ghi chú cụ thể lý do thay đổi trạng thái tài khoản.');
    }

    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (idx === -1) throw new Error('Không tìm thấy tài khoản người dùng.');

    const u = users[idx];
    u.status = newStatus;
    u.statusReason = reason.trim();
    u.updated_at = new Date().toISOString();

    users[idx] = u;
    safeSet(STORAGE_KEYS.USERS, users);
    this.syncSessionIfActive(u);
    return u;
  },

  // 4d. Xóa Vĩnh Viễn Tài Khoản
  // Lưu ý: Toàn bộ số dư CHIP hoàn về hệ thống, toàn bộ số dư USDT hoàn về 💎 VÍ TON QUẢN TRỊ CHÍNH THỨC
  deleteUserPermanently(
    userId: string,
    reason: string
  ): {
    user: StoredUser;
    chipsRefunded: number;
    usdtRefunded: number;
    destinationTonWallet: string;
  } {
    if (!reason || reason.trim().length < 3) {
      throw new Error('Vui lòng ghi chú cụ thể lý do xóa vĩnh viễn tài khoản.');
    }

    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (idx === -1) throw new Error('Không tìm thấy tài khoản người dùng để xóa.');

    const targetUser = users[idx];
    const chipsRefunded = targetUser.chipsBalance || 0;
    const usdtRefunded = targetUser.usdtBalance || 0;

    // 1. Hoàn toàn bộ số dư USDT về VÍ TON QUẢN TRỊ CHÍNH THỨC
    if (usdtRefunded > 0) {
      const feeRecord: AdminFeeRecord = {
        id: `fee-del-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        userId: targetUser.id,
        userEmail: targetUser.email,
        txType: 'CONVERT_USDT_TO_CHIP',
        txTypeLabel: `Hoàn số dư USDT về Ví TON Quản Trị khi xóa tài khoản (${reason.trim()})`,
        volumeUsdt: usdtRefunded,
        feeRate: 1.0,
        feeUsdt: usdtRefunded,
        beneficiaryWallet: ADMIN_TON_WALLET,
        orderId: `del-acc-${targetUser.id}`,
        status: 'RECORDED',
      };
      this.addAdminFeeRecord(feeRecord);
    }

    // 2. Xóa khỏi danh sách tài khoản
    const updatedUsers = users.filter(
      (u) => u.id !== targetUser.id && u.email.toLowerCase() !== targetUser.email.toLowerCase()
    );
    safeSet(STORAGE_KEYS.USERS, updatedUsers);

    // 3. Nếu là phiên đăng nhập hiện tại thì xóa session
    const currentMember = this.getCurrentMember();
    if (currentMember && currentMember.id === targetUser.id) {
      this.clearMemberSession();
    }

    return {
      user: targetUser,
      chipsRefunded,
      usdtRefunded,
      destinationTonWallet: ADMIN_TON_WALLET,
    };
  },

  // 5. TON Wallet & Telegram Binding
  bindTonWallet(userId: string, tonAddress: string): StoredUser {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const u = users[idx];
    u.tonWalletAddress = tonAddress.trim();
    u.tonBoundAt = new Date().toISOString();

    users[idx] = u;
    safeSet(STORAGE_KEYS.USERS, users);
    this.syncSessionIfActive(u);
    return u;
  },

  linkTelegram(userId: string, telegramId: string, telegramUsername?: string): StoredUser {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const u = users[idx];
    u.telegramUserId = telegramId.trim();
    u.telegramUsername = telegramUsername?.replace('@', '').trim() || undefined;

    users[idx] = u;
    safeSet(STORAGE_KEYS.USERS, users);
    this.syncSessionIfActive(u);
    return u;
  },

  // 6. Conversions: CHIP <-> USDT (Strict 1 USDT = 5,000,000 CHIP rate)
  getConversions(): ConversionOrder[] {
    return safeGet<ConversionOrder[]>(STORAGE_KEYS.CONVERSIONS, SEED_CONVERSIONS);
  },

  convertAssets(
    userId: string,
    fromAsset: 'CHIP' | 'USDT',
    sourceAmount: number
  ): { user: StoredUser; order: ConversionOrder; feeRecord: AdminFeeRecord } {
    if (sourceAmount <= 0) throw new Error('Số lượng chuyển đổi phải lớn hơn 0');

    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('Không tìm thấy tài khoản người dùng');

    const u = users[idx];
    let targetAmount = 0;
    let volumeUsdt = 0;
    let feeUsdt = 0;

    if (fromAsset === 'CHIP') {
      if (u.chipsBalance < sourceAmount) {
        throw new Error('Số dư CHIP không đủ để quy đổi');
      }
      const grossUsdt = Number((sourceAmount / CHIP_PER_USDT).toFixed(6));
      volumeUsdt = grossUsdt;
      // 1% transaction fee on USDT
      feeUsdt = Number((grossUsdt * USDT_TRANSACTION_FEE_RATE).toFixed(6));
      targetAmount = Number((grossUsdt - feeUsdt).toFixed(6));

      u.chipsBalance -= sourceAmount;
      u.usdtBalance = Number(((u.usdtBalance || 0) + targetAmount).toFixed(6));
    } else {
      // from USDT to CHIP
      if ((u.usdtBalance || 0) < sourceAmount) {
        throw new Error('Số dư USDT không đủ để quy đổi sang CHIP');
      }
      volumeUsdt = sourceAmount;
      // 1% transaction fee on USDT
      feeUsdt = Number((sourceAmount * USDT_TRANSACTION_FEE_RATE).toFixed(6));
      const netUsdt = Number((sourceAmount - feeUsdt).toFixed(6));
      targetAmount = Math.round(netUsdt * CHIP_PER_USDT);

      u.usdtBalance = Number(((u.usdtBalance || 0) - sourceAmount).toFixed(6));
      u.chipsBalance += targetAmount;

      // Check tier promotion if chips increased
      const refs = this.getReferralsByReferrer(u.referralCode);
      const verifiedCount = refs.filter((r) => r.isEmailVerified).length;
      u.tier = calculateTier(u.chipsBalance, verifiedCount);
    }

    const orderId = `ord-conv-${Date.now()}`;
    const order: ConversionOrder = {
      id: orderId,
      userId: u.id,
      userEmail: u.email,
      fromAsset,
      toAsset: fromAsset === 'CHIP' ? 'USDT' : 'CHIP',
      sourceAmount,
      targetAmount,
      rateApplied: '1 USDT = 5,000,000 CHIP (Khấu trừ 1% phí hệ thống)',
      createdAt: new Date().toISOString(),
      status: 'SETTLED',
    };

    const feeRecord: AdminFeeRecord = {
      id: `fee-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      userId: u.id,
      userEmail: u.email,
      txType: fromAsset === 'CHIP' ? 'CONVERT_CHIP_TO_USDT' : 'CONVERT_USDT_TO_CHIP',
      txTypeLabel: fromAsset === 'CHIP' ? 'Quy đổi CHIP sang USDT' : 'Quy đổi USDT sang CHIP',
      volumeUsdt,
      feeRate: USDT_TRANSACTION_FEE_RATE,
      feeUsdt,
      beneficiaryWallet: ADMIN_TON_WALLET,
      orderId,
      status: 'RECORDED',
    };

    this.addAdminFeeRecord(feeRecord);

    const convs = this.getConversions();
    convs.unshift(order);
    safeSet(STORAGE_KEYS.CONVERSIONS, convs);

    users[idx] = u;
    safeSet(STORAGE_KEYS.USERS, users);
    this.syncSessionIfActive(u);

    return { user: u, order, feeRecord };
  },

  // 7. Deposits: USDT (TON Jetton / Telegram Wallet)
  getDeposits(): DepositIntent[] {
    return safeGet<DepositIntent[]>(STORAGE_KEYS.DEPOSITS, SEED_DEPOSITS);
  },

  createDepositIntent(userId: string, amountUsdt: number): DepositIntent {
    if (amountUsdt <= 0) throw new Error('Số lượng nạp USDT phải lớn hơn 0');

    const user = this.getUserById(userId);
    if (!user) throw new Error('Không tìm thấy người dùng');

    const equivalentChip = Math.round(amountUsdt * CHIP_PER_USDT);
    const memo = `DEP-${user.username.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const intent: DepositIntent = {
      id: `dep-intent-${Date.now()}`,
      userId: user.id,
      userEmail: user.email,
      amountUsdt,
      equivalentChip,
      depositAddress: ADMIN_TON_WALLET,
      memo,
      network: 'TON Mainnet',
      asset: 'USDT (TON Jetton)',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const deposits = this.getDeposits();
    deposits.unshift(intent);
    safeSet(STORAGE_KEYS.DEPOSITS, deposits);
    return intent;
  },

  confirmDeposit(intentId: string): { user: StoredUser; intent: DepositIntent } {
    const deposits = this.getDeposits();
    const idx = deposits.findIndex((d) => d.id === intentId);
    if (idx === -1) throw new Error('Không tìm thấy lệnh nạp');

    const intent = deposits[idx];
    if (intent.status === 'SETTLED') throw new Error('Lệnh nạp này đã được hạch toán');

    const users = this.getUsers();
    const userIdx = users.findIndex((u) => u.id === intent.userId);
    if (userIdx === -1) throw new Error('Không tìm thấy tài khoản người dùng');

    const u = users[userIdx];
    u.usdtBalance = Number(((u.usdtBalance || 0) + intent.amountUsdt).toFixed(6));

    intent.status = 'SETTLED';
    intent.txHash = `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`;
    intent.settledAt = new Date().toISOString();

    deposits[idx] = intent;
    safeSet(STORAGE_KEYS.DEPOSITS, deposits);

    users[userIdx] = u;
    safeSet(STORAGE_KEYS.USERS, users);
    this.syncSessionIfActive(u);

    return { user: u, intent };
  },

  // 8. Withdrawals: USDT to TON / Telegram Wallet
  getWithdrawals(): WithdrawalOrder[] {
    return safeGet<WithdrawalOrder[]>(STORAGE_KEYS.WITHDRAWALS, SEED_WITHDRAWALS);
  },

  createWithdrawal(
    userId: string,
    amountUsdt: number,
    destinationTonAddress: string,
    _otpCode?: string
  ): { user: StoredUser; withdrawal: WithdrawalOrder; feeRecord: AdminFeeRecord } {
    if (amountUsdt <= 0) throw new Error('Số lượng rút phải lớn hơn 0');

    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const u = users[idx];

    // Strict Tier check: must be PLATINUM, DIAMOND, or SPECIAL
    const tierConfig = TIER_CONFIGS[u.tier];
    if (!tierConfig.canTransferAndWithdraw) {
      throw new Error('Tính năng rút tiền chỉ khả dụng từ hạng CHIP PLATINUM trở lên. Vui lòng nâng cấp hạng!');
    }

    if ((u.usdtBalance || 0) < amountUsdt) {
      throw new Error(`Số dư USDT không đủ để rút. Số dư hiện có: ${(u.usdtBalance || 0)} USDT`);
    }

    const gasFee = 0.1; // Estimated network gas fee
    const fee1Percent = Number((amountUsdt * USDT_TRANSACTION_FEE_RATE).toFixed(6)); // 1% transaction fee
    const totalDeductedFee = Number((fee1Percent + gasFee).toFixed(6));

    if (amountUsdt <= totalDeductedFee) {
      throw new Error(`Số lượng rút phải lớn hơn tổng phí giao dịch (${totalDeductedFee} USDT bao gồm 1% phí hệ thống + 0.1 USDT gas mạng)`);
    }

    const netAmountUsdt = Number((amountUsdt - totalDeductedFee).toFixed(6));

    // Deduct USDT balance immediately
    u.usdtBalance = Number(((u.usdtBalance || 0) - amountUsdt).toFixed(6));

    const wdrId = `wdr-${Date.now()}`;
    const txHash = `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`;
    const withdrawal: WithdrawalOrder = {
      id: wdrId,
      userId: u.id,
      userEmail: u.email,
      amountUsdt,
      feeUsdt: totalDeductedFee,
      netAmountUsdt,
      destinationTonAddress: destinationTonAddress.trim(),
      network: 'TON Mainnet',
      status: 'SETTLED',
      txHash,
      createdAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
    };

    const feeRecord: AdminFeeRecord = {
      id: `fee-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      userId: u.id,
      userEmail: u.email,
      txType: 'WITHDRAW_USDT',
      txTypeLabel: 'Rút USDT về ví TON cá nhân',
      volumeUsdt: amountUsdt,
      feeRate: USDT_TRANSACTION_FEE_RATE,
      feeUsdt: fee1Percent,
      beneficiaryWallet: ADMIN_TON_WALLET,
      orderId: wdrId,
      txHash,
      status: 'RECORDED',
    };

    this.addAdminFeeRecord(feeRecord);

    const list = this.getWithdrawals();
    list.unshift(withdrawal);
    safeSet(STORAGE_KEYS.WITHDRAWALS, list);

    users[idx] = u;
    safeSet(STORAGE_KEYS.USERS, users);
    this.syncSessionIfActive(u);

    return { user: u, withdrawal, feeRecord };
  },

  // 8b. Admin Treasury Fee Ledger & Stats
  getAdminFeeRecords(): AdminFeeRecord[] {
    return safeGet<AdminFeeRecord[]>(STORAGE_KEYS.ADMIN_FEES, SEED_ADMIN_FEES);
  },

  addAdminFeeRecord(record: AdminFeeRecord): void {
    const list = this.getAdminFeeRecords();
    list.unshift(record);
    safeSet(STORAGE_KEYS.ADMIN_FEES, list);
  },

  getAdminTreasuryStats() {
    const fees = this.getAdminFeeRecords();
    const totalFeeUsdt = Number(fees.reduce((sum, f) => sum + (f.feeUsdt || 0), 0).toFixed(6));
    const totalVolumeUsdt = Number(fees.reduce((sum, f) => sum + (f.volumeUsdt || 0), 0).toFixed(6));
    const chipEquivalent = Math.round(totalFeeUsdt * CHIP_PER_USDT);
    return {
      tonWallet: ADMIN_TON_WALLET,
      totalFeeUsdt,
      totalVolumeUsdt,
      totalTxCount: fees.length,
      chipEquivalent,
    };
  },

  // 9. Referral Management
  getReferrals(): StoredReferralLink[] {
    return safeGet<StoredReferralLink[]>(STORAGE_KEYS.REFERRALS, SEED_REFERRAL_LINKS);
  },

  getReferralsByReferrer(referrerCode?: string): StoredReferralLink[] {
    if (!referrerCode) return [];
    const clean = referrerCode.trim().toUpperCase();
    const list = this.getReferrals();
    return list.filter((r) => r.referrerCode && r.referrerCode.trim().toUpperCase() === clean);
  },

  addReferralLink(link: StoredReferralLink): void {
    const list = this.getReferrals();
    list.unshift(link);
    safeSet(STORAGE_KEYS.REFERRALS, list);
  },

  // 10. Promotion History
  getPromotions(): TierPromotionRecord[] {
    return safeGet<TierPromotionRecord[]>(STORAGE_KEYS.PROMOTIONS, SEED_PROMOTIONS);
  },

  // 11. Allocations History
  getAllocations(): ChipAllocationRecord[] {
    return safeGet<ChipAllocationRecord[]>(STORAGE_KEYS.ALLOCATIONS, SEED_ALLOCATIONS);
  },

  // Helper to sync user session
  syncSessionIfActive(u: StoredUser): void {
    try {
      const cur = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
      if (cur) {
        const parsed = JSON.parse(cur);
        if (parsed.email === u.email || parsed.id === u.id) {
          localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify({ ...parsed, ...u }));
        }
      }
    } catch (e) {}
    window.dispatchEvent(new Event('chipcoin_session_changed'));
  },

  // 12. Active User Session
  getCurrentMember(): StoredUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
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
