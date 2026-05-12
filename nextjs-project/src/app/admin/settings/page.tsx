'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/button';
import { ModalLayer } from '@/components/ui/modal-layer';
import {
  CDEK_TARIFF_CODE_TO_DESCRIPTION,
  CDEK_TARIFF_CODES_ADDRESS,
  CDEK_TARIFF_CODES_PVZ,
} from '@/lib/cdek-tariff-codes';

interface AdminMailbox {
  id: string;
  email: string;
  name: string;
  notificationEmail: string | null;
}

interface AdminTelegram {
  id: string;
  email: string;
  name: string;
  telegramUserId: string | null;
  linkedAt: string | null;
  infraAlertsEnabled: boolean;
}

interface AdminMax {
  id: string;
  email: string;
  name: string;
  maxUserId: string | null;
  linkedAt: string | null;
  infraAlertsEnabled: boolean;
}

type BotSettingsMode = 'telegram' | 'max';
type SettingsScope = 'global' | 'inner' | 'sprint-power';

/** Коды НДС для чеков 54-ФЗ (справочник ЮKassa). */
const VAT_CODE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '1', label: 'Без НДС' },
  { value: '2', label: 'НДС 0%' },
  { value: '3', label: 'НДС 10%' },
  { value: '4', label: 'НДС 20%' },
  { value: '5', label: 'НДС 10/110' },
  { value: '6', label: 'НДС 20/120' },
  { value: '7', label: 'НДС 5%' },
  { value: '8', label: 'НДС 7%' },
  { value: '9', label: 'НДС 5/105' },
  { value: '10', label: 'НДС 7/107' },
  { value: '11', label: 'НДС 22%' },
  { value: '12', label: 'НДС 22/122' },
];

const CDEK_TARIFF_CODE_OPTIONS_PVZ: Array<{ value: string; label: string }> = [
  { value: '', label: 'Авто (первый подходящий)' },
  ...CDEK_TARIFF_CODES_PVZ.map((code) => {
    const desc = CDEK_TARIFF_CODE_TO_DESCRIPTION[code]
    return { value: String(code), label: desc ? `${code} - ${desc}` : String(code) }
  }),
]

const CDEK_TARIFF_CODE_OPTIONS_ADDRESS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Авто (первый подходящий)' },
  ...CDEK_TARIFF_CODES_ADDRESS.map((code) => {
    const desc = CDEK_TARIFF_CODE_TO_DESCRIPTION[code]
    return { value: String(code), label: desc ? `${code} - ${desc}` : String(code) }
  }),
]

