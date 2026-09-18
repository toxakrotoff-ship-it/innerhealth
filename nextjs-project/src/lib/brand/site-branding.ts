import type { BrandId } from '@/lib/brand/brand';

export interface BrandNavLink {
  label: string;
  href: string;
  /** Мобильное меню: показать разделитель перед этим пунктом (визуально отделяет группу). */
  dividerBefore?: boolean;
}

/** Группа ссылок, собранных в выпадающее меню в десктоп-шапке (чтобы не плодить пункты в один ряд). */
export interface BrandNavDropdown {
  type: 'dropdown';
  label: string;
  items: readonly BrandNavLink[];
}

export type BrandNavEntry = BrandNavLink | BrandNavDropdown;

export interface BrandContactConfig {
  phone: string;
  email: string;
}

export interface BrandFooterColumn {
  title: string;
  links: readonly BrandNavLink[];
}

export interface BrandSiteConfig {
  id: BrandId;
  title: string;
  logoText: string;
  navLinks: readonly BrandNavEntry[];
  mobileNavLinks: readonly BrandNavLink[];
  /** Подвал: набор колонок ссылок (без учёта колонки бренда и юридических ссылок — те рендерятся отдельно). */
  footerColumns: readonly BrandFooterColumn[];
  contact: BrandContactConfig;
}

const DEFAULT_INNER_SITE_URL = 'https://innerhealth.ru';
const DEFAULT_SPRINT_SITE_URL = 'https://sprintpower.ru';

export const sharedFooterLegalLinks: readonly BrandNavLink[] = [
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
      { label: 'Акции', href: '/catalog/aktsii' },
      { label: 'О нас', href: '/o-nas' },
      { label: 'Доставка и оплата', href: '/faq' },
      { label: 'Вопросы и ответы', href: '/faq' },
      { label: 'Контакты', href: '/contacts' },
      {
        type: 'dropdown',
        label: 'Сотрудничество',
        items: [
          { label: 'Специалистам', href: '/sotrudnichestvo' },
          { label: 'Оптовым партнёрам', href: '/b2b' },
        ],
      },
    ],
    mobileNavLinks: [
      { label: 'Каталог', href: '/catalog' },
      { label: 'Акции', href: '/catalog/aktsii' },
      { label: 'О нас', href: '/o-nas' },
      { label: 'Доставка и оплата', href: '/faq' },
      { label: 'Вопросы и ответы', href: '/faq' },
      { label: 'Контакты', href: '/contacts' },
      { label: 'Специалистам', href: '/sotrudnichestvo', dividerBefore: true },
      { label: 'Оптовым партнёрам', href: '/b2b' },
    ],
    footerColumns: [
      {
        title: 'Покупателям',
        links: [
          { label: 'Каталог', href: '/catalog' },
          { label: 'Доставка и оплата', href: '/faq' },
          { label: 'Вопросы и ответы', href: '/faq' },
          { label: 'Новости', href: '/news' },
          { label: 'Отзывы', href: '/otzyvy' },
          { label: 'Контакты', href: '/contacts' },
        ],
      },
      {
        title: 'О бренде',
        links: [
          { label: 'О нас', href: '/o-nas' },
          { label: 'Партнёрские проекты', href: '/#partners-heading' },
        ],
      },
      {
        title: 'Сотрудничество',
        links: [
          { label: 'Специалистам', href: '/sotrudnichestvo' },
          { label: 'Оптовым партнёрам', href: '/b2b' },
        ],
      },
    ],
    contact: {
      phone: '+7 (989) 103-91-92',
      email: 'innerhealth@mail.ru',
    },
  },
  'sprint-power': {
    id: 'sprint-power',
    title: 'Sprint Power',
    logoText: 'SPRINT POWER',
    navLinks: [
      { label: 'Каталог', href: '/catalog' },
      { label: 'Новости', href: '/news' },
      { label: 'О нас', href: '/o-nas' },
      { label: 'Акции', href: '/catalog/sale' },
      { label: 'Статьи', href: '/informaciya' },
      { label: 'B2B', href: '/b2b' },
      { label: 'Партнерство', href: '/sotrudnichestvo' },
      { label: 'Отзывы', href: '/otzyvy' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Контакты', href: '/contacts' },
    ],
    mobileNavLinks: [
      { label: 'Каталог', href: '/catalog' },
      { label: 'Новости', href: '/news' },
      { label: 'О нас', href: '/o-nas' },
      { label: 'Акции', href: '/catalog/sale' },
      { label: 'Статьи', href: '/informaciya' },
      { label: 'B2B', href: '/b2b' },
      { label: 'Отзывы', href: '/otzyvy' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Контакты', href: '/contacts' },
      { label: 'Партнерство', href: '/sotrudnichestvo' },
    ],
    footerColumns: [
      {
        title: 'Информация',
        links: [
          { label: 'Каталог', href: '/catalog' },
          { label: 'Хиты продаж', href: '/catalog?sort=newest' },
          { label: 'Отзывы', href: '/otzyvy' },
        ],
      },
      {
        title: 'Покупателям',
        links: [
          { label: 'FAQ', href: '/faq' },
          { label: 'Контакты', href: '/contacts' },
          { label: 'Партнерство', href: '/sotrudnichestvo' },
          { label: 'О бренде', href: '/o-nas' },
        ],
      },
    ],
    contact: {
      phone: '+7 (989) 103-91-92',
      email: 'sprintpower@mail.ru',
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
