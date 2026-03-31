import { Keyboard } from '@maxhub/max-bot-api';
import type { BotUserCapabilities } from '@/bot/runtime/capabilities';

export const MAX_MENU_HELP_PAYLOAD = 'menu_help';
export const MAX_MENU_STATUS_PAYLOAD = 'menu_status';
export const MAX_MENU_PROMO_PAYLOAD = 'menu_promo';
export const MAX_MENU_STATS_PAYLOAD = 'menu_stats';

export type MaxMenuCommand = 'help' | 'status' | 'promo' | 'stats';

export function getMaxAvailableCommands(
  capabilities: BotUserCapabilities
): MaxMenuCommand[] {
  const commands: MaxMenuCommand[] = ['help', 'status'];
  if (capabilities.isAdmin) commands.push('promo');
  if (capabilities.isPartner) commands.push('stats');
  return commands;
}

function getCommandDescription(command: MaxMenuCommand): string {
  switch (command) {
    case 'help':
      return '/help — помощь';
    case 'status':
      return '/status — статус подключения';
    case 'promo':
      return '/promo — промокоды';
    case 'stats':
      return '/stats — статистика партнёра';
  }
}

export function buildHelpTextForMax(capabilities: BotUserCapabilities): string {
  if (!capabilities.isLinked) {
    return [
      'Помощь',
      '',
      'Вы пока не подключены к уведомлениям.',
      '',
      'Как подключиться:',
      '1) Откройте сайт → профиль/настройки → «Подключить MAX»',
      '2) Перейдите по ссылке и нажмите Start',
      '',
      'Команды:',
      '/status — проверить, подключены ли вы',
      '/help — помощь',
    ].join('\n');
  }

  return [
    'Помощь',
    '',
    'Вы подключены к уведомлениям.',
    '',
    'Команды:',
    ...getMaxAvailableCommands(capabilities).map(getCommandDescription),
  ].join('\n');
}

export function buildWelcomeTextForMax(capabilities: BotUserCapabilities): string {
  if (!capabilities.isLinked) {
    return 'Используйте ссылку из админки, чтобы подключить уведомления.';
  }

  return [
    '✅ Вас подключили к уведомлениям.',
    '',
    'Доступные команды:',
    ...getMaxAvailableCommands(capabilities)
      .filter((command) => command !== 'help')
      .map(getCommandDescription),
  ].join('\n');
}

export function buildUnknownCommandTextForMax(
  capabilities: BotUserCapabilities
): string {
  return `Доступные команды: ${getMaxAvailableCommands(capabilities).map((command) => `/${command}`).join(', ')}`;
}

export function buildMaxMenuAttachments(capabilities: BotUserCapabilities) {
  const rows = [
    [
      Keyboard.button.callback('Статус', MAX_MENU_STATUS_PAYLOAD),
      Keyboard.button.callback('Помощь', MAX_MENU_HELP_PAYLOAD),
    ],
  ];
  const roleRow: ReturnType<typeof Keyboard.button.callback>[] = [];
  if (capabilities.isAdmin) roleRow.push(Keyboard.button.callback('Промокоды', MAX_MENU_PROMO_PAYLOAD));
  if (capabilities.isPartner) roleRow.push(Keyboard.button.callback('Статистика', MAX_MENU_STATS_PAYLOAD));
  if (roleRow.length > 0) rows.push(roleRow);
  return [Keyboard.inlineKeyboard(rows)];
}

export function resolveMaxMenuCommand(payload: string): MaxMenuCommand | null {
  switch (payload.trim()) {
    case MAX_MENU_HELP_PAYLOAD:
      return 'help';
    case MAX_MENU_STATUS_PAYLOAD:
      return 'status';
    case MAX_MENU_PROMO_PAYLOAD:
      return 'promo';
    case MAX_MENU_STATS_PAYLOAD:
      return 'stats';
    default:
      return null;
  }
}
