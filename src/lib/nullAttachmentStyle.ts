import type { CSSProperties } from 'react'

/** Same green as matrix “ok” cells and checkmarks (Tailwind emerald-400 / emerald-600). */
export const MATRIX_GREEN_RGB = '52, 211, 153'
export const MATRIX_GREEN_DARK_RGB = '5, 150, 105'
export const MATRIX_GREEN_LIGHT_RGB = '110, 231, 183'

/** Profile / matrix: attachment marked not required via verificationLinkStatus "null". */
export function isAttachmentNullMarked(
  detail?: string | null,
  verificationStatus?: string | null
): boolean {
  if (detail === 'NULL') return true
  return String(verificationStatus || '').trim().toLowerCase() === 'null'
}

/** Light hatch on emerald-tinted surfaces (badges, profile panel). */
export const NULL_ATTACHMENT_HATCH_STYLE: CSSProperties = {
  backgroundImage: `repeating-linear-gradient(
    -45deg,
    rgba(${MATRIX_GREEN_DARK_RGB}, 0.12),
    rgba(${MATRIX_GREEN_DARK_RGB}, 0.12) 4px,
    rgba(${MATRIX_GREEN_LIGHT_RGB}, 0.1) 4px,
    rgba(${MATRIX_GREEN_LIGHT_RGB}, 0.1) 10px
  )`,
}

/** Matrix table cell — same tint as ok cells (rgba emerald-400 @ 35%) + subtle hatch. */
export const NULL_MATRIX_CELL_SHADE_STYLE: CSSProperties = {
  backgroundColor: `rgba(${MATRIX_GREEN_RGB}, 0.35)`,
  backgroundImage: `repeating-linear-gradient(
    -45deg,
    rgba(${MATRIX_GREEN_DARK_RGB}, 0.18),
    rgba(${MATRIX_GREEN_DARK_RGB}, 0.18) 5px,
    rgba(${MATRIX_GREEN_LIGHT_RGB}, 0.12) 5px,
    rgba(${MATRIX_GREEN_LIGHT_RGB}, 0.12) 11px
  )`,
}
