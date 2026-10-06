import type { SVGProps } from 'react'

/**
 * Transparent-background product illustrations for equipment categories.
 * Each is a flat, clean SVG with NO background rect — the page background
 * shows through, matching the existing "transparent image" aesthetic.
 *
 * viewBox is 0 0 96 96 so the art scales to any container size.
 */

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

const GREEN = '#8CB63C'
const GREEN_DARK = '#7AA32F'
const SLATE_200 = '#e2e8f0'
const SLATE_300 = '#cbd5e1'
const SLATE_400 = '#94a3b8'
const SLATE_500 = '#64748b'
const SLATE_700 = '#334155'
const SLATE_900 = '#0f172a'
const SKY = '#7dd3fc'
const SKY_DARK = '#38bdf8'

function LaptopIllustration(props: IconProps) {
  return (
    <Svg {...props}>
      {/* screen panel */}
      <rect x="19" y="16" width="58" height="40" rx="4" fill={SLATE_900} />
      <rect x="22.5" y="19.5" width="51" height="33" rx="2" fill={SKY} />
      <rect x="26" y="22" width="44" height="7" rx="1.5" fill="#bae6fd" opacity="0.8" />
      {/* camera dot */}
      <circle cx="48" cy="18.6" r="1.4" fill={SLATE_400} />
      {/* keyboard deck */}
      <path
        d="M12 60 h72 l7 11 a3.5 3.5 0 0 1 -3.2 5 H8.2 A3.5 3.5 0 0 1 5 71 z"
        fill={SLATE_500}
      />
      <rect x="16" y="60" width="64" height="5" rx="2" fill={SLATE_300} />
      {/* keyboard rows */}
      <rect x="22" y="68" width="52" height="3" rx="1.5" fill={SLATE_300} />
      <rect x="38" y="60.8" width="20" height="2.6" rx="1.3" fill={GREEN} />
    </Svg>
  )
}

function SmartphoneIllustration(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="30" y="8" width="36" height="80" rx="8" fill={SLATE_900} />
      <rect x="32.5" y="12" width="31" height="72" rx="5.5" fill={SKY} />
      <rect x="36" y="18" width="24" height="9" rx="2" fill="#bae6fd" opacity="0.85" />
      {/* speaker */}
      <rect x="41" y="11" width="14" height="2.2" rx="1.1" fill={SLATE_400} />
      {/* home indicator */}
      <rect x="42" y="79" width="12" height="2.4" rx="1.2" fill={SLATE_900} opacity="0.7" />
      {/* side button */}
      <rect x="66" y="30" width="2.4" height="12" rx="1.2" fill={SLATE_400} />
      {/* app icons */}
      <rect x="38" y="32" width="8" height="8" rx="2" fill={GREEN} />
      <rect x="50" y="32" width="8" height="8" rx="2" fill="#f5a623" />
      <rect x="38" y="44" width="8" height="8" rx="2" fill="#38bdf8" />
      <rect x="50" y="44" width="8" height="8" rx="2" fill="#f8fafc" opacity="0.8" />
    </Svg>
  )
}

function DeskPhoneIllustration(props: IconProps) {
  return (
    <Svg {...props}>
      {/* handset */}
      <path
        d="M20 24 a28 28 0 0 1 56 0 l3 14 a4 4 0 0 1 -4 4.6 l-13 1.4 a4 4 0 0 1 -4.4 -3.4 l-1.8 -10 a18 18 0 0 0 -15.6 0 l-1.8 10 a4 4 0 0 1 -4.4 3.4 l-13 -1.4 a4 4 0 0 1 -4 -4.6 z"
        fill={SLATE_500}
      />
      <path d="M20 30 a28 28 0 0 1 56 0" stroke={SLATE_300} strokeWidth="2.5" fill="none" />
      {/* base */}
      <path d="M26 44 h44 v16 a6 6 0 0 1 -6 6 H32 a6 6 0 0 1 -6 -6 z" fill={SLATE_700} />
      {/* screen */}
      <rect x="31" y="47" width="34" height="9" rx="2" fill={SKY} />
      {/* keypad */}
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <circle key={`${r}-${c}`} cx={39 + c * 9} cy={63 + r * 5.4} r="1.7" fill={SLATE_300} />
        ))
      )}
      {/* accent line */}
      <rect x="26" y="44" width="44" height="2" rx="1" fill={GREEN} />
    </Svg>
  )
}

