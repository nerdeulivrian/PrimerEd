export interface Device {
  id: string
  label: string
  width: number
  height: number
}

export const devices: Device[] = [
  { id: 'mobile', label: 'Mobile 390×844', width: 390, height: 844 },
  { id: 'tablet', label: 'Tablet 820×1180', width: 820, height: 1180 },
  { id: 'desktop', label: 'Desktop 1440×900', width: 1440, height: 900 },
]
