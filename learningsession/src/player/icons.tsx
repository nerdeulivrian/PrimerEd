// Material Symbols Rounded "check" and "add" glyphs, as used by the
// feedback panels in designMain.pen. The design rotates "add" 45° for the
// incorrect mark.

const CHECK =
  'M5.57129 8.34326l4.6792-4.68262q0.28027-0.27686 0.65625-0.27685 0.37939 0 0.65625 0.27685 0.28027 0.27686 0.28027 0.65625 0 0.37939-0.28027 0.65625l-5.33545 5.33887q-0.27686 0.27686-0.65625 0.27686-0.37939 0-0.65625-0.27686l-2.47803-2.48144q-0.28027-0.27686-0.28027-0.65625 0-0.37939 0.28027-0.65625 0.27686-0.27686 0.65283-0.27686 0.37939 0 0.65967 0.27686l1.82178 1.82519z'

const ADD =
  'M6.08057 7.91943l-2.74121 0q-0.37939 0-0.64942-0.27002-0.27002-0.27002-0.27002-0.64941 0-0.37939 0.27002-0.64941 0.27002-0.27002 0.64942-0.27002l2.74121 0 0-2.74121q0-0.37939 0.27002-0.64942 0.27002-0.27002 0.64941-0.27002 0.37939 0 0.64941 0.27002 0.27002 0.27002 0.27002 0.64942l0 2.74121 2.74122 0q0.37939 0 0.64941 0.27002 0.27002 0.27002 0.27002 0.64941 0 0.37939-0.27002 0.64941-0.27002 0.27002-0.64941 0.27002l-2.74122 0 0 2.74122q0 0.37939-0.27002 0.64941-0.27002 0.27002-0.64941 0.27002-0.37939 0-0.64941-0.27002-0.27002-0.27002-0.27002-0.64941l0-2.74122z'

interface IconProps {
  className?: string
}

export function CheckMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 14 14" aria-hidden className={className}>
      <path d={CHECK} fill="currentColor" />
    </svg>
  )
}

export function CrossMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 14 14" aria-hidden className={className}>
      <path d={ADD} fill="currentColor" transform="rotate(45 7 7)" />
    </svg>
  )
}
