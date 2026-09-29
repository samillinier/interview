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

// High-resolution source used with next/image optimization for crisp rendering.
const IMG_BASE = 'https://assetly.ordermygear.com/images/w_1200,c_limit'
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
      'Moisture-wicking, snag-resistant performance polo with PosiCharge color protection.',
      '4-ounce, 100% polyester double knit',
      'Self-fabric collar · Tag-free label · 3-button placket · Open hem sleeves',
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
  {
    key: 's508-shirt',
    name: 'Port Authority Short Sleeve Easy Care Shirt. S508',
    sku: 'S508',
    price: 41.09,
    description: [
      'Wash-and-wear wrinkle-resistant shirt built for the workday.',
      '4.5-ounce, 55/45 cotton/poly',
      'Button-down collar · Dyed-to-match buttons · Left chest pocket · Back box pleat',
    ],
    image: `${IMG_BASE}/ac4e27e0d72feaf78b158c243d9fc2f62acf5c49`,
    colors: [
      { name: 'Black/Light Stone', image: `${IMG_BASE}/ac4e27e0d72feaf78b158c243d9fc2f62acf5c49`, swatch: `${SWATCH_BASE}/ac4e27e0d72feaf78b158c243d9fc2f62acf5c49` },
      { name: 'Clover Green', image: `${IMG_BASE}/ff69a2f74ae6123f7533adfa2c92a817e91764f3`, swatch: `${SWATCH_BASE}/ff69a2f74ae6123f7533adfa2c92a817e91764f3` },
      { name: 'Dark Green/Navy', image: `${IMG_BASE}/c23899795b2305fc9c9f086ee7c6e94e719b6f02`, swatch: `${SWATCH_BASE}/c23899795b2305fc9c9f086ee7c6e94e719b6f02` },
      { name: 'Light Blue/Light Stone', image: `${IMG_BASE}/755e96cce54a29aa15a940657558e38e24595dd1`, swatch: `${SWATCH_BASE}/755e96cce54a29aa15a940657558e38e24595dd1` },
      { name: 'Navy/Light Stone', image: `${IMG_BASE}/ba6d68a987f9f31df10b60de5bc037d0ed89c36c`, swatch: `${SWATCH_BASE}/ba6d68a987f9f31df10b60de5bc037d0ed89c36c` },
      { name: 'Red/Light Stone', image: `${IMG_BASE}/84c319a1e28a550baa41cf121208c4b7204a90d7`, swatch: `${SWATCH_BASE}/84c319a1e28a550baa41cf121208c4b7204a90d7` },
      { name: 'Royal/Classic Navy', image: `${IMG_BASE}/7e27ca12d135ebdb03f2dca233496c9394fcfdd6`, swatch: `${SWATCH_BASE}/7e27ca12d135ebdb03f2dca233496c9394fcfdd6` },
      { name: 'Strong Blue', image: `${IMG_BASE}/e0a469cd5ec0768d5a0222e9aa62f0ebc42388bc`, swatch: `${SWATCH_BASE}/e0a469cd5ec0768d5a0222e9aa62f0ebc42388bc` },
      { name: 'Teal Green', image: `${IMG_BASE}/24238f7e126a987909ae189f6742fa4ad350424e`, swatch: `${SWATCH_BASE}/24238f7e126a987909ae189f6742fa4ad350424e` },
      { name: 'Ultramarine Blue', image: `${IMG_BASE}/4c117cbbfb81c8ab73401c4a692b3b063dcf47ca`, swatch: `${SWATCH_BASE}/4c117cbbfb81c8ab73401c4a692b3b063dcf47ca` },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'],
  },
  {
    key: 'y540-polo',
    name: 'Port Authority Youth Silk Touch Performance Polo. Y540',
    sku: 'Y540',
    price: 29.11,
    description: [
      'Moisture-wicking, snag-resistant performance polo with PosiCharge color protection.',
      '4-ounce, 100% polyester double knit',
      'Self-fabric collar · Tag-free label · 3-button placket · Open hem sleeves',
    ],
    image: `${IMG_BASE}/eafee9f3b69ee8ea69edf1f97616d0e0c3994bff`,
    colors: [
      { name: 'Black', image: `${IMG_BASE}/eafee9f3b69ee8ea69edf1f97616d0e0c3994bff`, swatch: `${SWATCH_BASE}/eafee9f3b69ee8ea69edf1f97616d0e0c3994bff` },
      { name: 'Brilliant Blue', image: `${IMG_BASE}/409fe984c8f2ac3cd38922a9c480752ebfada34e`, swatch: `${SWATCH_BASE}/409fe984c8f2ac3cd38922a9c480752ebfada34e` },
      { name: 'Carolina Blue', image: `${IMG_BASE}/5614a50462f5282638fe956ec0b81c6e14483202`, swatch: `${SWATCH_BASE}/5614a50462f5282638fe956ec0b81c6e14483202` },
      { name: 'Dark Green', image: `${IMG_BASE}/9233d8c26bf5c305f71db620f12c30a89a5645e2`, swatch: `${SWATCH_BASE}/9233d8c26bf5c305f71db620f12c30a89a5645e2` },
      { name: 'Navy', image: `${IMG_BASE}/ddf0afbe0add4b2f185c7d1395b1f7f01693f4c2`, swatch: `${SWATCH_BASE}/ddf0afbe0add4b2f185c7d1395b1f7f01693f4c2` },
      { name: 'Royal', image: `${IMG_BASE}/7062c8c9f5112fe646e1881d442aedb5e46cc7ea`, swatch: `${SWATCH_BASE}/7062c8c9f5112fe646e1881d442aedb5e46cc7ea` },
      { name: 'White', image: `${IMG_BASE}/74842fd6b4ecd378e06bd9593ba7bde08b664218`, swatch: `${SWATCH_BASE}/74842fd6b4ecd378e06bd9593ba7bde08b664218` },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    key: 'l608-shirt',
    name: "Port Authority Women's Long Sleeve Easy Care Shirt. L608",
    sku: 'L608',
    price: 43.68,
    description: [
      'Wash-and-wear wrinkle-resistant long sleeve shirt built for the workday.',
      '4.5-ounce, 55/45 cotton/poly',
      'Open collar · Dyed-to-match buttons · Adjustable cuffs',
    ],
    image: `${IMG_BASE}/d8a51b8bf069ba94b3336a2c4fd94e0da5a89950`,
    colors: [
      { name: 'Black/Light Stone', image: `${IMG_BASE}/d8a51b8bf069ba94b3336a2c4fd94e0da5a89950`, swatch: `${SWATCH_BASE}/d8a51b8bf069ba94b3336a2c4fd94e0da5a89950` },
      { name: 'Navy/Light Stone', image: `${IMG_BASE}/20baf6ce93f0091b95cc1154a112f104207f2d8f`, swatch: `${SWATCH_BASE}/20baf6ce93f0091b95cc1154a112f104207f2d8f` },
      { name: 'Strong Blue', image: `${IMG_BASE}/4e994f9fb135f287726d131fcd878251a1d471d6`, swatch: `${SWATCH_BASE}/4e994f9fb135f287726d131fcd878251a1d471d6` },
      { name: 'Royal/Classic Navy', image: `${IMG_BASE}/d9c5c3013fd4f808bc7985af5a43ed1445afc6db`, swatch: `${SWATCH_BASE}/d9c5c3013fd4f808bc7985af5a43ed1445afc6db` },
      { name: 'Red/Light Stone', image: `${IMG_BASE}/f762103df27e9d543efb2e21a02562b69969de86`, swatch: `${SWATCH_BASE}/f762103df27e9d543efb2e21a02562b69969de86` },
      { name: 'White/Light Stone', image: `${IMG_BASE}/436ee809edb81affc675d2a2d0b65c9cb7eb7427`, swatch: `${SWATCH_BASE}/436ee809edb81affc675d2a2d0b65c9cb7eb7427` },
      { name: 'Dark Green/Navy', image: `${IMG_BASE}/bcf2e25cd62a540b68bcec13de6ea99e5c19747c`, swatch: `${SWATCH_BASE}/bcf2e25cd62a540b68bcec13de6ea99e5c19747c` },
      { name: 'Court Green', image: `${IMG_BASE}/838ab1b17f7434f2851b4037e45029cd8483eaae`, swatch: `${SWATCH_BASE}/838ab1b17f7434f2851b4037e45029cd8483eaae` },
      { name: 'Clover Green', image: `${IMG_BASE}/df344996f24bd30ac5dbf5f02aa3196b923bd556`, swatch: `${SWATCH_BASE}/df344996f24bd30ac5dbf5f02aa3196b923bd556` },
      { name: 'Teal Green', image: `${IMG_BASE}/6d61ac00ddf1ead5fbeb6d3fca57c0e40e7cc30f`, swatch: `${SWATCH_BASE}/6d61ac00ddf1ead5fbeb6d3fca57c0e40e7cc30f` },
      { name: 'Ultramarine Blue', image: `${IMG_BASE}/9c28610bb6c4bc746f4373819e33b815126a45a9`, swatch: `${SWATCH_BASE}/9c28610bb6c4bc746f4373819e33b815126a45a9` },
      { name: 'Light Pink', image: `${IMG_BASE}/36a055f21abb0fe2b660d9731306bdc79ddb971a`, swatch: `${SWATCH_BASE}/36a055f21abb0fe2b660d9731306bdc79ddb971a` },
      { name: 'Light Blue/Light Stone', image: `${IMG_BASE}/28c8bfa68e8bfae1ef014f0b61671febfa316cf7`, swatch: `${SWATCH_BASE}/28c8bfa68e8bfae1ef014f0b61671febfa316cf7` },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'],
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
