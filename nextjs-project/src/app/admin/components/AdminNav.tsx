'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAdminBasePath } from '@/app/admin/context/admin-base-path'
import { useCallback, useMemo, useState } from 'react'

const iconClass = 'admin-nav-icon'

const icons = {
  catalog: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  categories: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  news: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
    </svg>
  ),
  promo: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  ),
  stats: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  orders: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  settings: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  users: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  profile: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  partnership: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
  tilda: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  reviews: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  ),
  redirects: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  faq: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75h6.75m-6.75 3h4.5m-8.625 6A2.625 2.625 0 012.625 16.125V5.25A2.625 2.625 0 015.25 2.625h13.5A2.625 2.625 0 0121.375 5.25v10.875a2.625 2.625 0 01-2.625 2.625H9.375l-3.75 2.625V18.75z" />
    </svg>
  ),
  leadsExport: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  content: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 6.75h15M4.5 12h15M4.5 17.25h9"
      />
    </svg>
  ),
  chevronDown: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  ),
  chevronRight: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  ),
}

interface NavItemEntry {
  path: string
  label: string
  icon: React.ReactNode
}

interface NavGroupEntry {
  path: string
  label: string
  icon: React.ReactNode
  children: NavItemEntry[]
}

type NavEntry = NavItemEntry | NavGroupEntry

function isNavGroup(entry: NavEntry): entry is NavGroupEntry {
  return 'children' in entry && Array.isArray((entry as NavGroupEntry).children)
}

const crmChildren: NavItemEntry[] = [
  { path: 'orders', label: 'Заказы (CRM)', icon: icons.orders },
  { path: 'quick-orders', label: 'Быстрые заявки', icon: icons.orders },
  { path: 'tilda-leads', label: 'Заявки с Тильды', icon: icons.tilda },
  { path: 'partnership', label: 'Сотрудничество', icon: icons.partnership },
  { path: 'leads-export', label: 'Выгрузка лидов', icon: icons.leadsExport },
  { path: 'orders-statistics', label: 'Статистика заказов', icon: icons.stats },
]

const settingsChildren: NavItemEntry[] = [
  { path: 'settings', label: 'API и интеграции', icon: icons.settings },
  { path: 'content', label: 'Тексты страниц', icon: icons.content },
  { path: 'faq', label: 'FAQ', icon: icons.faq },
  { path: 'redirects', label: 'Редиректы', icon: icons.redirects },
]

const catalogEditChildren: NavItemEntry[] = [
  { path: 'catalog', label: 'Каталог товаров', icon: icons.catalog },
  { path: 'catalog/categories', label: 'Категории', icon: icons.categories },
  { path: 'gift-promotions', label: 'Подарочные акции', icon: icons.promo },
]

const navConfig: NavEntry[] = [
  // 1. Главная / обзор
  { path: '', label: 'Статистика сайта', icon: icons.stats },

  // 2. Операционные разделы
  {
    path: 'crm',
    label: 'CRM / Заявки и заказы',
    icon: icons.orders,
    children: crmChildren,
  },
  {
    path: 'catalog-edit',
    label: 'Редактирование товаров',
    icon: icons.catalog,
    children: catalogEditChildren,
  },

  // 3. Контент и маркетинг
  { path: 'news', label: 'Новости', icon: icons.news },
  { path: 'news?type=article', label: 'Статьи', icon: icons.news },
  { path: 'promo-codes', label: 'Промокоды', icon: icons.promo },
  { path: 'reviews', label: 'Модерация отзывов', icon: icons.reviews },

  // 4. Субъекты
  { path: 'users', label: 'Пользователи', icon: icons.users },
  { path: 'partners', label: 'Партнёры', icon: icons.partnership },

  // 5. Настройки и профиль
  {
    path: 'settings',
    label: 'Настройки',
    icon: icons.settings,
    children: settingsChildren,
  },
  { path: 'profile', label: 'Профиль', icon: icons.profile },
]

