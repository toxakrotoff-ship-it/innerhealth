import type { BrandId } from '@/lib/brand/brand';

export interface BrandNavLink {
  label: string;
  href: string;
}

export interface BrandContactConfig {
  phone: string;
  email: string;
  whatsappUrl: string;
  telegramUrl: string;
}

export interface BrandSiteConfig {
  id: BrandId;
  title: string;
  logoText: string;
  navLinks: readonly BrandNavLink[];
  mobileNavLinks: readonly BrandNavLink[];
  footerLinks: readonly BrandNavLink[];
  contact: BrandContactConfig;
}

const DEFAULT_INNER_SITE_URL = 'https://innerhealth.ru';
const DEFAULT_SPRINT_SITE_URL = 'https://sprint-power.ru';

const sharedFooterLegalLinks: readonly BrandNavLink[] = [
  { label: 'Политика конфиденциальности', href: '/privacy' },
  { label: 'Публичная оферта', href: '/oferta' },
];

const BRAND_SITE_CONFIGS: Record<BrandId, BrandSiteConfig> = {
  inner: {
    id: 'inner',
    title: 'Inner Health',
    logoText: 'INNER HEALTH',
    navLinks: [
      { label: 'Каталог', href: '/catalog' },
      { label: 'Новости', href: '/#news' },
      { label: 'О нас', href: '/o-nas' },
      { label: 'Акции', href: '/catalog/aktsii' },
      { label: 'Статьи', href: '/informaciya' },
      { label: 'Контакты', href: '/contacts' },
    ],
    mobileNavLinks: [
      { label: 'Каталог', href: '/catalog' },
      { label: 'Новости', href: '/#news' },
      { label: 'О нас', href: '/o-nas' },
      { label: 'Статьи', href: '/informaciya' },
      { label: 'АКЦИИ', href: '/catalog/aktsii' },
      { label: 'Сотрудничество', href: '/sotrudnichestvo' },
      { label: 'Контакты', href: '/contacts' },
      { label: 'FAQ', href: '/faq' },
    ],
    footerLinks: [
      { label: 'О нас', href: '/o-nas' },
      { label: 'Контакты', href: '/contacts' },
      { label: 'Сотрудничество', href: '/sotrudnichestvo' },
      { label: 'Отзывы', href: '/otzyvy' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Информация', href: '/informaciya' },
      ...sharedFooterLegalLinks,
    ],
    contact: {
      phone: '+7 (989) 103-91-92',
      email: 'innerhealth@mail.ru',
      whatsappUrl: 'https://wa.me/79891039192',
      telegramUrl: 'https://t.me/innerhealth_ih',
    },
  },
  'sprint-power': {
    id: 'sprint-power',
    title: 'Sprint Power',
    logoText: 'SPRINT POWER',
    navLinks: [
      { label: 'Каталог', href: '/catalog' },
      { label: 'Отзывы', href: '/otzyvy' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Контакты', href: '/contacts' },
    ],
    mobileNavLinks: [
      { label: 'Каталог', href: '/catalog' },
      { label: 'Отзывы', href: '/otzyvy' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Контакты', href: '/contacts' },
      { label: 'Партнерство', href: '/sotrudnichestvo' },
    ],
    footerLinks: [
      { label: 'Каталог', href: '/catalog' },
      { label: 'Хиты продаж', href: '/catalog?sort=newest' },
      { label: 'Отзывы', href: '/otzyvy' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Контакты', href: '/contacts' },
      { label: 'Партнерство', href: '/sotrudnichestvo' },
      { label: 'О бренде', href: '/o-nas' },
      ...sharedFooterLegalLinks,
    ],
    contact: {
      phone: '+7 (989) 103-91-92',
      email: 'sprintpower@mail.ru',
      whatsappUrl: 'https://wa.me/79891039192',
      telegramUrl: 'https://t.me/sprintpower_official',
    },
  },
};

export function getBrandSiteConfig(brandId: BrandId): BrandSiteConfig {
  return BRAND_SITE_CONFIGS[brandId];
}

export function getBrandSiteUrl(brandId: BrandId): string {
  if (brandId === 'sprint-power')
    return process.env.NEXT_PUBLIC_SPRINT_POWER_SITE_URL ?? DEFAULT_SPRINT_SITE_URL;
  return process.env.NEXT_PUBLIC_INNER_SITE_URL ?? DEFAULT_INNER_SITE_URL;
}

