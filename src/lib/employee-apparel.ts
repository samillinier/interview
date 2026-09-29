export type ApparelColor = {
  name: string
  image: string
  swatch: string
}

export type ApparelProduct = {
  key: string
  name: string
  sku: string
  price: number
  description: string[]
  image: string
  colors: ApparelColor[]
  sizes: string[]
}

const IMG_BASE = 'https://assetly.ordermygear.com/images/h_478,w_467,c_limit,s_1'
const SWATCH_BASE = 'https://assetly.ordermygear.com/images/h_103,w_93,c_limit'

/**
 * Employee Apparel order catalog.
 * Product data (name, price, description, colors, and imagery) mirrors the
 * official Floor Interior Services Corp Store item on Fully Promoted:
 *   https://floorinteriorservices.itemorder.com/shop/product/59017019/
 */
export const EMPLOYEE_APPAREL_PRODUCTS: ApparelProduct[] = [
  {
    key: 'k540-polo',
    name: 'Port Authority Silk Touch Performance Polo. K540',
    sku: 'K540',
    price: 30.68,
    description: [
      'We took our legendary Silk Touch Polo and made it work even harder. The durable, easy care Silk Touch Performance Polo wicks moisture, resists snags and thanks to PosiCharge technology, holds onto its color for a professional look that lasts.',
      '4-ounce, 100% polyester double knit with PosiCharge technology; White is 4.3-ounce for increased coverage',
      'Self-fabric collar · Tag-free label · 3-button placket with dyed-to-match buttons · Open hem sleeves',
    ],
    image: `${IMG_BASE}/ce19147146c3e033e95976c0fc1333fb8e96b2a9`,
    colors: [
      { name: 'Black', image: `${IMG_BASE}/ce19147146c3e033e95976c0fc1333fb8e96b2a9`, swatch: `${SWATCH_BASE}/ce19147146c3e033e95976c0fc1333fb8e96b2a9` },
      { name: 'Navy', image: `${IMG_BASE}/0275e81923989ad211ce491d95acb7c54fa66df8`, swatch: `${SWATCH_BASE}/0275e81923989ad211ce491d95acb7c54fa66df8` },
      { name: 'Neon Orange', image: `${IMG_BASE}/d8a92ac275f0306bbb6e751ae0686b54d7a74e97`, swatch: `${SWATCH_BASE}/d8a92ac275f0306bbb6e751ae0686b54d7a74e97` },
      { name: 'Teal Green', image: `${IMG_BASE}/412e876bd449477c2ab8ee78a3a718121d88378f`, swatch: `${SWATCH_BASE}/412e876bd449477c2ab8ee78a3a718121d88378f` },
      { name: 'White', image: `${IMG_BASE}/9e681f3f0b17155a9735401b667f62a333a2aeb5`, swatch: `${SWATCH_BASE}/9e681f3f0b17155a9735401b667f62a333a2aeb5` },
      { name: 'Pink Raspberry', image: `${IMG_BASE}/672906b48dfdf003c044c654e1f842b2f97a4d8f`, swatch: `${SWATCH_BASE}/672906b48dfdf003c044c654e1f842b2f97a4d8f` },
      { name: 'Red', image: `${IMG_BASE}/875fa0370ec65f2e262e8b9cfaf15591b609ad8a`, swatch: `${SWATCH_BASE}/875fa0370ec65f2e262e8b9cfaf15591b609ad8a` },
      { name: 'Carolina Blue', image: `${IMG_BASE}/72c197d986be9f444d812d0c10e2cdde0733ea94`, swatch: `${SWATCH_BASE}/72c197d986be9f444d812d0c10e2cdde0733ea94` },
      { name: 'Royal', image: `${IMG_BASE}/9050749fc955bca2aaaf31e937682ccd3b1cf440`, swatch: `${SWATCH_BASE}/9050749fc955bca2aaaf31e937682ccd3b1cf440` },
      { name: 'Brilliant Blue', image: `${IMG_BASE}/05b0b7da62dffe0fa99af08af6a3dcd82aaab8b6`, swatch: `${SWATCH_BASE}/05b0b7da62dffe0fa99af08af6a3dcd82aaab8b6` },
      { name: 'Dark Green', image: `${IMG_BASE}/304c24616a59e16872597b5d9e368d335ea1d02f`, swatch: `${SWATCH_BASE}/304c24616a59e16872597b5d9e368d335ea1d02f` },
      { name: 'Lime', image: `${IMG_BASE}/11eacf8353a10c5ef4750afa54f1af98c3218b1a`, swatch: `${SWATCH_BASE}/11eacf8353a10c5ef4750afa54f1af98c3218b1a` },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
  },
]

export const EMPLOYEE_APPAREL_INDEX: Record<string, ApparelProduct> = Object.fromEntries(
  EMPLOYEE_APPAREL_PRODUCTS.map((p) => [p.key, p]),
)

export type ApparelLineItem = {
  key: string
  name: string
  color: string
  size: string
  quantity: number
  price: number
  imageUrl?: string
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
