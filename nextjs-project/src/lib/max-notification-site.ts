import type { BrandId } from '@/lib/brand/brand';

export function maxNotificationSiteHeader(brandId: BrandId): string {
  return brandId === 'sprint-power'
    ? '**Сайт: Sprint Power (sprintpower.ru)**'
    : '**Сайт: Inner Health (innerhealth.ru)**';
}
