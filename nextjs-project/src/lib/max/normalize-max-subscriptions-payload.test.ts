import { describe, expect, it } from 'vitest';
import {
  extractMaxSubscriptionWebhookUrls,
  normalizeMaxSubscriptionsPayload,
} from './normalize-max-subscriptions-payload';

describe('normalizeMaxSubscriptionsPayload', () => {
  it('passes through when url and update_types already on root', () => {
    const input = { url: 'https://a.com/hook', update_types: ['message_created'] };
    expect(normalizeMaxSubscriptionsPayload(input)).toEqual(input);
  });

  it('lifts url and update_types from subscriptions[0]', () => {
    const input = {
      subscriptions: [
        {
          url: 'https://shop.example/api/webhooks/max',
          update_types: ['bot_started', 'message_created', 'message_callback'],
        },
      ],
    };
    expect(normalizeMaxSubscriptionsPayload(input)).toMatchObject({
      url: 'https://shop.example/api/webhooks/max',
      update_types: ['bot_started', 'message_created', 'message_callback'],
    });
  });

  it('returns base unchanged when subscriptions empty', () => {
    const input = { subscriptions: [] };
    expect(normalizeMaxSubscriptionsPayload(input)).toEqual(input);
  });

  it('extracts all webhook urls from subscriptions array', () => {
    const input = {
      subscriptions: [
        { url: 'https://old.example/hook', update_types: ['bot_started'] },
        { webhook_url: 'https://other.example/api', update_types: ['message_created'] },
      ],
    };
    expect(extractMaxSubscriptionWebhookUrls(input)).toEqual([
      'https://old.example/hook',
      'https://other.example/api',
    ]);
  });

  it('deduplicates subscription urls', () => {
    const input = {
      subscriptions: [{ url: 'https://same/a' }, { url: 'https://same/a' }],
    };
    expect(extractMaxSubscriptionWebhookUrls(input)).toEqual(['https://same/a']);
  });
});
