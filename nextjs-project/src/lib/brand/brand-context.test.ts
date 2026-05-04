import { describe, expect, it } from 'vitest';
import { resolveAdminBrand, resolveSiteBrand } from './brand-context';

describe('brand-context', () => {
  it('uses host for site requests; storefront cookie does not override domain', () => {
    const activeBrand = resolveSiteBrand({
      forwardedBrand: null,
      host: 'innerhealth.local',
      activeBrandCookie: 'sprint-power',
    });

    expect(activeBrand).toBe('inner');
  });

  it('site ignores x-brand when hostname pins Inner', () => {
    expect(
      resolveSiteBrand({
        forwardedBrand: 'sprint-power',
        host: 'innerhealth.local',
      })
    ).toBe('inner');
  });

  it('prefers admin cookie for admin context', () => {
    const activeBrand = resolveAdminBrand({
      forwardedBrand: null,
      host: 'innerhealth.local',
      adminBrandCookie: 'sprint-power',
      activeBrandCookie: 'inner',
    });

    expect(activeBrand).toBe('sprint-power');
  });
});
