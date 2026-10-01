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

// Apparel Giant (Sport Shirt Outlet) product imagery for the K528 Fine Jacquard Polo.
const AG_IMG_BASE = 'https://www.apparelgiant.com/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/k/5'
const AG_SWATCH_BASE = 'https://www.apparelgiant.com/media/catalog/product/cache/3380650127d143eec657262365bd2ea0/k/5'

/**
 * Employee Apparel order catalog.
 * Product data (name, price, description, colors, and imagery) mirrors the
 * official Floor Interior Services Corp Store on Fully Promoted.
 */
export const EMPLOYEE_APPAREL_PRODUCTS: ApparelProduct[] = [
  {
    key: 's608-shirt',
    name: "Port Authority Long Sleeve Easy Care Shirt S608",
    sku: 'S608',
    price: 43.68,
    description: [
      "Wash-and-wear wrinkle-resistant long sleeve shirt built for the workday.",
      "4.5-ounce, 55/45 cotton/poly",
      "Button-down collar · Dyed-to-match buttons · Chest pocket · Adjustable cuffs",
    ],
    image: `${IMG_BASE}/69c10face09d499b74e314bf995515e84cd3f0b6`,
    colors: [
      { name: "Black/Lt Stone", image: `${IMG_BASE}/69c10face09d499b74e314bf995515e84cd3f0b6`, swatch: `${SWATCH_BASE}/69c10face09d499b74e314bf995515e84cd3f0b6` },
      { name: "Clover Green", image: `${IMG_BASE}/0a4e030d2fe154a93c278cf39fd7e336d76771ae`, swatch: `${SWATCH_BASE}/0a4e030d2fe154a93c278cf39fd7e336d76771ae` },
      { name: "Court Green", image: `${IMG_BASE}/2d115b9a4adbe3c35088fd2f102fa1b8f41e771e`, swatch: `${SWATCH_BASE}/2d115b9a4adbe3c35088fd2f102fa1b8f41e771e` },
      { name: "Dark Green/Nvy", image: `${IMG_BASE}/e5a9d90209fdd11c8c203f1e140e15e790fd862a`, swatch: `${SWATCH_BASE}/e5a9d90209fdd11c8c203f1e140e15e790fd862a` },
      { name: "Light Pink", image: `${IMG_BASE}/695285f476962bf3d2f607a492fe65f841b8307a`, swatch: `${SWATCH_BASE}/695285f476962bf3d2f607a492fe65f841b8307a` },
      { name: "Lt Blue/Lt Stn", image: `${IMG_BASE}/0758ceabe1e6bc769f1c3ad9d48459e5678be427`, swatch: `${SWATCH_BASE}/0758ceabe1e6bc769f1c3ad9d48459e5678be427` },
      { name: "Navy/Lt Stone", image: `${IMG_BASE}/fea9ef301dbde4aa38e6da991ff6aeb1145658ae`, swatch: `${SWATCH_BASE}/fea9ef301dbde4aa38e6da991ff6aeb1145658ae` },
      { name: "Red/Lt Stone", image: `${IMG_BASE}/b1ba09e535fc1030a9a1cb30a6b7e6a0855d8da3`, swatch: `${SWATCH_BASE}/b1ba09e535fc1030a9a1cb30a6b7e6a0855d8da3` },
      { name: "Royal/Cl Navy", image: `${IMG_BASE}/be74e5e92e491611d4a7e57fed2eba0b0fefb877`, swatch: `${SWATCH_BASE}/be74e5e92e491611d4a7e57fed2eba0b0fefb877` },
      { name: "Strong Blue", image: `${IMG_BASE}/f6e739489f6743e67a5f6e79c8eeb278895063cc`, swatch: `${SWATCH_BASE}/f6e739489f6743e67a5f6e79c8eeb278895063cc` },
      { name: "Teal Green", image: `${IMG_BASE}/e3d63ee7035f58839cb4f8a8077e6ba43cb62f49`, swatch: `${SWATCH_BASE}/e3d63ee7035f58839cb4f8a8077e6ba43cb62f49` },
      { name: "Ultramarne Blu", image: `${IMG_BASE}/1c070de69b0843fc3b2cf538a9fa0d960bf31e1a`, swatch: `${SWATCH_BASE}/1c070de69b0843fc3b2cf538a9fa0d960bf31e1a` },
      { name: "White/Lt Stone", image: `${IMG_BASE}/c0fdcb3447ca85027eee94f0351938db690fd88c`, swatch: `${SWATCH_BASE}/c0fdcb3447ca85027eee94f0351938db690fd88c` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"],
  },
  {
    key: 's639-shirt',
    name: "Port Authority Plaid Pattern Easy Care Shirt. S639",
    sku: 'S639',
    price: 48.88,
    description: [
      "Not-too-bold plaid pattern for a welcome break from solid color.",
      "3.2-ounce, 55/45 cotton/poly poplin",
      "Button-down collar · Pearlized buttons · Chest pocket · Adjustable cuffs",
    ],
    image: `${IMG_BASE}/bd265bf7b49732832e62d73f873d35959d7a6129`,
    colors: [
      { name: "Navy", image: `${IMG_BASE}/bd265bf7b49732832e62d73f873d35959d7a6129`, swatch: `${SWATCH_BASE}/bd265bf7b49732832e62d73f873d35959d7a6129` },
      { name: "White", image: `${IMG_BASE}/7f0802d9677663f0d7336d742dcccb99dd36aefc`, swatch: `${SWATCH_BASE}/7f0802d9677663f0d7336d742dcccb99dd36aefc` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  },
  {
    key: 'k540-polo',
    name: "Port Authority Silk Touch Performance Polo. K540",
    sku: 'K540',
    price: 30.68,
    description: [
      "Moisture-wicking, snag-resistant performance polo with PosiCharge color protection.",
      "4-ounce, 100% polyester double knit",
      "Self-fabric collar · Tag-free label · 3-button placket · Open hem sleeves",
    ],
    image: `${IMG_BASE}/ce19147146c3e033e95976c0fc1333fb8e96b2a9`,
    colors: [
      { name: "Black", image: `${IMG_BASE}/ce19147146c3e033e95976c0fc1333fb8e96b2a9`, swatch: `${SWATCH_BASE}/ce19147146c3e033e95976c0fc1333fb8e96b2a9` },
      { name: "Brilliant Blue", image: `${IMG_BASE}/9050749fc955bca2aaaf31e937682ccd3b1cf440`, swatch: `${SWATCH_BASE}/9050749fc955bca2aaaf31e937682ccd3b1cf440` },
      { name: "Carolina Blue", image: `${IMG_BASE}/875fa0370ec65f2e262e8b9cfaf15591b609ad8a`, swatch: `${SWATCH_BASE}/875fa0370ec65f2e262e8b9cfaf15591b609ad8a` },
      { name: "Dark Green", image: `${IMG_BASE}/05b0b7da62dffe0fa99af08af6a3dcd82aaab8b6`, swatch: `${SWATCH_BASE}/05b0b7da62dffe0fa99af08af6a3dcd82aaab8b6` },
      { name: "Lime", image: `${IMG_BASE}/304c24616a59e16872597b5d9e368d335ea1d02f`, swatch: `${SWATCH_BASE}/304c24616a59e16872597b5d9e368d335ea1d02f` },
      { name: "Navy", image: `${IMG_BASE}/11eacf8353a10c5ef4750afa54f1af98c3218b1a`, swatch: `${SWATCH_BASE}/11eacf8353a10c5ef4750afa54f1af98c3218b1a` },
      { name: "Neon Orange", image: `${IMG_BASE}/0275e81923989ad211ce491d95acb7c54fa66df8`, swatch: `${SWATCH_BASE}/0275e81923989ad211ce491d95acb7c54fa66df8` },
      { name: "Pink Raspberry", image: `${IMG_BASE}/9e681f3f0b17155a9735401b667f62a333a2aeb5`, swatch: `${SWATCH_BASE}/9e681f3f0b17155a9735401b667f62a333a2aeb5` },
      { name: "Red", image: `${IMG_BASE}/672906b48dfdf003c044c654e1f842b2f97a4d8f`, swatch: `${SWATCH_BASE}/672906b48dfdf003c044c654e1f842b2f97a4d8f` },
      { name: "Royal", image: `${IMG_BASE}/72c197d986be9f444d812d0c10e2cdde0733ea94`, swatch: `${SWATCH_BASE}/72c197d986be9f444d812d0c10e2cdde0733ea94` },
      { name: "Teal Green", image: `${IMG_BASE}/d8a92ac275f0306bbb6e751ae0686b54d7a74e97`, swatch: `${SWATCH_BASE}/d8a92ac275f0306bbb6e751ae0686b54d7a74e97` },
      { name: "White", image: `${IMG_BASE}/412e876bd449477c2ab8ee78a3a718121d88378f`, swatch: `${SWATCH_BASE}/412e876bd449477c2ab8ee78a3a718121d88378f` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"],
  },
  {
    key: 'k528-polo',
    name: "Port Authority Men's Performance Fine Jacquard Polo. K528",
    sku: 'K528',
    price: 34.25,
    description: [
      "Lightweight and breathable, this shirt features a subtle jacquard texture. Designed with moisture-wicking performance, this shirt will help keep you cool and dry.",
      "4.1-ounce, 100% polyester",
      "Flat knit collar",
      "3-button placket with pearlized smoke tone buttons; white buttons on White",
      "Open hem sleeves",
      "Sizes XS–XL: $34.25 · 2XL–4XL: $36.25",
    ],
    image: `${AG_IMG_BASE}/k528_oceanblue_model_front_072014.jpg`,
    colors: [
      { name: "Autumn Orange", image: `${AG_IMG_BASE}/k528_autumnorange_model_front_072014.jpg`, swatch: `${AG_SWATCH_BASE}/k528_autumnorange_model_front_072014.jpg` },
      { name: "Black", image: `${AG_IMG_BASE}/k528_black_model_front_072014.jpg`, swatch: `${AG_SWATCH_BASE}/k528_black_model_front_072014.jpg` },
      { name: "Green Glen", image: `${AG_IMG_BASE}/k528_greenglen_model_front_072014.jpg`, swatch: `${AG_SWATCH_BASE}/k528_greenglen_model_front_072014.jpg` },
      { name: "Grey Smoke", image: `${AG_IMG_BASE}/k528_greysmoke_model_front_072014.jpg`, swatch: `${AG_SWATCH_BASE}/k528_greysmoke_model_front_072014.jpg` },
      { name: "Hyper Blue", image: `${AG_IMG_BASE}/k528_hyperblue_model_front_072014.jpg`, swatch: `${AG_SWATCH_BASE}/k528_hyperblue_model_front_072014.jpg` },
      { name: "Ocean Blue", image: `${AG_IMG_BASE}/k528_oceanblue_model_front_072014.jpg`, swatch: `${AG_SWATCH_BASE}/k528_oceanblue_model_front_072014.jpg` },
      { name: "Rich Red", image: `${AG_IMG_BASE}/k528_richred_model_front_072014.jpg`, swatch: `${AG_SWATCH_BASE}/k528_richred_model_front_072014.jpg` },
      { name: "True Navy", image: `${AG_IMG_BASE}/k528_truenavy_model_front_072014.jpg`, swatch: `${AG_SWATCH_BASE}/k528_truenavy_model_front_072014.jpg` },
      { name: "Vine Green", image: `${AG_IMG_BASE}/k528_vinegreen_model_front_072014.jpg`, swatch: `${AG_SWATCH_BASE}/k528_vinegreen_model_front_072014.jpg` },
      { name: "Violet Purple", image: `${AG_IMG_BASE}/k528_violetpurple_model_front_072014.jpg`, swatch: `${AG_SWATCH_BASE}/k528_violetpurple_model_front_072014.jpg` },
      { name: "White", image: `${AG_IMG_BASE}/k528_white_model_front_072014.jpg`, swatch: `${AG_SWATCH_BASE}/k528_white_model_front_072014.jpg` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  },
  {
    key: 'l540-polo',
    name: "Port Authority Women's Silk Touch Performance Polo. L540",
    sku: 'L540',
    price: 30.68,
    description: [
      "Moisture-wicking, snag-resistant performance polo with PosiCharge color protection.",
      "4-ounce, 100% polyester double knit",
      "V-neck placket · Self-fabric collar · Tag-free label · Open hem sleeves",
    ],
    image: `${IMG_BASE}/99238636a4a42760b021466e8224032224cd788a`,
    colors: [
      { name: "Black", image: `${IMG_BASE}/99238636a4a42760b021466e8224032224cd788a`, swatch: `${SWATCH_BASE}/99238636a4a42760b021466e8224032224cd788a` },
      { name: "Brilliant Blue", image: `${IMG_BASE}/8c2472f2d07d34446006e9a604b06e3923fedb7e`, swatch: `${SWATCH_BASE}/8c2472f2d07d34446006e9a604b06e3923fedb7e` },
      { name: "Carolina Blue", image: `${IMG_BASE}/239ad840cee76db5f51b84de02aef8f171496bd5`, swatch: `${SWATCH_BASE}/239ad840cee76db5f51b84de02aef8f171496bd5` },
      { name: "Dark Green", image: `${IMG_BASE}/059888c4e048d8274ca830a1a9ae8d245e2ea0e0`, swatch: `${SWATCH_BASE}/059888c4e048d8274ca830a1a9ae8d245e2ea0e0` },
      { name: "Lime", image: `${IMG_BASE}/922d17263b1fe60d6aef8fcc499103c696117ece`, swatch: `${SWATCH_BASE}/922d17263b1fe60d6aef8fcc499103c696117ece` },
      { name: "Navy", image: `${IMG_BASE}/d818ce32124c780402a5d1eb226893013406bf6e`, swatch: `${SWATCH_BASE}/d818ce32124c780402a5d1eb226893013406bf6e` },
      { name: "Neon Orange", image: `${IMG_BASE}/d81734eed625542cda170e1bb67d8978a8b84907`, swatch: `${SWATCH_BASE}/d81734eed625542cda170e1bb67d8978a8b84907` },
      { name: "Pink Raspberry", image: `${IMG_BASE}/1b0529a3d7595cafc3157c57002d48da9f011834`, swatch: `${SWATCH_BASE}/1b0529a3d7595cafc3157c57002d48da9f011834` },
      { name: "Red", image: `${IMG_BASE}/66c45dfe14601bcffbfc9c60c7ffa8ad510fd916`, swatch: `${SWATCH_BASE}/66c45dfe14601bcffbfc9c60c7ffa8ad510fd916` },
      { name: "Royal", image: `${IMG_BASE}/5874cac044ce7600c65403bec17ec40bcb8de05d`, swatch: `${SWATCH_BASE}/5874cac044ce7600c65403bec17ec40bcb8de05d` },
      { name: "Teal Green", image: `${IMG_BASE}/293dc67a9cac9b4206ec6e70e15168a33e1b509f`, swatch: `${SWATCH_BASE}/293dc67a9cac9b4206ec6e70e15168a33e1b509f` },
      { name: "White", image: `${IMG_BASE}/b5c19b820e5214dac3b3acf634fc189df3dcd1dd`, swatch: `${SWATCH_BASE}/b5c19b820e5214dac3b3acf634fc189df3dcd1dd` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  },
  {
    key: 'y540-polo',
    name: "Port Authority Youth Silk Touch Performance Polo. Y540",
    sku: 'Y540',
    price: 29.11,
    description: [
      "Moisture-wicking, snag-resistant performance polo with PosiCharge color protection.",
      "4-ounce, 100% polyester double knit",
      "Self-fabric collar · Tag-free label · 3-button placket · Open hem sleeves",
    ],
    image: `${IMG_BASE}/eafee9f3b69ee8ea69edf1f97616d0e0c3994bff`,
    colors: [
      { name: "Black", image: `${IMG_BASE}/eafee9f3b69ee8ea69edf1f97616d0e0c3994bff`, swatch: `${SWATCH_BASE}/eafee9f3b69ee8ea69edf1f97616d0e0c3994bff` },
      { name: "Brilliant Blue", image: `${IMG_BASE}/409fe984c8f2ac3cd38922a9c480752ebfada34e`, swatch: `${SWATCH_BASE}/409fe984c8f2ac3cd38922a9c480752ebfada34e` },
      { name: "Carolina Blue", image: `${IMG_BASE}/5614a50462f5282638fe956ec0b81c6e14483202`, swatch: `${SWATCH_BASE}/5614a50462f5282638fe956ec0b81c6e14483202` },
      { name: "Dark Green", image: `${IMG_BASE}/9233d8c26bf5c305f71db620f12c30a89a5645e2`, swatch: `${SWATCH_BASE}/9233d8c26bf5c305f71db620f12c30a89a5645e2` },
      { name: "Navy", image: `${IMG_BASE}/ddf0afbe0add4b2f185c7d1395b1f7f01693f4c2`, swatch: `${SWATCH_BASE}/ddf0afbe0add4b2f185c7d1395b1f7f01693f4c2` },
      { name: "Royal", image: `${IMG_BASE}/7062c8c9f5112fe646e1881d442aedb5e46cc7ea`, swatch: `${SWATCH_BASE}/7062c8c9f5112fe646e1881d442aedb5e46cc7ea` },
      { name: "White", image: `${IMG_BASE}/74842fd6b4ecd378e06bd9593ba7bde08b664218`, swatch: `${SWATCH_BASE}/74842fd6b4ecd378e06bd9593ba7bde08b664218` },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    key: 'st853-jacket',
    name: "Sport-Tek Sport-Wick Stretch Contrast Full-Zip Jacket. ST853",
    sku: 'ST853',
    price: 61.36,
    description: [
      "Moisture-wicking, soft-brushed stretch jacket with contrast color hits.",
      "6.8-ounce, 90/10 poly/spandex jersey",
      "Cadet collar · Contrast reverse coil zipper · Contrast cuffs · Front pockets",
    ],
    image: `${IMG_BASE}/c32e822ba1bf495a90c10ca028bd06ef2bd77de2`,
    colors: [
      { name: "Blk/Char Grey", image: `${IMG_BASE}/c32e822ba1bf495a90c10ca028bd06ef2bd77de2`, swatch: `${SWATCH_BASE}/c32e822ba1bf495a90c10ca028bd06ef2bd77de2` },
      { name: "Blk/True Red", image: `${IMG_BASE}/2888c6b68f21b364a259375e219817b6a5b3beaa`, swatch: `${SWATCH_BASE}/2888c6b68f21b364a259375e219817b6a5b3beaa` },
      { name: "Blk/True Royal", image: `${IMG_BASE}/bc2c968d5f830017dba74e6685510ad356590822`, swatch: `${SWATCH_BASE}/bc2c968d5f830017dba74e6685510ad356590822` },
      { name: "CGH/Charge Grn", image: `${IMG_BASE}/620be16a75b265f516b522b3442bb8c75b84ff7a`, swatch: `${SWATCH_BASE}/620be16a75b265f516b522b3442bb8c75b84ff7a` },
      { name: "CGH/True Navy", image: `${IMG_BASE}/e0c12ce95cab25368161517a0b240aa29a10d240`, swatch: `${SWATCH_BASE}/e0c12ce95cab25368161517a0b240aa29a10d240` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  },
  {
    key: 'lst853-jacket',
    name: "Sport-Tek Women's Sport-Wick Stretch Contrast Full-Zip Jacket. LST853",
    sku: 'LST853',
    price: 61.36,
    description: [
      "Moisture-wicking, soft-brushed stretch jacket with contrast color hits.",
      "6.8-ounce, 90/10 poly/spandex jersey",
      "Cadet collar · Contrast zipper · Thumbholes · Contrast front pockets",
    ],
    image: `${IMG_BASE}/7dbdbb9bab59ec7142a9068b1ef9c856d022cb6b`,
    colors: [
      { name: "Blk/Char Grey", image: `${IMG_BASE}/7dbdbb9bab59ec7142a9068b1ef9c856d022cb6b`, swatch: `${SWATCH_BASE}/7dbdbb9bab59ec7142a9068b1ef9c856d022cb6b` },
      { name: "Blk/True Red", image: `${IMG_BASE}/34b9962269f560e82a6f77a29a72d7b6bce4db54`, swatch: `${SWATCH_BASE}/34b9962269f560e82a6f77a29a72d7b6bce4db54` },
      { name: "Blk/True Royal", image: `${IMG_BASE}/a694f58e648d915dee67b38acf694a224d01c159`, swatch: `${SWATCH_BASE}/a694f58e648d915dee67b38acf694a224d01c159` },
      { name: "CGH/Charge Grn", image: `${IMG_BASE}/eaa73d22ed596ac6bc8c38f7ebc04a16f9afb2bc`, swatch: `${SWATCH_BASE}/eaa73d22ed596ac6bc8c38f7ebc04a16f9afb2bc` },
      { name: "CGH/Pink Rush", image: `${IMG_BASE}/9d9c319095c87ad86a3ed7628ca189e51f18ff01`, swatch: `${SWATCH_BASE}/9d9c319095c87ad86a3ed7628ca189e51f18ff01` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  },
  {
    key: 'j317-jacket',
    name: "Port Authority Core Soft Shell Jacket. J317",
    sku: 'J317',
    price: 56.16,
    description: [
      "Wind- and water-repellent soft shell, ideal for corporate uniforming.",
      "Polyester shell bonded to microfleece lining",
      "Zip-through collar · Front zippered pockets · Open cuffs and hem",
    ],
    image: `${IMG_BASE}/30c73e8119f36c8c544cb0c6c6093fb65b58cf75`,
    colors: [
      { name: "Black", image: `${IMG_BASE}/30c73e8119f36c8c544cb0c6c6093fb65b58cf75`, swatch: `${SWATCH_BASE}/30c73e8119f36c8c544cb0c6c6093fb65b58cf75` },
      { name: "Dress Blue Nvy", image: `${IMG_BASE}/c8ebeb08c41d09fe85d9a5ae307aa4b9056f5f52`, swatch: `${SWATCH_BASE}/c8ebeb08c41d09fe85d9a5ae307aa4b9056f5f52` },
      { name: "Forest Green", image: `${IMG_BASE}/934b18f456b413e927c8e3f9ed3e9de1fdb3bc7a`, swatch: `${SWATCH_BASE}/934b18f456b413e927c8e3f9ed3e9de1fdb3bc7a` },
      { name: "Navy Heather", image: `${IMG_BASE}/23b58d072b7bbcf0eada2c9b882258f32761884f`, swatch: `${SWATCH_BASE}/23b58d072b7bbcf0eada2c9b882258f32761884f` },
      { name: "Rich Red", image: `${IMG_BASE}/dfe7019134cff4e5c6e8de22462b983692e2b73e`, swatch: `${SWATCH_BASE}/dfe7019134cff4e5c6e8de22462b983692e2b73e` },
      { name: "True Royal", image: `${IMG_BASE}/a626d091e76bd10262e865821702c960926862f3`, swatch: `${SWATCH_BASE}/a626d091e76bd10262e865821702c960926862f3` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"],
  },
  {
    key: 'l317-jacket',
    name: "Port Authority Women's Core Soft Shell Jacket. L317",
    sku: 'L317',
    price: 56.16,
    description: [
      "Wind- and water-repellent soft shell, ideal for corporate uniforming.",
      "Polyester shell bonded to microfleece lining",
      "Zip-through collar · Front zippered pockets · Open cuffs and hem",
    ],
    image: `${IMG_BASE}/ab2c4e50806ced1c74dad54a4dd8d4164d6d8b43`,
    colors: [
      { name: "Black", image: `${IMG_BASE}/ab2c4e50806ced1c74dad54a4dd8d4164d6d8b43`, swatch: `${SWATCH_BASE}/ab2c4e50806ced1c74dad54a4dd8d4164d6d8b43` },
      { name: "Black Char Hth", image: `${IMG_BASE}/196e9de381fc8c40e99e0985c5ba0c9b410835eb`, swatch: `${SWATCH_BASE}/196e9de381fc8c40e99e0985c5ba0c9b410835eb` },
      { name: "Dress Blue Nvy", image: `${IMG_BASE}/274ea501625a58b8a063172acb39ee019fc350a0`, swatch: `${SWATCH_BASE}/274ea501625a58b8a063172acb39ee019fc350a0` },
      { name: "Navy Heather", image: `${IMG_BASE}/e1e3f529d26788a715dc98d88fb4b41b545bf959`, swatch: `${SWATCH_BASE}/e1e3f529d26788a715dc98d88fb4b41b545bf959` },
      { name: "Rich Red", image: `${IMG_BASE}/13a8f3786135062070279f2544cd51735e6cd351`, swatch: `${SWATCH_BASE}/13a8f3786135062070279f2544cd51735e6cd351` },
      { name: "True Royal", image: `${IMG_BASE}/1162220fa8e2bd55a7d19dd7741bdfc1ed9d2ebc`, swatch: `${SWATCH_BASE}/1162220fa8e2bd55a7d19dd7741bdfc1ed9d2ebc` },
      { name: "Very Berry", image: `${IMG_BASE}/3817a98d6ebc82e036fedcf0190222932ebd372a`, swatch: `${SWATCH_BASE}/3817a98d6ebc82e036fedcf0190222932ebd372a` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  },
  {
    key: 'dt1101-hoodie',
    name: "District Perfect Weight Fleece Hoodie DT1101",
    sku: 'DT1101',
    price: 44.72,
    description: [
      "Premium 9-ounce fleece hoodie with jersey-lined hood.",
      "80/20 combed ring spun cotton/polyester, 3-end fleece",
      "Drawcords with metal tips · Rib knit cuffs and hem",
    ],
    image: `${IMG_BASE}/6eca6f4b2f4bba78a03351b5d3b657e24858caa7`,
    colors: [
      { name: "BlueFog", image: `${IMG_BASE}/6eca6f4b2f4bba78a03351b5d3b657e24858caa7`, swatch: `${SWATCH_BASE}/6eca6f4b2f4bba78a03351b5d3b657e24858caa7` },
      { name: "DeepRoyal", image: `${IMG_BASE}/58133b75951f4d53b0e681281aac6f3780a5b6b6`, swatch: `${SWATCH_BASE}/58133b75951f4d53b0e681281aac6f3780a5b6b6` },
      { name: "DeepStlBlu", image: `${IMG_BASE}/149ca646282d5d342d27a66146fcab680d0dd636`, swatch: `${SWATCH_BASE}/149ca646282d5d342d27a66146fcab680d0dd636` },
      { name: "He Forest Grn", image: `${IMG_BASE}/61c40563014c2f593d553240a13c88e3b2b7cecb`, swatch: `${SWATCH_BASE}/61c40563014c2f593d553240a13c88e3b2b7cecb` },
      { name: "HtdNavy", image: `${IMG_BASE}/35e9ad4d3df5aab84e47110d8e438c919ea0a8ce`, swatch: `${SWATCH_BASE}/35e9ad4d3df5aab84e47110d8e438c919ea0a8ce` },
      { name: "Jet Black", image: `${IMG_BASE}/312924041a7b20ed0f7dec93f51ca922c7bde6dd`, swatch: `${SWATCH_BASE}/312924041a7b20ed0f7dec93f51ca922c7bde6dd` },
      { name: "LaurelGrn", image: `${IMG_BASE}/4ea3e303a73f1b232c396624b6c70f27f64260d7`, swatch: `${SWATCH_BASE}/4ea3e303a73f1b232c396624b6c70f27f64260d7` },
      { name: "New Navy", image: `${IMG_BASE}/8c2ca968efe4575d1bf53fd8e3d0364b27a72fae`, swatch: `${SWATCH_BASE}/8c2ca968efe4575d1bf53fd8e3d0364b27a72fae` },
      { name: "OrchidHaze", image: `${IMG_BASE}/3086a8171c52debb8edd00f331ebb4b0abc01b04`, swatch: `${SWATCH_BASE}/3086a8171c52debb8edd00f331ebb4b0abc01b04` },
      { name: "Rainforest", image: `${IMG_BASE}/9f8b2da6245514a7d076110180d55fbf44c33f68`, swatch: `${SWATCH_BASE}/9f8b2da6245514a7d076110180d55fbf44c33f68` },
      { name: "Tanzanite", image: `${IMG_BASE}/799926612fb920da4739353bee7a2b1a3a98cc94`, swatch: `${SWATCH_BASE}/799926612fb920da4739353bee7a2b1a3a98cc94` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  },
  {
    key: 'wp6500-jacket',
    name: "Weatherproof 6500 Soft Shell Jacket",
    sku: 'WP-6500',
    price: 92.58,
    description: [
      "Wind- and water-resistant soft shell jacket.",
      "10.3 oz., 95/5 polyester/spandex shell, brushed lining",
      "Zippered slash pockets with left chest pocket",
    ],
    image: `${IMG_BASE}/8f5cebbe95057a644e8491d5c245e68285b04f3e`,
    colors: [
      { name: "Black", image: `${IMG_BASE}/8f5cebbe95057a644e8491d5c245e68285b04f3e`, swatch: `${SWATCH_BASE}/8f5cebbe95057a644e8491d5c245e68285b04f3e` },
      { name: "Navy", image: `${IMG_BASE}/a40c2a6ea1f9c5f194e26c00e76b5c9dcaeb7066`, swatch: `${SWATCH_BASE}/a40c2a6ea1f9c5f194e26c00e76b5c9dcaeb7066` },
    ],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
  },
  {
    key: 'w6500-jacket',
    name: "Women's Soft Shell Jacket - W6500",
    sku: 'W6500',
    price: 92.58,
    description: [
      "Wind- and water-resistant soft shell jacket.",
      "9.6 oz., 95/5 polyester/spandex shell, brushed lining",
      "Two zippered slash pockets · Elastic cuffs",
    ],
    image: `${IMG_BASE}/7214f88ff5bfcf8d97fea6eac0cd1fa376d4fcf4`,
    colors: [
      { name: "Black", image: `${IMG_BASE}/7214f88ff5bfcf8d97fea6eac0cd1fa376d4fcf4`, swatch: `${SWATCH_BASE}/7214f88ff5bfcf8d97fea6eac0cd1fa376d4fcf4` },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
  },
  {
    key: 'bg223-backpack',
    name: "Port Authority Exec Backpack. BG223",
    sku: 'BG223',
    price: 74.89,
    description: [
      "1,680D ballistic polyester executive backpack.",
      "Dedicated laptop compartment · Tricot-lined valuables pocket",
      "Air mesh straps · Luggage trolley pass-through",
    ],
    image: `${IMG_BASE}/155367d429602da483953d304fe0132f4a15be68`,
    colors: [
      { name: "Black", image: `${IMG_BASE}/155367d429602da483953d304fe0132f4a15be68`, swatch: `${SWATCH_BASE}/155367d429602da483953d304fe0132f4a15be68` },
      { name: "Graph Heather/Black", image: `${IMG_BASE}/92fc4c30d29e13b19c63df47efa06b792ac16d9d`, swatch: `${SWATCH_BASE}/92fc4c30d29e13b19c63df47efa06b792ac16d9d` },
    ],
    sizes: ["One Size"],
  },
  {
    key: 'bg235-backpack',
    name: "Port Authority Matte Backpack BG235",
    sku: 'BG235',
    price: 47.33,
    description: [
      "Smooth matte polyester backpack that fits most 16\" laptops.",
      "Zippered main compartment · Pleated front pocket",
      "Adjustable straps · Side pocket · Web carry handle",
    ],
    image: `${IMG_BASE}/d26378701dd860afb589fce45b6dddb56c69a3c6`,
    colors: [
      { name: "DeepBlack", image: `${IMG_BASE}/d26378701dd860afb589fce45b6dddb56c69a3c6`, swatch: `${SWATCH_BASE}/d26378701dd860afb589fce45b6dddb56c69a3c6` },
    ],
    sizes: ["One Size"],
  },
  {
    key: 'pc380-tee',
    name: "Port & Co Performance Tee. PC380",
    sku: 'PC380',
    price: 15.59,
    description: [
      "UPF50 performance tee with Dry Zone moisture-wicking.",
      "3.8-ounce, 100% polyester",
      "Tear-away label",
    ],
    image: `${IMG_BASE}/e85274673f478452724c4b409dec82dfa3104fd9`,
    colors: [
      { name: "Ath Maroon", image: `${IMG_BASE}/e85274673f478452724c4b409dec82dfa3104fd9`, swatch: `${SWATCH_BASE}/e85274673f478452724c4b409dec82dfa3104fd9` },
      { name: "Carolina Blue", image: `${IMG_BASE}/e6ab1c13b5e7375801aab8abd55504b204cb2ae1`, swatch: `${SWATCH_BASE}/e6ab1c13b5e7375801aab8abd55504b204cb2ae1` },
      { name: "Dark Green", image: `${IMG_BASE}/b5107d627fc065870609a98e9785ec04f4a6bf6d`, swatch: `${SWATCH_BASE}/b5107d627fc065870609a98e9785ec04f4a6bf6d` },
      { name: "Deep Navy", image: `${IMG_BASE}/384d62e7ec3af22e2d684e0989f8328c391381e8`, swatch: `${SWATCH_BASE}/384d62e7ec3af22e2d684e0989f8328c391381e8` },
      { name: "DeepOrange", image: `${IMG_BASE}/3fc64206bb34ccf489682d2d81c657ae755f7513`, swatch: `${SWATCH_BASE}/3fc64206bb34ccf489682d2d81c657ae755f7513` },
      { name: "Gold", image: `${IMG_BASE}/76c52d53868cf4648f49d71fa847693496ff85f9`, swatch: `${SWATCH_BASE}/76c52d53868cf4648f49d71fa847693496ff85f9` },
      { name: "Jet Black", image: `${IMG_BASE}/8a735fab5b460bab78170cbea54493d02f9e2bc1`, swatch: `${SWATCH_BASE}/8a735fab5b460bab78170cbea54493d02f9e2bc1` },
      { name: "Kelly", image: `${IMG_BASE}/422b3f623d7ddc100134d2b1dba4957ed30a65f2`, swatch: `${SWATCH_BASE}/422b3f623d7ddc100134d2b1dba4957ed30a65f2` },
      { name: "Neon Blue", image: `${IMG_BASE}/45d034506f75518bf0c1906dfc2805fe014904de`, swatch: `${SWATCH_BASE}/45d034506f75518bf0c1906dfc2805fe014904de` },
      { name: "Neon Green", image: `${IMG_BASE}/4493d4fdfdbe7df40dc39ffdd8f21f2b044ba0ce`, swatch: `${SWATCH_BASE}/4493d4fdfdbe7df40dc39ffdd8f21f2b044ba0ce` },
      { name: "Neon Orange", image: `${IMG_BASE}/afe514e5e5209c5227fb28fd5ed4d98cb93c0b14`, swatch: `${SWATCH_BASE}/afe514e5e5209c5227fb28fd5ed4d98cb93c0b14` },
      { name: "Neon Pink", image: `${IMG_BASE}/86084ba3152b89a49071053582287c802056f85f`, swatch: `${SWATCH_BASE}/86084ba3152b89a49071053582287c802056f85f` },
      { name: "Neon Yellow", image: `${IMG_BASE}/0f3e46e4dd7b2e265dac518971994eb2462ac0a0`, swatch: `${SWATCH_BASE}/0f3e46e4dd7b2e265dac518971994eb2462ac0a0` },
      { name: "OlvDrabGn", image: `${IMG_BASE}/a33dd4e4b8bb25f5e4a33fcf2bfd32aa9082e7e4`, swatch: `${SWATCH_BASE}/a33dd4e4b8bb25f5e4a33fcf2bfd32aa9082e7e4` },
      { name: "Red", image: `${IMG_BASE}/7b556b1f48e0dae7127f413ddd7a6e38ec85a428`, swatch: `${SWATCH_BASE}/7b556b1f48e0dae7127f413ddd7a6e38ec85a428` },
      { name: "Royal", image: `${IMG_BASE}/f605bde4bcec84fcd33e0a5eedf8e38f0c0787bc`, swatch: `${SWATCH_BASE}/f605bde4bcec84fcd33e0a5eedf8e38f0c0787bc` },
      { name: "TrueNavy", image: `${IMG_BASE}/bf71e3f66c0099eb18d591a2fd0382c081102c27`, swatch: `${SWATCH_BASE}/bf71e3f66c0099eb18d591a2fd0382c081102c27` },
      { name: "TrueRoyal", image: `${IMG_BASE}/3aa7b7344370e65594c70cd281db4ae105044f09`, swatch: `${SWATCH_BASE}/3aa7b7344370e65594c70cd281db4ae105044f09` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  },
  {
    key: 'lpc380-tee',
    name: "Port & Co Women's Performance Tee. LPC380",
    sku: 'LPC380',
    price: 15.59,
    description: [
      "UPF50 performance tee with Dry Zone moisture-wicking.",
      "3.8-ounce, 100% polyester",
      "Tear-away label",
    ],
    image: `${IMG_BASE}/9e21f2f113d14106878d50f6bc992d0ed7b78ebd`,
    colors: [
      { name: "Deep Navy", image: `${IMG_BASE}/9e21f2f113d14106878d50f6bc992d0ed7b78ebd`, swatch: `${SWATCH_BASE}/9e21f2f113d14106878d50f6bc992d0ed7b78ebd` },
      { name: "Jet Black", image: `${IMG_BASE}/d4277352efc7f86d732cc761f776d3315e957150`, swatch: `${SWATCH_BASE}/d4277352efc7f86d732cc761f776d3315e957150` },
      { name: "Neon Pink", image: `${IMG_BASE}/2cc0aeb29b668f3f28f75974a4d00210ad5df166`, swatch: `${SWATCH_BASE}/2cc0aeb29b668f3f28f75974a4d00210ad5df166` },
      { name: "Red", image: `${IMG_BASE}/009236f2a45eda6ee7809dd74c7579c156dfa9db`, swatch: `${SWATCH_BASE}/009236f2a45eda6ee7809dd74c7579c156dfa9db` },
      { name: "Royal", image: `${IMG_BASE}/dbb7f6206208a880138ed3b51396804733f08241`, swatch: `${SWATCH_BASE}/dbb7f6206208a880138ed3b51396804733f08241` },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  },
  {
    key: 'pc380ls-tee',
    name: "Port & Co Long Sleeve Performance Tee. PC380LS",
    sku: 'PC380LS',
    price: 18.52,
    description: [
      "UPF50 long sleeve performance tee with Dry Zone moisture-wicking.",
      "3.8-ounce, 100% polyester",
      "Hemmed cuffs · Tear-away label",
    ],
    image: `${IMG_BASE}/e759a90f381dd990e6b41449393abea1ca39c108`,
    colors: [
      { name: "AthlMaroon", image: `${IMG_BASE}/e759a90f381dd990e6b41449393abea1ca39c108`, swatch: `${SWATCH_BASE}/e759a90f381dd990e6b41449393abea1ca39c108` },
      { name: "Carolina Blue", image: `${IMG_BASE}/6aecfcfc6d2ba0d9309fe93766953c0091b3ac57`, swatch: `${SWATCH_BASE}/6aecfcfc6d2ba0d9309fe93766953c0091b3ac57` },
      { name: "DarkGreen", image: `${IMG_BASE}/7e29b916ce190700b4ffa727b8a3722806bf6072`, swatch: `${SWATCH_BASE}/7e29b916ce190700b4ffa727b8a3722806bf6072` },
      { name: "Deep Navy", image: `${IMG_BASE}/1a3505119313685f9ceac381b0d1a240c9e33b13`, swatch: `${SWATCH_BASE}/1a3505119313685f9ceac381b0d1a240c9e33b13` },
      { name: "Jet Black", image: `${IMG_BASE}/57cdbea96842817844a23c0802bc86d7feb3da5c`, swatch: `${SWATCH_BASE}/57cdbea96842817844a23c0802bc86d7feb3da5c` },
      { name: "NeonYellow", image: `${IMG_BASE}/4352242a496b8d0287704f393e238ce9fe3f936d`, swatch: `${SWATCH_BASE}/4352242a496b8d0287704f393e238ce9fe3f936d` },
      { name: "Red", image: `${IMG_BASE}/a306658be076f91679f4f2bb2d4078323cea552e`, swatch: `${SWATCH_BASE}/a306658be076f91679f4f2bb2d4078323cea552e` },
      { name: "Royal", image: `${IMG_BASE}/828d45fdf91276876aecd4cfd28f3732dd46215c`, swatch: `${SWATCH_BASE}/828d45fdf91276876aecd4cfd28f3732dd46215c` },
      { name: "TrueRoyal", image: `${IMG_BASE}/14a860d601ef11e8799d835e1392fae3d22dc2bb`, swatch: `${SWATCH_BASE}/14a860d601ef11e8799d835e1392fae3d22dc2bb` },
    ],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  },
  {
    key: 'pc380h-hoodie',
    name: "Port & Co Performance Pullover Hooded Tee PC380H",
    sku: 'PC380H',
    price: 21.23,
    description: [
      "UPF50 hooded performance tee with Dry Zone moisture-wicking.",
      "3.8-ounce, 100% polyester",
      "Raglan sleeves · Tear-away label",
    ],
    image: `${IMG_BASE}/ea7a21441ee22ac84e4b8ef72e8af3a923accb2c`,
    colors: [
      { name: "CarolinaBl", image: `${IMG_BASE}/ea7a21441ee22ac84e4b8ef72e8af3a923accb2c`, swatch: `${SWATCH_BASE}/ea7a21441ee22ac84e4b8ef72e8af3a923accb2c` },
      { name: "JetBlack", image: `${IMG_BASE}/f9b08390e60d880ca595d5cb942ac9ce9c0d2619`, swatch: `${SWATCH_BASE}/f9b08390e60d880ca595d5cb942ac9ce9c0d2619` },
      { name: "NeonGreen", image: `${IMG_BASE}/8e75553a7ddc52a9b2be56013ebf112775889b65`, swatch: `${SWATCH_BASE}/8e75553a7ddc52a9b2be56013ebf112775889b65` },
      { name: "NeonOrange", image: `${IMG_BASE}/40f62902a5d17cda653091a313b24a79b235a9d8`, swatch: `${SWATCH_BASE}/40f62902a5d17cda653091a313b24a79b235a9d8` },
      { name: "Red", image: `${IMG_BASE}/9b267d52fde03f022b1d7ae492ba21e7f7519c62`, swatch: `${SWATCH_BASE}/9b267d52fde03f022b1d7ae492ba21e7f7519c62` },
      { name: "TrueNavy", image: `${IMG_BASE}/7b652fa2535d385f0beca7f5d73e91b065049492`, swatch: `${SWATCH_BASE}/7b652fa2535d385f0beca7f5d73e91b065049492` },
      { name: "TrueRoyal", image: `${IMG_BASE}/4474603ad0de63f876896256d2d83e49347e14bf`, swatch: `${SWATCH_BASE}/4474603ad0de63f876896256d2d83e49347e14bf` },
    ],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  },
  {
    key: 'cap-112pl',
    name: "Richardson 112+ R-Flex Adjustable Trucker Cap",
    sku: '112PL',
    price: 26.52,
    description: [
      "Structured six-panel mid-profile trucker cap.",
      "60/40 cotton/polyester front, stretch mesh back",
      "Pre-curved visor · R-Flex sweatband · Snapback closure",
    ],
    image: `${IMG_BASE}/1e0ee74cb10c8ea83a7eda24055effddf934bf58`,
    colors: [
      { name: "Black", image: `${IMG_BASE}/1e0ee74cb10c8ea83a7eda24055effddf934bf58`, swatch: `${SWATCH_BASE}/1e0ee74cb10c8ea83a7eda24055effddf934bf58` },
      { name: "Loden Green/Black", image: `${IMG_BASE}/02646e54554e3987e21c9818976f4b3b393d6f08`, swatch: `${SWATCH_BASE}/02646e54554e3987e21c9818976f4b3b393d6f08` },
      { name: "Charcoal/Black", image: `${IMG_BASE}/31c28cca6e86416f02855d652d990c146714d5be`, swatch: `${SWATCH_BASE}/31c28cca6e86416f02855d652d990c146714d5be` },
    ],
    sizes: ["One Size"],
  },
  {
    key: 'cap-c402',
    name: "Port Authority Snapback Trucker Cap. C402",
    sku: 'C402',
    price: 20.29,
    description: [
      "Two-toned trucker cap with breathable mesh and contrast stitching.",
      "Cotton twill front panels, polyester mesh back",
      "Structured mid profile · 7-position snapback",
    ],
    image: `${IMG_BASE}/4cbd0d93aabc3ac66a9d1e0ef1499ff48c90e624`,
    colors: [
      { name: "Black", image: `${IMG_BASE}/4cbd0d93aabc3ac66a9d1e0ef1499ff48c90e624`, swatch: `${SWATCH_BASE}/4cbd0d93aabc3ac66a9d1e0ef1499ff48c90e624` },
      { name: "Black/Gold", image: `${IMG_BASE}/7c2319b85f3ef4c01ec94a8bd449898cdeedb34a`, swatch: `${SWATCH_BASE}/7c2319b85f3ef4c01ec94a8bd449898cdeedb34a` },
      { name: "GySt/NeOr", image: `${IMG_BASE}/3e1bf55a8ae04beee8cb0b3e1fe4ebc41dbf01cc`, swatch: `${SWATCH_BASE}/3e1bf55a8ae04beee8cb0b3e1fe4ebc41dbf01cc` },
      { name: "GyStl/Blk", image: `${IMG_BASE}/d6fd32f13c8046836a72c0339e0aaace14ead5f2`, swatch: `${SWATCH_BASE}/d6fd32f13c8046836a72c0339e0aaace14ead5f2` },
      { name: "OlvDrabGn", image: `${IMG_BASE}/f6eeeeabac5e328526c60fca17a704fb20035b71`, swatch: `${SWATCH_BASE}/f6eeeeabac5e328526c60fca17a704fb20035b71` },
      { name: "OvDrbGn/Bk", image: `${IMG_BASE}/55995f8f8146738f9c08f55c034d1e1339add2ab`, swatch: `${SWATCH_BASE}/55995f8f8146738f9c08f55c034d1e1339add2ab` },
    ],
    sizes: ["One Size"],
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