const FIELDS: Array<{
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'textarea';
  placeholder?: string;
  group: 'cdek' | 'yookassa' | 'site' | 'telegram';
  options?: Array<{ value: string; label: string }>;
}> = [
  { key: 'telegram_bot_token', label: 'Токен Telegram-бота', type: 'password', placeholder: '••••••••', group: 'telegram' },
  { key: 'max_bot_token', label: 'Токен MAX-бота', type: 'password', placeholder: '••••••••', group: 'telegram' },
  {
    key: 'max_bot_mode',
    label: 'Режим MAX-бота (polling | webhook)',
    type: 'text',
    placeholder: 'polling',
    group: 'telegram',
  },
  {
    key: 'max_bot_webhook_url',
    label: 'Webhook URL MAX-бота',
    type: 'text',
    placeholder: 'https://example.com/api/webhooks/max',
    group: 'telegram',
  },
  {
    key: 'max_bot_webhook_secret',
    label: 'Webhook secret MAX-бота',
    type: 'password',
    placeholder: '••••••••',
    group: 'telegram',
  },
  { key: 'cdek_api_key', label: 'API-ключ СДЭК (Client ID)', type: 'password', placeholder: '••••••••', group: 'cdek' },
  { key: 'cdek_client_secret', label: 'Секрет СДЭК (Client Secret)', type: 'password', placeholder: '••••••••', group: 'cdek' },
  {
    key: 'cdek_use_test',
    label: 'СДЭК: режим API (prod | test)',
    type: 'select',
    group: 'cdek',
    options: [
      { value: '0', label: 'prod (боевой контур)' },
      { value: '1', label: 'test (api.edu.cdek.ru)' },
    ],
  },
  { key: 'cdek_sender_name', label: 'Имя отправителя (СДЭК)', type: 'text', placeholder: 'Название компании или ФИО', group: 'cdek' },
  { key: 'cdek_sender_phone', label: 'Телефон отправителя (СДЭК)', type: 'text', placeholder: '+7 (999) 123-45-67', group: 'cdek' },
  { key: 'cdek_sender_address', label: 'Адрес отправителя (СДЭК)', type: 'text', placeholder: 'Город, улица, дом', group: 'cdek' },
  { key: 'cdek_from_pvz_code', label: 'Код ПВЗ отправки СДЭК', type: 'text', placeholder: 'MSK123', group: 'cdek' },
  { key: 'cdek_from_city_code', label: 'Код города отправления СДЭК', type: 'text', placeholder: '44', group: 'cdek' },
  { key: 'cdek_default_package_weight_g', label: 'Дефолтный вес посылки (СДЭК), г', type: 'text', placeholder: '100', group: 'cdek' },
  { key: 'cdek_default_package_length_mm', label: 'Дефолтная длина посылки (СДЭК), мм', type: 'text', placeholder: '33', group: 'cdek' },
  { key: 'cdek_default_package_width_mm', label: 'Дефолтная ширина посылки (СДЭК), мм', type: 'text', placeholder: '25', group: 'cdek' },
  { key: 'cdek_default_package_height_mm', label: 'Дефолтная высота посылки (СДЭК), мм', type: 'text', placeholder: '15', group: 'cdek' },
  {
    key: 'cdek_preferred_tariff_code_pvz',
    label: 'Предпочитаемый тариф СДЭК (ПВЗ) — tariff_code',
    type: 'select',
    group: 'cdek',
    options: CDEK_TARIFF_CODE_OPTIONS_PVZ,
  },
  {
    key: 'cdek_preferred_tariff_code_address',
    label: 'Предпочитаемый тариф СДЭК (до двери) — tariff_code',
    type: 'select',
    group: 'cdek',
    options: CDEK_TARIFF_CODE_OPTIONS_ADDRESS,
  },
  { key: 'yookassa_shop_id', label: 'Shop ID ЮKassa', type: 'text', placeholder: 'Идентификатор магазина', group: 'yookassa' },
  { key: 'yookassa_secret_key', label: 'Секретный ключ ЮKassa', type: 'password', placeholder: '••••••••', group: 'yookassa' },
  { key: 'yookassa_term_id', label: 'Term ID ЮKassa (терминал)', type: 'text', placeholder: 'ID терминала при необходимости', group: 'yookassa' },
  { key: 'yookassa_receipt_vat_code', label: 'НДС чека (товары)', type: 'select', group: 'yookassa', options: VAT_CODE_OPTIONS },
  { key: 'yookassa_receipt_vat_code_delivery', label: 'НДС чека (доставка)', type: 'select', group: 'yookassa', options: VAT_CODE_OPTIONS },
  { key: 'site_name', label: 'Название сайта', type: 'text', placeholder: 'Inner Health', group: 'site' },
  { key: 'site_contact_email', label: 'Email для связи', type: 'text', placeholder: 'info@example.com', group: 'site' },
  { key: 'default_currency', label: 'Валюта по умолчанию', type: 'text', placeholder: 'RUB', group: 'site' },
  { key: 'schema_org_enabled', label: 'Включить schema.org (1 = да)', type: 'text', placeholder: '1', group: 'site' },
  { key: 'schema_org_organization_type', label: 'Тип организации (Organization, LocalBusiness...)', type: 'text', placeholder: 'Organization', group: 'site' },
  { key: 'schema_org_legal_name', label: 'Юридическое название для schema.org', type: 'text', group: 'site' },
  { key: 'schema_org_url', label: 'URL сайта (канонический)', type: 'text', placeholder: 'https://innerhealth.ru', group: 'site' },
  { key: 'schema_org_logo_url', label: 'URL логотипа (абсолютный)', type: 'text', group: 'site' },
  { key: 'schema_org_phone', label: 'Телефон для schema.org', type: 'text', group: 'site' },
  { key: 'schema_org_address', label: 'Адрес (одной строкой)', type: 'text', group: 'site' },
  { key: 'schema_org_social_links', label: 'Ссылки для sameAs (через запятую)', type: 'text', group: 'site' },
];

const BOT_MODE_FIELDS: Record<BotSettingsMode, string[]> = {
  telegram: ['telegram_bot_token'],
  max: ['max_bot_token', 'max_bot_mode', 'max_bot_webhook_url', 'max_bot_webhook_secret'],
};

const GROUPS: Array<{ id: 'cdek' | 'yookassa' | 'site' | 'telegram'; title: string }> = [
  { id: 'telegram', title: 'Боты и каналы уведомлений' },
  { id: 'cdek', title: 'Доставка (СДЭК)' },
  { id: 'yookassa', title: 'Оплата (ЮKassa)' },
  { id: 'site', title: 'Общие настройки сайта' },
];

