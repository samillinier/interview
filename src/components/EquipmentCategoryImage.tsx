import type { ImgHTMLAttributes } from 'react'

/**
 * Real product photos for equipment categories.
 * Each maps to a local image in /public/equipment (downloaded, then sized for web).
 */

type Props = ImgHTMLAttributes<HTMLImageElement> & { category?: string | null }

function normalizeCategory(category?: string | null): string {
  return String(category || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const CATEGORY_PHOTOS: Array<{ test: (c: string) => boolean; src: string }> = [
  {
    test: (c) => /laptop|notebook|thinkpad|zenbook|macbook|latitude/.test(c),
    src: '/equipment/laptop.jpg',
  },
  {
    test: (c) => /phone|telephone|desk|polycom|yealink|cisco|voip|snom|avaya/.test(c),
    src: '/equipment/desk-phone.jpg',
  },
  {
    test: (c) => /smart|iphone|cell|mobile/.test(c),
    src: '/equipment/smartphone.jpg',
  },
  {
    test: (c) => /printer|copier|mfc|imageclass|imagerunner|ricoh|brother/.test(c),
    src: '/equipment/printer.jpg',
  },
  {
    test: (c) => /monitor|display|screen|viewsonic|koorui|sceptre|acer|hp elite/.test(c),
    src: '/equipment/monitor.jpg',
  },
  {
    test: (c) => /tablet/.test(c),
    src: '/equipment/tablet.jpg',
  },
  {
    test: (c) => /router|switch|firewall|repeater|repeter|mesh|gateway|netgear|eero|cradlepoint|arris/.test(c),
    src: '/equipment/router.jpg',
  },
  {
    test: (c) => /pc|desktop|tower|small desktop|optiplex|pavilion|envy/.test(c),
    src: '/equipment/desktop-pc.jpg',
  },
  {
    test: (c) => /camera|blink|cctv/.test(c),
    src: '/equipment/camera.jpg',
  },
]

/**
 * Pick the right real photo for an equipment category.
 */
export default function EquipmentCategoryImage({ category, alt = '', ...props }: Props) {
  const c = normalizeCategory(category)
  const match = CATEGORY_PHOTOS.find((p) => p.test(c))
  // Fall back to a laptop photo for unknown categories.
  const src = match ? match.src : '/equipment/laptop.jpg'

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" {...props} />
  )
}
