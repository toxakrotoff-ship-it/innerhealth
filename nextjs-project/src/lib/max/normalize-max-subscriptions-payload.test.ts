import { describe, expect, it } from 'vitest';
import { normalizeMaxSubscriptionsPayload } from './normalize-max-subscriptions-payload';

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
});