function getItemIsActive(
  itemPath: string,
  pathname: string,
  searchParams: URLSearchParams,
  base: string
): boolean {
  const prefix = `/${base}/`
  if (itemPath === '') {
    return pathname === `/${base}` || pathname === `/${base}/`
  }
  if (itemPath === 'news?type=article') {
    return pathname.startsWith(`${prefix}news`) && searchParams.get('type') === 'article'
  }
  if (itemPath === 'news') {
    return pathname.startsWith(`${prefix}news`) && searchParams.get('type') !== 'article'
  }
  if (itemPath === 'catalog') {
    if (pathname === `${prefix}catalog`) return true
    if (!pathname.startsWith(`${prefix}catalog/`)) return false
    const afterCatalog = pathname.slice(`${prefix}catalog/`.length)
    return !afterCatalog.startsWith('categories')
  }
  if (itemPath === 'partners') {
    return pathname === `${prefix}partners` || pathname.startsWith(`${prefix}partners/`)
  }
  if (itemPath === 'reviews') return pathname === `${prefix}reviews`
  if (itemPath === 'redirects') return pathname === `${prefix}redirects`
  if (itemPath === 'faq') return pathname === `${prefix}faq`
  if (itemPath === 'leads-export') return pathname === `${prefix}leads-export`
  if (itemPath === 'quick-orders') return pathname === `${prefix}quick-orders`
  if (itemPath === 'content') return pathname === `${prefix}content`
  if (itemPath === 'settings') return pathname === `${prefix}settings`
  return pathname === `${prefix}${itemPath}`
}

export default function AdminNav() {
  const base = useAdminBasePath()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean | null>>({})

  const toggleGroup = useCallback((groupPath: string, expandedByRoute: boolean) => {
    setExpandedGroups((prev) => {
      const current = prev[groupPath]
      const nextBase = current ?? expandedByRoute
      return {
        ...prev,
        [groupPath]: !nextBase,
      }
    })
  }, [])

  return (
    <ul className="admin-nav-list">
      {navConfig.map((entry) => {
        if (isNavGroup(entry)) {
          const href = `/${base}/${entry.path}`
          const childrenActive = entry.children.some((child) =>
            getItemIsActive(child.path, pathname, searchParams, base)
          )
          const isActive = pathname === href || childrenActive
          const expandedByRoute = childrenActive
          const expandedManual = expandedGroups[entry.path]
          const expanded = expandedManual ?? expandedByRoute
          return (
            <li key={entry.path}>
              <div
                className={`admin-nav-item admin-nav-group-trigger admin-nav-group-expandable ${isActive ? 'admin-nav-item-active' : ''}`}
              >
                <Link href={href} className="admin-nav-group-link" aria-label={`${entry.label}, открыть подменю`}>
                  {entry.icon}
                  <span>{entry.label}</span>
                </Link>
                <button
                  type="button"
                  className="admin-nav-group-chevron"
                  onClick={() => toggleGroup(entry.path, expandedByRoute)}
                  aria-expanded={expanded}
                  aria-label={expanded ? 'Свернуть' : 'Развернуть'}
                >
                  {expanded ? icons.chevronDown : icons.chevronRight}
                </button>
              </div>
              {expanded && (
                <ul className="admin-nav-list admin-nav-sublist">
                  {entry.children.map((child) => {
                    const childHref = `/${base}/${child.path}`
                    const childActive = getItemIsActive(child.path, pathname, searchParams, base)
                    return (
                      <li key={child.path}>
                        <Link
                          href={childHref}
                          className={`admin-nav-item admin-nav-subitem ${childActive ? 'admin-nav-item-active' : ''}`}
                        >
                          {child.icon}
                          <span>{child.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        }

        const href = entry.path === '' ? `/${base}` : `/${base}/${entry.path}`
        const isActive = getItemIsActive(entry.path, pathname, searchParams, base)
        return (
          <li key={entry.path || 'dashboard'}>
            <Link
              href={href}
              className={`admin-nav-item ${isActive ? 'admin-nav-item-active' : ''}`}
            >
              {entry.icon}
              <span>{entry.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
