export interface CdekWidgetInstance {
  addParcel?: (parcel: unknown) => void
  resetParcels?: () => void
  open?: () => void
  close?: () => void
}

export type CdekWidgetConstructor = new (params: Record<string, unknown>) => CdekWidgetInstance

declare global {
  interface Window {
    CDEKWidget?: CdekWidgetConstructor
  }
}
