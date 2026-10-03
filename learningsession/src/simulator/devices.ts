export interface Device {
  id: string
  label: string
  width: number
  height: number
}

export const devices: Device[] = [
  { id: 'mobile', label: 'Mobile', width: 360, height: 800 },
  { id: 'tablet', label: 'Tablet', width: 1024, height: 1024 },
  { id: 'desktop', label: 'Desktop', width: 1440, height: 1024 },
]

export type StageMode = Device['id'] | 'all' | 'fill'

export function breakpointFor(width: number) {
  if (width < 755) return 'mobile'
  if (width <= 1024) return 'tablet'
  return 'desktop'
}
