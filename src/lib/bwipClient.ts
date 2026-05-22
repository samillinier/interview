/** Single shared load so we do not import bwip-js once per table row. */

type BwipBrowser = {
  toCanvas: (
    canvas: HTMLCanvasElement | string,
    opts: Record<string, unknown>
  ) => HTMLCanvasElement
}

let cached: BwipBrowser | null = null
let loading: Promise<BwipBrowser> | null = null

export function getBwipBrowser(): Promise<BwipBrowser> {
  if (cached) return Promise.resolve(cached)
  if (!loading) {
    loading = import('bwip-js/browser').then((mod) => {
      const d = (mod as unknown as { default: BwipBrowser }).default
      cached = d
      return d
    })
  }
  return loading
}