function PrinterIllustration(props: IconProps) {
  return (
    <Svg {...props}>
      {/* top body */}
      <rect x="20" y="24" width="56" height="26" rx="4" fill={SLATE_500} />
      {/* paper tray */}
      <path d="M28 48 h40 v14 a5 5 0 0 1 -5 5 H33 a5 5 0 0 1 -5 -5 z" fill={SLATE_700} />
      {/* output paper */}
      <path d="M32 24 l10 -12 h24 a4 4 0 0 1 4 4 v8 h-38 z" fill="#f8fafc" />
      <path d="M40 15 h16" stroke={SLATE_300} strokeWidth="2" />
      {/* control panel */}
      <rect x="26" y="29" width="18" height="10" rx="2" fill={SLATE_300} />
      <circle cx="31" cy="34" r="1.6" fill={GREEN} />
      <rect x="35" y="32.5" width="6" height="3" rx="1.5" fill={SLATE_500} />
      {/* output slot */}
      <rect x="50" y="29" width="20" height="4" rx="2" fill={SLATE_400} />
      {/* paper exit */}
      <rect x="24" y="50" width="48" height="5" rx="2.5" fill={SLATE_300} />
    </Svg>
  )
}

function MonitorIllustration(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="12" y="14" width="72" height="50" rx="6" fill={SLATE_900} />
      <rect x="16" y="18" width="64" height="42" rx="3" fill={SKY} />
      <rect x="20" y="22" width="56" height="8" rx="2" fill="#bae6fd" opacity="0.85" />
      {/* stand */}
      <path d="M48 64 v10" stroke={SLATE_400} strokeWidth="4" strokeLinecap="round" />
      <path d="M36 82 h24 a3 3 0 0 1 3 3 v2 a3 3 0 0 1 -3 3 H36 a3 3 0 0 1 -3 -3 v-2 a3 3 0 0 1 3 -3 z" fill={SLATE_500} />
      {/* power led */}
      <circle cx="48" cy="66" r="1.5" fill={GREEN} />
    </Svg>
  )
}

function TabletIllustration(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="14" y="10" width="68" height="76" rx="10" fill={SLATE_900} />
      <rect x="18" y="15" width="60" height="66" rx="6" fill={SKY} />
      <rect x="22" y="20" width="52" height="10" rx="2" fill="#bae6fd" opacity="0.85" />
      {/* camera */}
      <circle cx="48" cy="14" r="1.6" fill={SLATE_400} />
      {/* cards */}
      <rect x="24" y="38" width="22" height="16" rx="3" fill="#f8fafc" opacity="0.85" />
      <rect x="50" y="38" width="22" height="16" rx="3" fill={GREEN} />
      <rect x="24" y="58" width="22" height="16" rx="3" fill="#f5a623" />
      <rect x="50" y="58" width="22" height="16" rx="3" fill="#38bdf8" />
    </Svg>
  )
}

function RouterIllustration(props: IconProps) {
  return (
    <Svg {...props}>
      {/* antennas */}
      <path d="M34 28 V10" stroke={SLATE_500} strokeWidth="4" strokeLinecap="round" />
      <path d="M48 26 V8" stroke={SLATE_500} strokeWidth="4" strokeLinecap="round" />
      <path d="M62 28 V10" stroke={SLATE_500} strokeWidth="4" strokeLinecap="round" />
      <circle cx="34" cy="9" r="2.4" fill={SLATE_400} />
      <circle cx="48" cy="7" r="2.4" fill={SLATE_400} />
      <circle cx="62" cy="9" r="2.4" fill={SLATE_400} />
      {/* body */}
      <path d="M22 30 h52 a8 8 0 0 1 8 8 v14 a8 8 0 0 1 -8 8 H22 a8 8 0 0 1 -8 -8 V38 a8 8 0 0 1 8 -8 z" fill={SLATE_700} />
      {/* lights */}
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={34 + i * 10} cy="41" r="2.4" fill={i === 0 ? GREEN : SKY_DARK} />
      ))}
      {/* vents */}
      <rect x="30" y="48" width="36" height="3" rx="1.5" fill={SLATE_500} />
    </Svg>
  )
}

