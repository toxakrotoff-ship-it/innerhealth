export type CdekWidgetMode = 'cdek_pvz' | 'cdek_door'

export function detectCdekWidgetModeFromText(text: string): CdekWidgetMode | null {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ')
  if (
    normalized.includes('пвз') ||
    normalized.includes('пункт выдачи') ||
    normalized.includes('пункт выдач') ||
    normalized.includes('самовывоз')
  ) {
    return 'cdek_pvz'
  }
  if (
    normalized.includes('до двери') ||
    normalized.includes('двери') ||
    normalized.includes('курьер')
  ) {
    return 'cdek_door'
  }
  return null
}
