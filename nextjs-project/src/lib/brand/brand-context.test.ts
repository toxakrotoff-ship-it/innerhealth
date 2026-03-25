import { describe, expect, it } from 'vitest';
import { resolveAdminBrand, resolveSiteBrand } from './brand-context';

describe('brand-context', () => {
  it('uses site cookie for site requests even when admin cookie differs', () => {
    const activeBrand = resolveSiteBrand({
      forwardedBrand: null,
      host: 'innerhealth.local',
      activeBrandCookie: 'inner',
    });

    expect(activeBrand).toBe('inner');
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
