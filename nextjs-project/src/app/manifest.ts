import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Inner Health / Sprint Power',
    short_name: 'Inner Health',
    description:
      'Интернет-магазины Inner Health и Sprint Power: нутриенты и спортивное питание.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f9fafb',
    lang: 'ru',
    dir: 'ltr',
  }
}
