export interface CdekWidgetInstance {
  addParcel?: (parcel: unknown) => void
  resetParcels?: () => void
  open?: () => void
  close?: () => void
  updateOfficesRaw?: (offices: unknown) => Promise<void>
}

export type CdekWidgetConstructor = new (params: Record<string, unknown>) => CdekWidgetInstance

declare global {
  interface Window {
    CDEKWidget?: CdekWidgetConstructor
  }
}
