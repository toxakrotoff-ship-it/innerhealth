import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseTelegramSocksProxyUrl } from '@/lib/telegram-api-fetch';

describe('parseTelegramSocksProxyUrl', () => {
  it('parses https://t.me/socks? (share link)', () => {
    expect(
      parseTelegramSocksProxyUrl(
        'https://t.me/socks?server=example.test&port=1080&user=myuser&pass=mypass'
      )
    ).toEqual({
      host: 'example.test',
      port: 1080,
      userId: 'myuser',
      password: 'mypass',
    });
  });

  it('parses tg://socks?...', () => {
    expect(
      parseTelegramSocksProxyUrl('tg://socks?server=10.0.0.1&port=9050&user=u&pass=p')
    ).toEqual({
      host: '10.0.0.1',
      port: 9050,
      userId: 'u',
      password: 'p',
    });
  });

  it('parses socks5://', () => {
    expect(parseTelegramSocksProxyUrl('socks5://127.0.0.1:1080')).toEqual({
      host: '127.0.0.1',
      port: 1080,
    });
  });
});