function DesktopPcIllustration(props: IconProps) {
  return (
    <Svg {...props}>
      {/* tower */}
      <rect x="30" y="22" width="28" height="58" rx="5" fill={SLATE_700} />
      <rect x="34" y="27" width="20" height="6" rx="2" fill={SLATE_500} />
      <circle cx="38" cy="30" r="1.6" fill={GREEN} />
      <rect x="34" y="38" width="20" height="14" rx="2" fill={SLATE_500} />
      {/* power button */}
      <circle cx="66" cy="26" r="3" fill={SLATE_400} />
      {/* monitor (small) */}
      <rect x="16" y="14" width="20" height="15" rx="2" fill={SLATE_900} />
      <rect x="18" y="16" width="16" height="11" rx="1" fill={SKY} />
    </Svg>
  )
}

function CameraIllustration(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="18" y="30" width="60" height="42" rx="8" fill={SLATE_700} />
      <rect x="36" y="24" width="24" height="8" rx="3" fill={SLATE_500} />
      {/* lens */}
      <circle cx="48" cy="51" r="15" fill={SLATE_900} />
      <circle cx="48" cy="51" r="11" fill={SLATE_400} />
      <circle cx="48" cy="51" r="6.5" fill={SKY} />
      <circle cx="45.5" cy="48.5" r="2" fill="#f8fafc" />
      {/* flash */}
      <circle cx="64" cy="38" r="2.2" fill={GREEN} />
      {/* shutter */}
      <rect x="26" y="40" width="4" height="6" rx="1.5" fill={SLATE_500} />
    </Svg>
  )
}

function ToolIllustration(props: IconProps) {
  // Generic fallback: a handheld device/scanner with gauge
  return (
    <Svg {...props}>
      <rect x="22" y="18" width="52" height="40" rx="6" fill={SLATE_700} />
      <rect x="27" y="23" width="42" height="12" rx="3" fill={SLATE_500} />
      {/* gauge dial */}
      <circle cx="48" cy="51" r="11" fill={SLATE_900} />
      <path d="M48 51 l-6 -6" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="48" cy="51" r="2" fill={SLATE_300} />
      {/* buttons */}
      <rect x="27" y="62" width="10" height="6" rx="2" fill={GREEN} />
      <rect x="40" y="62" width="10" height="6" rx="2" fill={SLATE_400} />
      <rect x="53" y="62" width="10" height="6" rx="2" fill={SLATE_400} />
    </Svg>
  )
}

function normalizeCategory(category?: string | null): string {
  return String(category || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Pick the right transparent-background illustration for an equipment category.
 */
export default function EquipmentCategoryImage({
  category,
  ...props
}: IconProps & { category?: string | null }) {
  const c = normalizeCategory(category)

  if (c.includes('laptop') || c.includes('notebook') || c.includes('thinkpad') || c.includes('zenbook')) {
    return <LaptopIllustration {...props} />
  }
  if (c.includes('phone') || c.includes('telephone') || c.includes('desk') || c.includes('polycom') || c.includes('yealink') || c.includes('cisco')) {
    return <DeskPhoneIllustration {...props} />
  }
  if (c.includes('smart') || c.includes('iphone') || c.includes('cell') || c.includes('mobile')) {
    return <SmartphoneIllustration {...props} />
  }
  if (c.includes('printer') || c.includes('copier') || c.includes('mfc')) {
    return <PrinterIllustration {...props} />
  }
  if (c.includes('monitor') || c.includes('display') || c.includes('screen') || c.includes('viewsonic')) {
    return <MonitorIllustration {...props} />
  }
  if (c.includes('tablet')) {
    return <TabletIllustration {...props} />
  }
  if (c.includes('router') || c.includes('switch') || c.includes('firewall') || c.includes('repeater') || c.includes('repeter') || c.includes('mesh') || c.includes('gateway')) {
    return <RouterIllustration {...props} />
  }
  if (c.includes('pc') || c.includes('desktop') || c.includes('tower')) {
    return <DesktopPcIllustration {...props} />
  }
  if (c.includes('camera') || c.includes('blink')) {
    return <CameraIllustration {...props} />
  }
  return <ToolIllustration {...props} />
}

export {
  LaptopIllustration,
  SmartphoneIllustration,
  DeskPhoneIllustration,
  PrinterIllustration,
  MonitorIllustration,
  TabletIllustration,
  RouterIllustration,
  DesktopPcIllustration,
  CameraIllustration,
  ToolIllustration,
}
