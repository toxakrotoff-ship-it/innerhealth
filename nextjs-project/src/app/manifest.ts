import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Inner Health',
    short_name: 'Inner Health',
    description:
      'Интернет-магазин нутриентов и продуктов для здоровья. Каталог, доставка по России.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f9fafb',
    lang: 'ru',
    dir: 'ltr',
  }
}
