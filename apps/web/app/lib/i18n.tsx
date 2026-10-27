'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SupportedLanguage = 'vi' | 'en' | 'zh' | 'fr' | 'es' | 'ar';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr' },
  { code: 'en', name: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'zh', name: '中文 (简体)', flag: '🇨🇳', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

export const DICTIONARIES: Record<SupportedLanguage, Record<string, string>> = {
  vi: {
    // Navigation - Member
    nav_overview: 'Tổng Quan Cá Nhân',
    nav_overview_desc: 'Bảng chỉ số tích luỹ điểm thưởng & nhiệm vụ',
    nav_activities: 'Hoạt Động Tích Lũy',
    nav_activities_desc: 'Điểm danh hàng ngày, nhiệm vụ & nhận CHIP',
    nav_rank: 'Thăng Hạng Hội Viên',
    nav_rank_desc: 'Điều kiện thăng cấp & theo dõi tiến trình',
    nav_referrals: 'Hệ Thống Giới Thiệu',
    nav_referrals_desc: 'Quản lý nhánh giới thiệu & hoa hồng CHIP',
    nav_wallet: 'Ví Điểm Thưởng CHIP',
    nav_wallet_desc: 'Số dư cá nhân & lịch sử nhận thưởng',
    nav_resend: 'Kích Hoạt / Gửi Lại Email',
    nav_resend_desc: 'Xác thực địa chỉ email nhận thưởng',
    nav_login: 'Đăng Nhập Thành Viên',
    nav_login_desc: 'Đăng nhập vào tài khoản tích luỹ',
    nav_register: 'Đăng Ký Tài Khoản',
    nav_register_desc: 'Tạo tài khoản hội viên nhận +5,000 CHIP',

    // Navigation - System
    nav_sys_accounts: 'Quản Lý Tài Khoản 4 Cấp',
    nav_sys_accounts_desc: 'Admin, Trợ lý, Chuyên viên, Người dùng',
    nav_sys_treasury: 'Sổ Cái Kép Master Treasury',
    nav_sys_treasury_desc: 'Kho quỹ 500M CHIP & điều chuyển pool',
    nav_sys_tracking: 'Giám Sát Outbox Worker',
    nav_sys_tracking_desc: 'Hàng đợi sự kiện Transactional Outbox thời gian thực',
    nav_sys_reports: 'Thống Kê Báo Cáo Hệ Thống',
    nav_sys_reports_desc: 'Báo cáo tăng trưởng, phân bổ điểm & xuất CSV',
    nav_sys_settings: 'Cài Đặt Cấu Hình',
    nav_sys_settings_desc: 'Cấu hình tham số, rate limits, session & SMTP',
    nav_sys_login: 'Cổng Đăng Nhập Quản Trị',
    nav_sys_login_desc: 'Xác thực nhân sự quản trị hệ thống',

    // Group Titles
    group_member_center: 'TRUNG TÂM HỘI VIÊN',
    group_account_security: 'TÀI KHOẢN & BẢO MẬT',
    group_sys_ops: 'ĐIỀU HÀNH & KHO QUỸ',
    group_sys_monitoring: 'GIÁM SÁT & VẬN HÀNH',
    group_sys_config: 'CẤU HÌNH TOÀN HỆ THỐNG',

    // TopBar & Actions
    brand_member_title: 'Cổng Hội Viên',
    brand_system_title: 'Quản Trị Hệ Thống',
    btn_login: 'Đăng nhập',
    btn_register: 'Đăng ký',
    btn_logout: 'Đăng xuất',
    btn_system_login: 'Đăng Nhập Quản Trị',
    role_staff: 'NHÂN SỰ HỆ THỐNG',
    balance_label: 'SỐ DƯ ĐIỂM THƯỞNG',
    tier_label: 'HẠNG',

    // Tiers
    tier_member: 'CHIP MEMBER',
    tier_gold: 'CHIP GOLD',
    tier_platinum: 'CHIP PLATINUM',
    tier_diamond: 'CHIP DIAMOND',
    tier_special: 'CHIP SPECIAL',

    // Common Buttons & Texts
    btn_copy: 'Sao chép',
    btn_copied: 'Đã chép!',
    btn_claim: 'Nhận Thưởng',
    btn_filter: 'Lọc dữ liệu',
    btn_export_csv: 'Xuất CSV',
    all_time: 'Toàn thời gian',
    time_24h: '24 Giờ qua',
    time_7d: '7 Ngày qua',
    time_30d: '30 Ngày qua',
    search_placeholder: 'Tìm kiếm theo email, mã hoặc tên...',
    status_active: 'Đang Hoạt Động',
    status_pending: 'Chờ Xác Thực',
    status_verified: 'Đã Xác Thực',
    status_unverified: 'Chưa Xác Thực',
    footer_copyright: '© 2026 CHIPCOIN. Sổ cái kép Double-entry Ledger bảo mật.',
  },

  en: {
    nav_overview: 'Personal Overview',
    nav_overview_desc: 'Reward points accumulation & tasks dashboard',
    nav_activities: 'Accumulation Activities',
    nav_activities_desc: 'Daily check-in, missions & earn CHIP',
    nav_rank: 'Member Tier Promotion',
    nav_rank_desc: 'Promotion conditions & progress tracker',
    nav_referrals: 'Referral System',
    nav_referrals_desc: 'Referral branches & commission bonus',
    nav_wallet: 'CHIP Reward Wallet',
    nav_wallet_desc: 'Personal balance & transaction ledger',
    nav_resend: 'Activate / Resend Email',
    nav_resend_desc: 'Verify reward destination email address',
    nav_login: 'Member Login',
    nav_login_desc: 'Sign in to points rewards account',
    nav_register: 'Create Account',
    nav_register_desc: 'Open member account & get +5,000 CHIP bonus',

    nav_sys_accounts: '4-Tier Account Management',
    nav_sys_accounts_desc: 'Admin, Assistant, Specialist, User',
    nav_sys_treasury: 'Master Treasury Ledger',
    nav_sys_treasury_desc: '500M CHIP Vault & pool allocations',
    nav_sys_tracking: 'Outbox Worker Monitor',
    nav_sys_tracking_desc: 'Real-time transactional outbox event queue',
    nav_sys_reports: 'System Reports & Statistics',
    nav_sys_reports_desc: 'Growth analytics, chip allocation & CSV export',
    nav_sys_settings: 'System Configuration',
    nav_sys_settings_desc: 'Parameters, rate limits, session & SMTP',
    nav_sys_login: 'Admin Auth Portal',
    nav_sys_login_desc: 'System management authentication',

    group_member_center: 'MEMBER CENTER',
    group_account_security: 'ACCOUNT & SECURITY',
    group_sys_ops: 'OPERATIONS & TREASURY',
    group_sys_monitoring: 'MONITORING & AUDIT',
    group_sys_config: 'SYSTEM CONFIGURATION',

    brand_member_title: 'Member Portal',
    brand_system_title: 'System Admin Console',
    btn_login: 'Log In',
    btn_register: 'Sign Up',
    btn_logout: 'Log Out',
    btn_system_login: 'Staff Login',
    role_staff: 'STAFF PERSONNEL',
    balance_label: 'REWARD BALANCE',
    tier_label: 'TIER',

    tier_member: 'CHIP MEMBER',
    tier_gold: 'CHIP GOLD',
    tier_platinum: 'CHIP PLATINUM',
    tier_diamond: 'CHIP DIAMOND',
    tier_special: 'CHIP SPECIAL',

    btn_copy: 'Copy',
    btn_copied: 'Copied!',
    btn_claim: 'Claim Reward',
    btn_filter: 'Filter',
    btn_export_csv: 'Export CSV',
    all_time: 'All Time',
    time_24h: 'Last 24 Hours',
    time_7d: 'Last 7 Days',
    time_30d: 'Last 30 Days',
    search_placeholder: 'Search by email, ID or name...',
    status_active: 'Active',
    status_pending: 'Pending',
    status_verified: 'Verified',
    status_unverified: 'Unverified',
    footer_copyright: '© 2026 CHIPCOIN. Secure Double-entry Ledger Architecture.',
  },

  zh: {
    nav_overview: '个人总览',
    nav_overview_desc: '积分累计指标与任务看板',
    nav_activities: '积分累计活动',
    nav_activities_desc: '每日签到、任务与赚取CHIP',
    nav_rank: '会员晋升体系',
    nav_rank_desc: '晋升要求与进度追踪',
    nav_referrals: '邀请推荐系统',
    nav_referrals_desc: '管理推荐分支与佣金分配',
    nav_wallet: 'CHIP奖励钱包',
    nav_wallet_desc: '个人余额与账本记录',
    nav_resend: '激活 / 重发邮件',
    nav_resend_desc: '验证接收奖励的安全邮箱',
    nav_login: '会员登录',
    nav_login_desc: '登录积分累积账户',
    nav_register: '注册账户',
    nav_register_desc: '创建会员账户立享 +5,000 CHIP',

    nav_sys_accounts: '四级账户管理',
    nav_sys_accounts_desc: '管理员、助理、专员与普通用户',
    nav_sys_treasury: '主金库复式账本',
    nav_sys_treasury_desc: '500M CHIP金库与资金池调拨',
    nav_sys_tracking: 'Outbox发信监控',
    nav_sys_tracking_desc: '实时事务发件箱队列监控',
    nav_sys_reports: '系统统计与报告',
    nav_sys_reports_desc: '增长分析、积分分配与导出CSV',
    nav_sys_settings: '全系统配置',
    nav_sys_settings_desc: '参数、限流、会话与SMTP配置',
    nav_sys_login: '管理入口登录',
    nav_sys_login_desc: '系统运维人员安全认证',

    group_member_center: '会员中心',
    group_account_security: '账户与安全',
    group_sys_ops: '运营与金库',
    group_sys_monitoring: '监控与审计',
    group_sys_config: '系统配置',

    brand_member_title: '会员中心',
    brand_system_title: '系统管理控制台',
    btn_login: '登录',
    btn_register: '注册',
    btn_logout: '登出',
    btn_system_login: '管理登录',
    role_staff: '管理人员',
    balance_label: '积分余额',
    tier_label: '等级',

    tier_member: 'CHIP MEMBER',
    tier_gold: 'CHIP GOLD',
    tier_platinum: 'CHIP PLATINUM',
    tier_diamond: 'CHIP DIAMOND',
    tier_special: 'CHIP SPECIAL',

    btn_copy: '复制',
    btn_copied: '已复制！',
    btn_claim: '领取奖励',
    btn_filter: '筛选',
    btn_export_csv: '导出CSV',
    all_time: '全部时间',
    time_24h: '过去24小时',
    time_7d: '过去7天',
    time_30d: '过去30天',
    search_placeholder: '按邮箱、ID或姓名搜索...',
    status_active: '正常活跃',
    status_pending: '等待激活',
    status_verified: '已验证',
    status_unverified: '未验证',
    footer_copyright: '© 2026 CHIPCOIN. 安全复式记账系统架构。',
  },

  fr: {
    nav_overview: 'Vue d’ensemble',
    nav_overview_desc: 'Tableau de bord des récompenses & tâches',
    nav_activities: 'Activités de Cumul',
    nav_activities_desc: 'Pointage quotidien, missions & gain de CHIP',
    nav_rank: 'Progression de Rang',
    nav_rank_desc: 'Conditions de surclassement & suivi',
    nav_referrals: 'Système de Parrainage',
    nav_referrals_desc: 'Gestion des filleuls & bonus de commission',
    nav_wallet: 'Portefeuille CHIP',
    nav_wallet_desc: 'Solde personnel & registre des transactions',
    nav_resend: 'Activer / Renvoyer Email',
    nav_resend_desc: 'Vérifier l’adresse email de récompense',
    nav_login: 'Connexion Membre',
    nav_login_desc: 'Accédez à votre compte de fidélité',
    nav_register: 'Créer un Compte',
    nav_register_desc: 'Inscrivez-vous et recevez +5 000 CHIP',

    nav_sys_accounts: 'Gestion des Comptes 4 Niveaux',
    nav_sys_accounts_desc: 'Admin, Assistant, Spécialiste, Utilisateur',
    nav_sys_treasury: 'Grand Livre de Trésorerie',
    nav_sys_treasury_desc: 'Chambre forte de 500M CHIP & allocations',
    nav_sys_tracking: 'Surveillance Outbox',
    nav_sys_tracking_desc: 'File d’attente des événements Transactional Outbox',
    nav_sys_reports: 'Rapports & Statistiques',
    nav_sys_reports_desc: 'Analyse de croissance & export CSV',
    nav_sys_settings: 'Configuration Système',
    nav_sys_settings_desc: 'Paramètres, limites de taux & SMTP',
    nav_sys_login: 'Portail Admin',
    nav_sys_login_desc: 'Authentification du personnel de gestion',

    group_member_center: 'ESPACE MEMBRES',
    group_account_security: 'COMPTE & SÉCURITÉ',
    group_sys_ops: 'OPÉRATIONS & TRÉSORERIE',
    group_sys_monitoring: 'SURVEILLANCE & AUDIT',
    group_sys_config: 'CONFIGURATION SYSTÈME',

    brand_member_title: 'Portail Membres',
    brand_system_title: 'Console Administration',
    btn_login: 'Connexion',
    btn_register: 'Inscription',
    btn_logout: 'Déconnexion',
    btn_system_login: 'Accès Admin',
    role_staff: 'PERSONNEL GESTION',
    balance_label: 'SOLDE DE POINTS',
    tier_label: 'RANG',

    tier_member: 'CHIP MEMBER',
    tier_gold: 'CHIP GOLD',
    tier_platinum: 'CHIP PLATINUM',
    tier_diamond: 'CHIP DIAMOND',
    tier_special: 'CHIP SPECIAL',

    btn_copy: 'Copier',
    btn_copied: 'Copié !',
    btn_claim: 'Réclamer',
    btn_filter: 'Filtrer',
    btn_export_csv: 'Exporter CSV',
    all_time: 'Tout temps',
    time_24h: '24 dernières heures',
    time_7d: '7 derniers jours',
    time_30d: '30 derniers jours',
    search_placeholder: 'Rechercher par email, ID ou nom...',
    status_active: 'Actif',
    status_pending: 'En attente',
    status_verified: 'Vérifié',
    status_unverified: 'Non vérifié',
    footer_copyright: '© 2026 CHIPCOIN. Grand livre comptable en partie double sécurisé.',
  },

  es: {
    nav_overview: 'Resumen Personal',
    nav_overview_desc: 'Panel de acumulación de puntos & tareas',
    nav_activities: 'Actividades de Acumulación',
    nav_activities_desc: 'Check-in diario, misiones & ganar CHIP',
    nav_rank: 'Ascenso de Nivel',
    nav_rank_desc: 'Condiciones de ascenso y seguimiento',
    nav_referrals: 'Sistema de Referidos',
    nav_referrals_desc: 'Gestión de ramas & comisiones CHIP',
    nav_wallet: 'Billetera CHIP',
    nav_wallet_desc: 'Saldo personal & libro contable',
    nav_resend: 'Activar / Reenviar Correo',
    nav_resend_desc: 'Verificar dirección de correo segura',
    nav_login: 'Iniciar Sesión',
    nav_login_desc: 'Entrar a tu cuenta de recompensas',
    nav_register: 'Crear Cuenta',
    nav_register_desc: 'Regístrate y recibe +5,000 CHIP gratis',

    nav_sys_accounts: 'Gestión de Cuentas en 4 Niveles',
    nav_sys_accounts_desc: 'Administrador, Asistente, Especialista, Usuario',
    nav_sys_treasury: 'Libro Mayor de Tesorería',
    nav_sys_treasury_desc: 'Bóveda de 500M CHIP & transferencias de fondo',
    nav_sys_tracking: 'Monitor de Outbox Worker',
    nav_sys_tracking_desc: 'Cola de eventos Transactional Outbox en vivo',
    nav_sys_reports: 'Estadísticas & Reportes',
    nav_sys_reports_desc: 'Análisis de crecimiento & exportación CSV',
    nav_sys_settings: 'Configuración del Sistema',
    nav_sys_settings_desc: 'Parámetros, límites de tasa & SMTP',
    nav_sys_login: 'Portal de Acceso Admin',
    nav_sys_login_desc: 'Autenticación del personal administrativo',

    group_member_center: 'CENTRO DE MIEMBROS',
    group_account_security: 'CUENTA Y SEGURIDAD',
    group_sys_ops: 'OPERACIONES & TESORERÍA',
    group_sys_monitoring: 'MONITOREO & AUDITORÍA',
    group_sys_config: 'CONFIGURACIÓN DEL SISTEMA',

    brand_member_title: 'Portal de Miembros',
    brand_system_title: 'Consola de Administración',
    btn_login: 'Acceder',
    btn_register: 'Registrarse',
    btn_logout: 'Cerrar Sesión',
    btn_system_login: 'Acceso Admin',
    role_staff: 'PERSONAL ADMIN',
    balance_label: 'SALDO DE PUNTOS',
    tier_label: 'NIVEL',

    tier_member: 'CHIP MEMBER',
    tier_gold: 'CHIP GOLD',
    tier_platinum: 'CHIP PLATINUM',
    tier_diamond: 'CHIP DIAMOND',
    tier_special: 'CHIP SPECIAL',

    btn_copy: 'Copiar',
    btn_copied: '¡Copiado!',
    btn_claim: 'Reclamar',
    btn_filter: 'Filtrar',
    btn_export_csv: 'Exportar CSV',
    all_time: 'Todo el tiempo',
    time_24h: 'Últimas 24 horas',
    time_7d: 'Últimos 7 días',
    time_30d: 'Últimos 30 días',
    search_placeholder: 'Buscar por correo, ID o nombre...',
    status_active: 'Activo',
    status_pending: 'Pendiente',
    status_verified: 'Verificado',
    status_unverified: 'Sin verificar',
    footer_copyright: '© 2026 CHIPCOIN. Arquitectura de doble entrada inmutable.',
  },

  ar: {
    nav_overview: 'نظرة عامة شخصية',
    nav_overview_desc: 'لوحة مؤشرات تراكم النقاط والمهام اليومية',
    nav_activities: 'أنشطة التراكم',
    nav_activities_desc: 'تسجيل الحضور اليومي والمهام وربح CHIP',
    nav_rank: 'ترقية الرتب والمستويات',
    nav_rank_desc: 'شروط الترقية ومتابعة التقدم',
    nav_referrals: 'نظام الإحالة',
    nav_referrals_desc: 'إدارة شبكة الإحالة ونسب المكافآت',
    nav_wallet: 'محفظة نقاط CHIP',
    nav_wallet_desc: 'الرصيد الشخصي وسجل العمليات المحاسبية',
    nav_resend: 'تفعيل / إعادة إرسال البريد',
    nav_resend_desc: 'تأكيد البريد الإلكتروني المعتمد لاستلام النقاط',
    nav_login: 'تسجيل دخول الأعضاء',
    nav_login_desc: 'الدخول إلى حساب تجميع النقاط',
    nav_register: 'فتح حساب جديد',
    nav_register_desc: 'إنشاء حساب عضوية والحصول فوراً على +5,000 CHIP',

    nav_sys_accounts: 'إدارة الحسابات 4 مستويات',
    nav_sys_accounts_desc: 'مدير، مساعد، خبير، مستخدم',
    nav_sys_treasury: 'دفتر الأستاذ للخزينة الرئيسية',
    nav_sys_treasury_desc: 'خزينة 500 مليون CHIP وتوزيع المخصصات',
    nav_sys_tracking: 'مراقبة معالج Outbox',
    nav_sys_tracking_desc: 'طابور أحداث Transactional Outbox الفوري',
    nav_sys_reports: 'تقارير وإحصائيات النظام',
    nav_sys_reports_desc: 'تحليلات النمو وتوزيع النقاط وتصدير CSV',
    nav_sys_settings: 'إعدادات النظام الشاملة',
    nav_sys_settings_desc: 'المعايير وحدود الطلبات والجلسات وSMTP',
    nav_sys_login: 'بوابة دخول الإدارة',
    nav_sys_login_desc: 'التحقق الأمني لموظفي إدارة النظام',

    group_member_center: 'مركز الأعضاء',
    group_account_security: 'الحساب والأمان',
    group_sys_ops: 'العمليات والخزينة',
    group_sys_monitoring: 'المراقبة والتدقيق',
    group_sys_config: 'تهيئة النظام',

    brand_member_title: 'بوابة الأعضاء',
    brand_system_title: 'لوحة تحكم النظام',
    btn_login: 'دخول',
    btn_register: 'تسجيل',
    btn_logout: 'تسجيل خروج',
    btn_system_login: 'دخول الإدارة',
    role_staff: 'طاقم الإدارة',
    balance_label: 'رصيد النقاط',
    tier_label: 'الرتبة',

    tier_member: 'CHIP MEMBER',
    tier_gold: 'CHIP GOLD',
    tier_platinum: 'CHIP PLATINUM',
    tier_diamond: 'CHIP DIAMOND',
    tier_special: 'CHIP SPECIAL',

    btn_copy: 'نسخ',
    btn_copied: 'تم النسخ!',
    btn_claim: 'استلام المكافأة',
    btn_filter: 'تصفية',
    btn_export_csv: 'تصدير CSV',
    all_time: 'كل الأوقات',
    time_24h: 'آخر 24 ساعة',
    time_7d: 'آخر 7 أيام',
    time_30d: 'آخر 30 يوماً',
    search_placeholder: 'البحث بالبريد، المعرف أو الاسم...',
    status_active: 'نشط',
    status_pending: 'قيد الانتظار',
    status_verified: 'تم التأكيد',
    status_unverified: 'غير مؤكد',
    footer_copyright: '© 2026 CHIPCOIN. نظام محاسبي مزدوج القيد غير قابل للتعديل.',
  },
};

interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
  isRtl: boolean;
  currentLangMeta: LanguageOption;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('vi');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chipcoin_language') as SupportedLanguage;
      if (saved && ['vi', 'en', 'zh', 'fr', 'es', 'ar'].includes(saved)) {
        setLanguageState(saved);
      }
    } catch (e) {}
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('chipcoin_language', lang);
      const isRtl = lang === 'ar';
      if (typeof document !== 'undefined') {
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const dict = DICTIONARIES[language] || DICTIONARIES.vi;
    if (dict[key]) return dict[key];
    const fallbackDict = DICTIONARIES.en || DICTIONARIES.vi;
    return fallbackDict[key] || fallback || key;
  };

  const isRtl = language === 'ar';
  const currentLangMeta = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRtl,
        currentLangMeta,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      language: 'vi' as SupportedLanguage,
      setLanguage: () => {},
      t: (k: string, fb?: string) => fb || k,
      isRtl: false,
      currentLangMeta: LANGUAGES[0],
    };
  }
  return ctx;
}