export default function AdminSettingsPage() {
  const pathname = usePathname();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [admins, setAdmins] = useState<AdminMailbox[] | null>(null);
  const [telegramList, setTelegramList] = useState<AdminTelegram[] | null>(null);
  const [maxList, setMaxList] = useState<AdminMax[] | null>(null);
  const [mailboxEdit, setMailboxEdit] = useState<Record<string, string>>({});
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [unlinkingTelegramUserId, setUnlinkingTelegramUserId] = useState<string | null>(null);
  const [unlinkingMaxUserId, setUnlinkingMaxUserId] = useState<string | null>(null);
  const [updatingInfraAlertsUserId, setUpdatingInfraAlertsUserId] = useState<string | null>(null);
  const [twoFactorStatus, setTwoFactorStatus] = useState<{
    twoFactorEnabled: boolean;
    twoFactorMethod: string | null;
  } | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [yookassaCheckLoading, setYookassaCheckLoading] = useState(false);
  const [yookassaCheckResult, setYookassaCheckResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [cdekCheckLoading, setCdekCheckLoading] = useState(false);
  const [cdekCheckResult, setCdekCheckResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [showCdekModal, setShowCdekModal] = useState(false);
  const [activeBotMode, setActiveBotMode] = useState<BotSettingsMode>('telegram');
  const [savingBotMode, setSavingBotMode] = useState<BotSettingsMode | null>(null);
  const [registeringMaxWebhook, setRegisteringMaxWebhook] = useState(false);
  const [maxWebhookRegisterResult, setMaxWebhookRegisterResult] = useState<{
    ok: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [checkingMaxWebhookStatus, setCheckingMaxWebhookStatus] = useState(false);
  const [maxWebhookStatusResult, setMaxWebhookStatusResult] = useState<{
    ok: boolean;
    error?: string;
    url?: string;
    updateTypes?: string[];
  } | null>(null);
  const [settingsScope, setSettingsScope] = useState<SettingsScope>('global');
  const [cdekTariffCodeToDescriptionApi, setCdekTariffCodeToDescriptionApi] = useState<
    Record<number, string>
  >(CDEK_TARIFF_CODE_TO_DESCRIPTION)
  const [cdekTariffsLoading, setCdekTariffsLoading] = useState(false)
  const [cdekTariffsError, setCdekTariffsError] = useState<string | null>(null)

  const scopeLabelMap: Record<SettingsScope, string> = {
    global: 'Global',
    inner: 'Inner Health',
    'sprint-power': 'Sprint Power',
  };

  const resolveScopeFromPathname = (value: string): SettingsScope => {
    if (value.includes('/admin/') || value.includes('/admin-panel/')) {
      if (value.includes('/inner')) return 'inner';
      if (value.includes('/sprint-power')) return 'sprint-power';
    }
    return 'global';
  };

  function buildSettingsEndpoint(): string {
    if (settingsScope === 'global') return '/api/admin/settings';
    return `/api/admin/settings?brand=${encodeURIComponent(settingsScope)}`;
  }

  function buildScopedAdminEndpoint(basePath: string): string {
    if (settingsScope === 'global') return basePath;
    return `${basePath}?brand=${encodeURIComponent(settingsScope)}`;
  }

  function buildScopedCheckEndpoint(basePath: '/api/admin/check-cdek' | '/api/admin/check-yookassa'): string {
    return buildScopedAdminEndpoint(basePath);
  }

  useEffect(() => {
    setSettingsScope(resolveScopeFromPathname(pathname));
  }, [pathname]);

  useEffect(() => {
    loadSettings();
    loadAdmins();
    loadTelegram();
    loadMax();
    load2FAStatus();
  }, [settingsScope]);

  const parsePositiveIntOrNull = (raw: string | undefined): number | null => {
    const trimmed = raw?.trim()
    if (!trimmed) return null
    const parsed = Number.parseInt(trimmed, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  const buildTariffOptions = (codes: number[], map: Record<number, string>): Array<{ value: string; label: string }> => [
    { value: '', label: 'Авто (первый подходящий)' },
    ...codes.map((code) => {
      const desc = map[code]
      return { value: String(code), label: desc ? `${code} - ${desc}` : String(code) }
    }),
  ]

  const fromCityCodeValue = values.cdek_from_city_code

  useEffect(() => {
    if (!showCdekModal) return
    if (cdekTariffsLoading) return

    const run = async () => {
      try {
        setCdekTariffsLoading(true)
        setCdekTariffsError(null)

        const toCityCode = parsePositiveIntOrNull(fromCityCodeValue)
        const brandQuery = settingsScope !== 'global' ? `brand=${encodeURIComponent(settingsScope)}` : ''
        const toQuery = toCityCode != null ? `toCityCode=${encodeURIComponent(String(toCityCode))}` : ''
        const queryParts = [brandQuery, toQuery].filter(Boolean)
        const url = `/api/admin/cdek/tariffs${queryParts.length ? `?${queryParts.join('&')}` : ''}`

        const res = await fetch(url)
        const data = (await res.json()) as {
          source?: string
          pvz?: Record<number, string>
          address?: Record<number, string>
          error?: string
        }

        // На этом уровне нам нужен единый map для обоих select'ов.
        setCdekTariffCodeToDescriptionApi({
          ...CDEK_TARIFF_CODE_TO_DESCRIPTION,
          ...(data.pvz ?? {}),
          ...(data.address ?? {}),
        })
      } catch (e) {
        setCdekTariffsError(e instanceof Error ? e.message : String(e))
      } finally {
        setCdekTariffsLoading(false)
      }
    }

    void run()
  }, [showCdekModal, settingsScope, fromCityCodeValue])

  async function load2FAStatus() {
    try {
      const res = await fetch('/api/auth/2fa/setup');
      if (res.ok) {
        const data = await res.json();
        setTwoFactorStatus({
          twoFactorEnabled: data.twoFactorEnabled ?? false,
          twoFactorMethod: data.twoFactorMethod ?? null,
        });
      } else {
        setTwoFactorStatus(null);
      }
    } catch {
      setTwoFactorStatus(null);
    }
  }

  async function loadAdmins() {
    try {
      const res = await fetch('/api/admin/settings/admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch {
      setAdmins(null);
    }
  }

  async function loadTelegram() {
    try {
      const res = await fetch(buildScopedAdminEndpoint('/api/admin/settings/telegram'));
      if (res.ok) {
        const data = await res.json();
        setTelegramList(data);
      }
    } catch {
      setTelegramList(null);
    }
  }

  async function loadMax() {
    try {
      const res = await fetch(buildScopedAdminEndpoint('/api/admin/settings/max'));
      if (res.ok) {
        const data = await res.json();
        setMaxList(data);
      }
    } catch {
      setMaxList(null);
    }
  }

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildSettingsEndpoint());
      if (!res.ok) throw new Error('Не удалось загрузить настройки');
      const data = await res.json();
      setValues(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      const res = await fetch(buildSettingsEndpoint(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось сохранить настройки');
      }
      const data = await res.json();
      setValues(data);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  }

  async function saveBotModeSettings(mode: BotSettingsMode) {
    try {
      setSavingBotMode(mode);
      setError(null);
      setSuccess(false);
      const payload: Record<string, string> = {};
      for (const key of BOT_MODE_FIELDS[mode]) {
        payload[key] = values[key] ?? '';
      }
      const res = await fetch(buildSettingsEndpoint(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось сохранить настройки канала');
      }
      const data = await res.json();
      setValues((prev) => ({ ...prev, ...data }));
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSavingBotMode(null);
    }
  }

  function updateValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <p className="text-gray-500">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Настройки сайта</h1>
        <p className="text-gray-500 mb-6">
          API-ключи и параметры доставки и оплаты. Для оплаты корзины используются Shop ID и секретный ключ ЮKassa из этого раздела; чек 54-ФЗ формируется с выбранными ставками НДС для товаров и доставки. Секретные значения хранятся в базе и не отображаются после сохранения.
        </p>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {(Object.keys(scopeLabelMap) as SettingsScope[]).map((scope) => (
            <Button
              key={scope}
              type="button"
              variant={settingsScope === scope ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSettingsScope(scope)}
            >
              {scopeLabelMap[scope]}
            </Button>
          ))}
          <span className="text-xs text-gray-500">
            Режим: {scopeLabelMap[settingsScope]}
          </span>
          {settingsScope !== 'global' ? (
            <p className="w-full text-xs text-gray-600">
              Для этой витрины блоки <strong>ЮKassa</strong> и <strong>СДЭК</strong> сохраняются отдельно. Пустое поле у бренда — берётся значение из вкладки <strong>Global</strong>.
            </p>
          ) : null}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 text-sm">
            Настройки сохранены.
          </div>
        )}

        <form id="admin-settings-form" onSubmit={handleSubmit} className="space-y-8">
          {GROUPS.map((group) => (
            <div key={group.id} className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{group.title}</h2>
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {group.id === 'cdek' ? (
                  <div className="col-span-full">
                    <p className="text-sm text-gray-600 mb-3">
                      Все настройки СДЭК скрыты под модальным окном (чтобы админка была компактнее).
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowCdekModal(true)}>
                      Открыть настройки СДЭК
                    </Button>
                  </div>
                ) : (
                  (group.id === 'telegram'
                    ? FIELDS.filter((f) => f.group === group.id).filter((field) =>
                        BOT_MODE_FIELDS[activeBotMode].includes(field.key)
                      )
                    : FIELDS.filter((f) => f.group === group.id)
                  ).map((field) => (
                    <div key={field.key}>
                      <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      {field.type === 'select' && field.options ? (
                        <select
                          id={field.key}
                          className="form-input w-full"
                          value={
                            values[field.key] ??
                            (field.key === 'yookassa_receipt_vat_code' || field.key === 'yookassa_receipt_vat_code_delivery'
                              ? '1'
                              : '')
                          }
                          onChange={(e) => updateValue(field.key, e.target.value)}
                        >
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          id={field.key}
                          className="form-input w-full min-h-[120px] font-mono text-xs"
                          placeholder={field.placeholder}
                          value={values[field.key] ?? ''}
                          onChange={(e) => updateValue(field.key, e.target.value)}
                        />
                      ) : (
                        <input
                          id={field.key}
                          type={field.type}
                          className="form-input w-full"
                          placeholder={field.placeholder}
                          value={values[field.key] ?? ''}
                          onChange={(e) => updateValue(field.key, e.target.value)}
                          autoComplete="off"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
              {group.id === 'telegram' && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={activeBotMode === 'telegram' ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setActiveBotMode('telegram')}
                    >
                      Режим Telegram
                    </Button>
                    <Button
                      type="button"
                      variant={activeBotMode === 'max' ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setActiveBotMode('max')}
                    >
                      Режим MAX
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveBotModeSettings(activeBotMode)}
                      disabled={savingBotMode !== null}
                    >
                      {savingBotMode === activeBotMode
                        ? 'Сохранение…'
                        : activeBotMode === 'telegram'
                          ? 'Сохранить настройки Telegram'
                          : 'Сохранить настройки MAX'}
                    </Button>
                    <p className="text-xs text-gray-500">
                      Сохраняет только поля выбранного режима.
                    </p>
                  </div>
                  {activeBotMode === 'max' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={registeringMaxWebhook}
                          onClick={async () => {
                            setRegisteringMaxWebhook(true);
                            setMaxWebhookRegisterResult(null);
                            try {
                              const res = await fetch(buildScopedAdminEndpoint('/api/admin/max/webhook/register'), {
                                method: 'POST',
                              });
                              const data = await res.json().catch(() => ({}));
                              setMaxWebhookRegisterResult({
                                ok: Boolean(data.ok),
                                message: data.message,
                                error: data.error,
                              });
                            } catch {
                              setMaxWebhookRegisterResult({
                                ok: false,
                                error: 'Ошибка запроса',
                              });
                            } finally {
                              setRegisteringMaxWebhook(false);
                            }
                          }}
                        >
                          {registeringMaxWebhook
                            ? 'Регистрация…'
                            : 'Зарегистрировать webhook в MAX'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={checkingMaxWebhookStatus}
                          onClick={async () => {
                            setCheckingMaxWebhookStatus(true);
                            setMaxWebhookStatusResult(null);
                            try {
                              const res = await fetch(buildScopedAdminEndpoint('/api/admin/max/webhook/status'));
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok || !data.ok) {
                                setMaxWebhookStatusResult({
                                  ok: false,
                                  error: data.error || 'Ошибка запроса',
                                });
                              } else {
                                const url = data?.data?.url as string | undefined;
                                const updateTypesRaw = data?.data?.update_types;
                                const updateTypes = Array.isArray(updateTypesRaw)
                                  ? updateTypesRaw.map((item) => String(item))
                                  : undefined;
                                setMaxWebhookStatusResult({
                                  ok: true,
                                  url,
                                  updateTypes,
                                });
                              }
                            } catch {
                              setMaxWebhookStatusResult({
                                ok: false,
                                error: 'Ошибка запроса',
                              });
                            } finally {
                              setCheckingMaxWebhookStatus(false);
                            }
                          }}
                        >
                          {checkingMaxWebhookStatus
                            ? 'Проверка…'
                            : 'Проверить текущую подписку'}
                        </Button>
                      </div>
                      {maxWebhookRegisterResult && (
                        <p
                          className={
                            maxWebhookRegisterResult.ok
                              ? 'text-green-600 text-sm'
                              : 'text-red-600 text-sm'
                          }
                        >
                          {maxWebhookRegisterResult.ok
                            ? maxWebhookRegisterResult.message || 'Webhook зарегистрирован'
                            : maxWebhookRegisterResult.error || 'Ошибка регистрации'}
                        </p>
                      )}
                      {maxWebhookStatusResult && (
                        <div
                          className={
                            maxWebhookStatusResult.ok
                              ? 'text-sm text-gray-700'
                              : 'text-sm text-red-600'
                          }
                        >
                          {maxWebhookStatusResult.ok ? (
                            <>
                              <p>
                                Текущий URL: {maxWebhookStatusResult.url || 'не задан'}
                              </p>
                              <p>
                                Типы событий:{' '}
                                {maxWebhookStatusResult.updateTypes?.length
                                  ? maxWebhookStatusResult.updateTypes.join(', ')
                                  : 'не заданы'}
                              </p>
                            </>
                          ) : (
                            <p>{maxWebhookStatusResult.error || 'Не удалось получить подписку'}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {group.id === 'yookassa' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={yookassaCheckLoading}
                    onClick={async () => {
                      setYookassaCheckResult(null);
                      setYookassaCheckLoading(true);
                      try {
                        const res = await fetch(buildScopedCheckEndpoint('/api/admin/check-yookassa'));
                        const data = await res.json();
                        setYookassaCheckResult({ ok: data.ok, error: data.error });
                      } catch {
                        setYookassaCheckResult({ ok: false, error: 'Ошибка запроса' });
                      } finally {
                        setYookassaCheckLoading(false);
                      }
                    }}
                  >
                    {yookassaCheckLoading ? 'Проверка…' : 'Проверить подключение к ЮKassa'}
                  </Button>
                  {yookassaCheckResult && (
                    <span className={yookassaCheckResult.ok ? 'ml-3 text-green-600 text-sm' : 'ml-3 text-red-600 text-sm'}>
                      {yookassaCheckResult.ok ? 'Подключение успешно' : yookassaCheckResult.error}
                    </span>
                  )}
                </div>
              )}
              {group.id === 'cdek' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={cdekCheckLoading}
                    onClick={async () => {
                      setCdekCheckResult(null);
                      setCdekCheckLoading(true);
                      try {
                        const res = await fetch(buildScopedCheckEndpoint('/api/admin/check-cdek'));
                        const data = await res.json();
                        setCdekCheckResult({ ok: data.ok, error: data.error });
                      } catch {
                        setCdekCheckResult({ ok: false, error: 'Ошибка запроса' });
                      } finally {
                        setCdekCheckLoading(false);
                      }
                    }}
                  >
                    {cdekCheckLoading ? 'Проверка…' : 'Проверить подключение к СДЭК'}
                  </Button>
                  {cdekCheckResult && (
                    <span className={cdekCheckResult.ok ? 'ml-3 text-green-600 text-sm' : 'ml-3 text-red-600 text-sm'}>
                      {cdekCheckResult.ok ? 'Подключение успешно' : cdekCheckResult.error}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить настройки'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={loadSettings}
              disabled={saving}
            >
              Отмена
            </Button>
          </div>
        </form>

        {admins !== null && admins.length > 0 && (
          <div className="card mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Почтовые ящики администраторов</h2>
            <p className="text-sm text-gray-600 mb-4">
              Уведомления о новых заказах отправляются с support@innerhealth.ru. По умолчанию — на email входа. Можно привязать отдельный ящик для уведомлений.
            </p>
            <div className="overflow-x-auto">
              <table className="table table-horizontal min-w-[500px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Логин</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Привязанный ящик</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-900">{a.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {a.notificationEmail ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="email"
                            className="form-input text-sm w-44"
                            placeholder="email для уведомлений"
                            value={mailboxEdit[a.id] ?? ''}
                            onChange={(e) => setMailboxEdit((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={updatingUserId !== null}
                            onClick={async () => {
                              const value = (mailboxEdit[a.id] ?? '').trim();
                              setUpdatingUserId(a.id);
                              try {
                                const res = await fetch('/api/admin/settings/admins', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    userId: a.id,
                                    notificationEmail: value || null,
                                  }),
                                });
                                if (!res.ok) {
                                  const data = await res.json().catch(() => ({}));
                                  throw new Error(data.error || 'Ошибка');
                                }
                                setMailboxEdit((prev) => {
                                  const next = { ...prev };
                                  delete next[a.id];
                                  return next;
                                });
                                await loadAdmins();
                              } catch (e) {
                                setError(e instanceof Error ? e.message : 'Ошибка');
                              } finally {
                                setUpdatingUserId(null);
                              }
                            }}
                          >
                            {a.notificationEmail ? 'Изменить' : 'Привязать'}
                          </Button>
                          {a.notificationEmail && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={updatingUserId !== null}
                              onClick={async () => {
                                setUpdatingUserId(a.id);
                                try {
                                  const res = await fetch('/api/admin/settings/admins', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: a.id, notificationEmail: null }),
                                  });
                                  if (!res.ok) throw new Error('Ошибка');
                                  setMailboxEdit((prev) => {
                                    const next = { ...prev };
                                    delete next[a.id];
                                    return next;
                                  });
                                  await loadAdmins();
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : 'Ошибка');
                                } finally {
                                  setUpdatingUserId(null);
                                }
                              }}
                            >
                              Отвязать
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {telegramList !== null && (
          <div className="card mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Telegram администраторов</h2>
            <p className="text-sm text-gray-600 mb-4">
              Привязанные аккаунты Telegram для уведомлений о заказах. Управление привязкой — в профиле пользователя или через бота.
            </p>
            {telegramList.length === 0 ? (
              <p className="text-sm text-gray-500">Нет администраторов с привязанным Telegram.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-horizontal min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telegram ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Привязан</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тех. алерты</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telegramList.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="font-medium">{t.name}</span>
                          <span className="text-gray-500 ml-1">({t.email})</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{t.telegramUserId ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {t.linkedAt
                            ? new Date(t.linkedAt).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {t.telegramUserId ? (
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={Boolean(t.infraAlertsEnabled)}
                                disabled={updatingInfraAlertsUserId !== null}
                                onChange={async (e) => {
                                  setUpdatingInfraAlertsUserId(t.id);
                                  setError(null);
                                  try {
                                    const res = await fetch(buildScopedAdminEndpoint('/api/admin/settings/telegram'), {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        userId: t.id,
                                        infraAlertsEnabled: e.target.checked,
                                      }),
                                    });
                                    if (!res.ok) {
                                      const data = await res.json().catch(() => ({}));
                                      throw new Error(data.error || 'Ошибка');
                                    }
                                    await loadTelegram();
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Ошибка');
                                  } finally {
                                    setUpdatingInfraAlertsUserId(null);
                                  }
                                }}
                              />
                              <span className="text-sm">вкл</span>
                            </label>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {t.telegramUserId ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={unlinkingTelegramUserId !== null}
                              onClick={async () => {
                                if (!confirm('Отвязать Telegram у этого пользователя?')) return;
                                setUnlinkingTelegramUserId(t.id);
                                try {
                                  const deleteUrl = `${buildScopedAdminEndpoint('/api/admin/settings/telegram')}${settingsScope === 'global' ? '?' : '&'}userId=${encodeURIComponent(t.id)}`;
                                  const res = await fetch(deleteUrl, { method: 'DELETE' });
                                  if (!res.ok) {
                                    const data = await res.json().catch(() => ({}));
                                    throw new Error(data.error || 'Ошибка');
                                  }
                                  await loadTelegram();
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : 'Ошибка');
                                } finally {
                                  setUnlinkingTelegramUserId(null);
                                }
                              }}
                            >
                              {unlinkingTelegramUserId === t.id ? '…' : 'Отвязать'}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {maxList !== null && (
          <div className="card mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">MAX администраторов</h2>
            <p className="text-sm text-gray-600 mb-4">
              Привязанные аккаунты MAX для уведомлений о заказах. Управление привязкой — в профиле пользователя или через бота.
            </p>
            {maxList.length === 0 ? (
              <p className="text-sm text-gray-500">Нет администраторов с привязанным MAX.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-horizontal min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MAX ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Привязан</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тех. алерты</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maxList.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="font-medium">{m.name}</span>
                          <span className="text-gray-500 ml-1">({m.email})</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{m.maxUserId ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {m.linkedAt
                            ? new Date(m.linkedAt).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {m.maxUserId ? (
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={Boolean(m.infraAlertsEnabled)}
                                disabled={updatingInfraAlertsUserId !== null}
                                onChange={async (e) => {
                                  setUpdatingInfraAlertsUserId(m.id);
                                  setError(null);
                                  try {
                                    const res = await fetch(buildScopedAdminEndpoint('/api/admin/settings/max'), {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        userId: m.id,
                                        infraAlertsEnabled: e.target.checked,
                                      }),
                                    });
                                    if (!res.ok) {
                                      const data = await res.json().catch(() => ({}));
                                      throw new Error(data.error || 'Ошибка');
                                    }
                                    await loadMax();
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Ошибка');
                                  } finally {
                                    setUpdatingInfraAlertsUserId(null);
                                  }
                                }}
                              />
                              <span className="text-sm">вкл</span>
                            </label>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {m.maxUserId ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={unlinkingMaxUserId !== null}
                              onClick={async () => {
                                if (!confirm('Отвязать MAX у этого пользователя?')) return;
                                setUnlinkingMaxUserId(m.id);
                                try {
                                  const deleteUrl = `${buildScopedAdminEndpoint('/api/admin/settings/max')}${settingsScope === 'global' ? '?' : '&'}userId=${encodeURIComponent(m.id)}`;
                                  const res = await fetch(deleteUrl, { method: 'DELETE' });
                                  if (!res.ok) {
                                    const data = await res.json().catch(() => ({}));
                                    throw new Error(data.error || 'Ошибка');
                                  }
                                  await loadMax();
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : 'Ошибка');
                                } finally {
                                  setUnlinkingMaxUserId(null);
                                }
                              }}
                            >
                              {unlinkingMaxUserId === m.id ? '…' : 'Отвязать'}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="card mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Двухфакторная аутентификация</h2>
          <p className="text-sm text-gray-600 mb-4">
            Дополнительная защита входа: код по email или приложение (Google Authenticator и др.).
          </p>
          {twoFactorStatus === null ? (
            <p className="text-sm text-gray-500">Загрузка…</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Статус:{' '}
                {!twoFactorStatus.twoFactorEnabled
                  ? 'выключено'
                  : twoFactorStatus.twoFactorMethod === 'email'
                    ? 'включено (код по email)'
                    : 'включено (приложение)'}
              </p>
              {!twoFactorStatus.twoFactorEnabled && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={twoFactorLoading}
                    onClick={async () => {
                      setTwoFactorLoading(true);
                      setError(null);
                      try {
                        const res = await fetch('/api/auth/2fa/setup', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'enable', method: 'email' }),
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error || 'Ошибка');
                        }
                        await load2FAStatus();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Ошибка');
                      } finally {
                        setTwoFactorLoading(false);
                      }
                    }}
                  >
                    Включить по email
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={twoFactorLoading}
                    onClick={async () => {
                      setTwoFactorLoading(true);
                      setError(null);
                      setTotpUri(null);
                      setTotpCode('');
                      try {
                        const res = await fetch('/api/auth/2fa/setup', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'enable', method: 'totp' }),
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error || 'Ошибка');
                        }
                        const data = await res.json();
                        setTotpUri(data.uri ?? null);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Ошибка');
                      } finally {
                        setTwoFactorLoading(false);
                      }
                    }}
                  >
                    Включить через приложение
                  </Button>
                </div>
              )}
              {totpUri && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-800">Добавьте аккаунт в приложение</p>
                  <p className="text-xs text-gray-600 break-all font-mono">{totpUri}</p>
                  <p className="text-sm text-gray-600">Введите код из приложения:</p>
                  <div className="flex gap-2 items-center flex-wrap">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      className="form-input w-28"
                    />
                    <Button
                      type="button"
                      disabled={twoFactorLoading || totpCode.length !== 6}
                      onClick={async () => {
                        setTwoFactorLoading(true);
                        setError(null);
                        try {
                          const res = await fetch('/api/auth/2fa/setup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'enable', method: 'totp', code: totpCode }),
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(data.error || 'Неверный код');
                          }
                          setTotpUri(null);
                          setTotpCode('');
                          await load2FAStatus();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Ошибка');
                        } finally {
                          setTwoFactorLoading(false);
                        }
                      }}
                    >
                      Подтвердить
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTotpUri(null);
                        setTotpCode('');
                        load2FAStatus();
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
              {twoFactorStatus.twoFactorEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={twoFactorLoading}
                  onClick={() => {
                    setShowDisableModal(true);
                    setDisablePassword('');
                  }}
                >
                  Отключить 2FA
                </Button>
              )}
            </div>
          )}
        </div>

        <ModalLayer
          open={showDisableModal}
          onClose={() => {
            setShowDisableModal(false);
            setDisablePassword('');
          }}
          backdropClassName="bg-black/50"
          panelClassName="max-w-sm w-full"
          dialogProps={{ 'aria-labelledby': 'admin-2fa-disable-title' }}
        >
            <div className="bg-white rounded-lg shadow-xl w-full p-6">
              <h3 id="admin-2fa-disable-title" className="text-lg font-semibold text-gray-900 mb-2">Отключить 2FA</h3>
              <p className="text-sm text-gray-600 mb-4">
                Введите пароль или текущий код из приложения для подтверждения.
              </p>
              <input
                type="password"
                placeholder="Пароль или код из приложения"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="form-input w-full mb-4"
                autoComplete="current-password"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDisableModal(false);
                    setDisablePassword('');
                  }}
                >
                  Отмена
                </Button>
                <Button
                  type="button"
                  disabled={twoFactorLoading || !disablePassword.trim()}
                  onClick={async () => {
                    setTwoFactorLoading(true);
                    setError(null);
                    try {
                      const res = await fetch('/api/auth/2fa/setup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(
                          /^\d{6}$/.test(disablePassword.trim())
                            ? { action: 'disable', code: disablePassword.trim() }
                            : { action: 'disable', password: disablePassword.trim() }
                        ),
                      });
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.error || 'Неверный пароль или код');
                      }
                      setShowDisableModal(false);
                      setDisablePassword('');
                      await load2FAStatus();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Ошибка');
                    } finally {
                      setTwoFactorLoading(false);
                    }
                  }}
                >
                  Отключить
                </Button>
              </div>
            </div>
        </ModalLayer>

        <ModalLayer
          open={showCdekModal}
          onClose={() => setShowCdekModal(false)}
          backdropClassName="bg-black/50"
          panelClassName="max-w-3xl w-full"
          dialogProps={{ 'aria-labelledby': 'admin-cdek-settings-title' }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full p-6 max-h-[80vh] overflow-auto">
            <h3 id="admin-cdek-settings-title" className="text-lg font-semibold text-gray-900 mb-2">
              Настройки СДЭК
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              После изменений нажмите «Сохранить настройки» внизу страницы.
            </p>
            {cdekTariffsLoading ? (
              <p className="text-sm text-gray-500 mb-3">Загрузка списка тарифов СДЭК…</p>
            ) : null}
            {cdekTariffsError ? (
              <p className="text-sm text-red-600 mb-3" role="alert">
                {cdekTariffsError}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              {FIELDS.filter((f) => f.group === 'cdek').map((field) => (
                <div key={field.key}>
                  <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      id={field.key}
                      className="form-input w-full"
                      value={values[field.key] ?? ''}
                      onChange={(e) => updateValue(field.key, e.target.value)}
                    >
                      {(field.key === 'cdek_preferred_tariff_code_pvz'
                        ? buildTariffOptions(CDEK_TARIFF_CODES_PVZ, cdekTariffCodeToDescriptionApi)
                        : field.key === 'cdek_preferred_tariff_code_address'
                          ? buildTariffOptions(CDEK_TARIFF_CODES_ADDRESS, cdekTariffCodeToDescriptionApi)
                          : field.options ?? []
                      ).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      id={field.key}
                      className="form-input w-full min-h-[120px] font-mono text-xs"
                      placeholder={field.placeholder}
                      value={values[field.key] ?? ''}
                      onChange={(e) => updateValue(field.key, e.target.value)}
                    />
                  ) : (
                    <input
                      id={field.key}
                      type={field.type}
                      className="form-input w-full"
                      placeholder={field.placeholder}
                      value={values[field.key] ?? ''}
                      onChange={(e) => updateValue(field.key, e.target.value)}
                      autoComplete="off"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6 gap-2">
              <Button
                type="submit"
                form="admin-settings-form"
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCdekModal(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        </ModalLayer>
      </div>
    </div>
  );
}
