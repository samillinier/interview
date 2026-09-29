export type OfficeSupplyItem = {
  key: string
  name: string
  price: number
  max: number
  min: number
  description?: string
}

export type OfficeSupplySection = {
  key: string
  title: string
  items: OfficeSupplyItem[]
}

/**
 * Office Supplies order catalog.
 * `min` is the "on hand" minimum the warehouse keeps; the orderable quantity is
 * 0..`max`. Prices and limits mirror the official FIS order form.
 */
export const OFFICE_SUPPLY_SECTIONS: OfficeSupplySection[] = [
  {
    key: 'office',
    title: 'Office Supplies',
    items: [
      {
        key: 'shipping-labels',
        name: 'Shipping Labels',
        price: 34.98,
        min: 1,
        max: 2,
        description: 'Avery Printable Shipping Labels with Sure Feed, 3-1/3" x 4", White, 600 Blank Mailing Labels (5164)',
      },
      {
        key: 'printer-paper',
        name: 'Printer/Copy Paper',
        price: 77.99,
        min: 1,
        max: 2,
        description: '20 Lb. Copy Paper, 8.5 x 11 - 8 Ream (4,000 Sheets), 92 Bright, Made in the USA',
      },
      {
        key: 'postit-pads',
        name: 'Lined Post-it Note Pads',
        price: 21.99,
        min: 1,
        max: 2,
        description: 'Lined Sticky Notes 3 x 3, 20 Pack Box, 2,000 Sheets (100/Pad), Bright Assorted Colors',
      },
      {
        key: 'staples',
        name: 'Bostitch Office Premium Standard Staples (1 box)',
        price: 5.5,
        min: 1,
        max: 4,
        description: 'Full strip staples - each strip contains 210 staples, 1/4" leg length, 5,000 staples per box',
      },
      {
        key: 'pen-blue',
        name: 'Ink Pen - Blue',
        price: 4.99,
        min: 1,
        max: 2,
        description: 'BIC Round Stic Xtra Life Blue Ballpoint Pens, Medium Point (1.0mm), 60-Count Pack',
      },
      {
        key: 'pen-black',
        name: 'Ink Pen - Black',
        price: 7.29,
        min: 1,
        max: 2,
        description: 'BIC Round Stic Xtra Life Black Ballpoint Pens, Medium Point (1.0mm), 60-Count Pack',
      },
      {
        key: 'sharpie',
        name: 'Sharpie King Size Permanent Marker (12 pk)',
        price: 15.52,
        min: 1,
        max: 1,
        description: 'Extra Wide Chisel Tip, Multi-Surface Markers, Pack of 12, Permanent Black Ink',
      },
      {
        key: 'legal-pad',
        name: 'Wide Rule Legal Pad',
        price: 23.99,
        min: 1,
        max: 2,
        description: 'Legal Pad Writing Pads, Recycled Paper, 8.5"x11.75" Wide Ruled, 50 sheets, White Pack of 12',
      },
      {
        key: 'binder',
        name: '3-Ring Binder',
        price: 15.99,
        min: 1,
        max: 2,
        description: '3-Ring Binder, 1-Inch, White, 4-Pack',
      },
      {
        key: 'hanging-folders',
        name: 'Hanging File Folders',
        price: 27.7,
        min: 1,
        max: 2,
        description: 'Hanging File Folders, Letter Size, Standard Green, 1/5-Cut Tabs, 75 per box',
      },
      {
        key: 'file-folders',
        name: 'File Folders',
        price: 15.68,
        min: 1,
        max: 2,
        description: '1/3-Cut Tab, Assorted Positions File Folders, Letter Size, Manila - Pack of 100',
      },
      {
        key: 'toner-ez',
        name: 'EZ Ink Toner Cartridge (black)',
        price: 44.55,
        min: 1,
        max: 1,
        description: '4 x TN660 Black (Total 4 Pack), 2,600 Pages Per Cartridge, Brother HL-L2300D / MFC-L2700DW / DCP-L2540DW',
      },
      {
        key: 'toner-canon',
        name: 'True Image Toner Cartridge Replacement for Canon 057H (black)',
        price: 55.99,
        min: 1,
        max: 3,
        description: '1 pack Cartridge 057H (with chip), 10,000 pages at 5% coverage, Canon ImageCLASS MF445dw / MF455dw / LBP226dw',
      },
      {
        key: 'ink-epson',
        name: 'Remanufactured Ink Cartridge Replacement for Epson Printers',
        price: 29.99,
        min: 1,
        max: 3,
        description: 'Fooylen 802XL combo pack (1 Black, 1 Cyan, 1 Magenta, 1 Yellow), Epson Workforce Pro WF-4720 / WF-4740 / EC-4020',
      },
      {
        key: 'aa-batteries',
        name: 'AA Batteries',
        price: 24.49,
        min: 1,
        max: 2,
        description: 'AA Batteries, Double A Long-Lasting Alkaline Power Batteries, 32 Count (Pack of 1)',
      },
      {
        key: 'aaa-batteries',
        name: 'AAA Batteries',
        price: 24.49,
        min: 1,
        max: 2,
        description: 'AAA Batteries, Triple A Long-Lasting Alkaline Power Batteries, 32 Count (Pack of 1)',
      },
      {
        key: 'dry-erase',
        name: 'EXPO Low Odor Dry Erase Marker Set',
        price: 6.99,
        min: 1,
        max: 2,
        description: 'Includes Red, Blue, Green and Black markers, a 2 oz Expo white board cleaning spray, and an Expo eraser',
      },
      {
        key: 'desk-calendar',
        name: 'Desk Calendar (1pk)',
        price: 9.99,
        min: 1,
        max: 4,
        description: '19-month timeline, larger 1.8" x 1.5" blocks for planning and organizing',
      },
      {
        key: 'tape-refills',
        name: 'Transparent Tape Refills (12 pk)',
        price: 7.99,
        min: 1,
        max: 1,
        description: '12 Rolls Transparent Tape Refills, Clear Invisible, 3/4 x 1000 Inches, 1 Inch Core',
      },
    ],
  },
  {
    key: 'break-room',
    title: 'Break Room',
    items: [
      {
        key: 'cups',
        name: 'Hot/Cold 12 ounce Beverage Cups',
        price: 27.99,
        min: 1,
        max: 1,
        description: 'Hot/Cold Paper Cups, White, 12-Ounce, 270 Count (Pack of 1)',
      },
      {
        key: 'k-cup',
        name: 'K-Cup Coffee (McCafe)',
        price: 64.99,
        min: 1,
        max: 2,
        description: 'McCafe Premium Roast K-Cup Coffee Pods (94 Count)',
      },
      {
        key: 'sugar',
        name: 'Sugar',
        price: 15.62,
        min: 1,
        max: 2,
        description: '20 Ounce Sugar Canister, Pack of 6, 100% Pure Granulated Sugar, Easy Pour Lid',
      },
      {
        key: 'creamer',
        name: 'Creamer',
        price: 15.62,
        min: 1,
        max: 2,
        description: 'Non-Dairy Coffee Creamer, 12 Ounce Canister, Pack of 6, Easy Pour Lid',
      },
      {
        key: 'stirrers',
        name: 'Comfy Package Coffee Stirrers (1000 ct.)',
        price: 6.98,
        min: 1,
        max: 1,
        description: 'Each pack includes 1000 disposable plastic sip stir sticks, 5 inches in length',
      },
      {
        key: 'paper-plates',
        name: 'Paper Plates',
        price: 6.92,
        min: 1,
        max: 3,
        description: '8 1/2 inch, Lunch or Light Dinner Size Printed Disposable Plate, 90 Count (Pack of 1)',
      },
      {
        key: 'forks',
        name: 'Plastic Forks',
        price: 14.7,
        min: 1,
        max: 2,
        description: 'Heavy Weight Plastic Forks, Clear Disposable, 100 Count',
      },
      {
        key: 'spoons',
        name: 'Plastic Spoons',
        price: 14.7,
        min: 1,
        max: 2,
        description: 'Heavyweight Plastic Spoons, Clear Disposable, 100 Count',
      },
      {
        key: 'knives',
        name: 'Plastic Knives',
        price: 14.7,
        min: 1,
        max: 2,
        description: 'Heavyweight Plastic Knives, Clear Disposable, 100 Count',
      },
      {
        key: 'paper-towel',
        name: 'Paper Towel',
        price: 39.99,
        min: 1,
        max: 2,
        description: 'Premium Paper Towels, XL Rolls, Super Absorbent & Strong, Full Sheet 24 Rolls',
      },
      {
        key: 'trash-bag',
        name: '13 Gallon Trash Bag',
        price: 21.98,
        min: 1,
        max: 2,
        description: 'Tall Drawstring Trash Bags, 13 Gallon White, Unscented Leak Protection, 120 Count',
      },
      {
        key: 'sponges',
        name: 'Heavy Duty Scrub Sponges (6 pk)',
        price: 5.97,
        min: 1,
        max: 1,
        description: 'Scotch-Brite Heavy Duty Scrub Sponges; one pack contains six sponges',
      },
      {
        key: 'dish-soap',
        name: 'Dish Soap (4 pk)',
        price: 16.28,
        min: 1,
        max: 1,
        description: 'Set of four 30 fl oz bottles, long-lasting bulk supply for dishwashing needs',
      },
      {
        key: 'swiffer-starter',
        name: 'Swiffer WetJet Spray Mop & Cleaner Starter Kit',
        price: 28.24,
        min: 1,
        max: 1,
        description: 'Includes 1 Power Mop, 10 Pads, Cleaning Solution, Batteries',
      },
      {
        key: 'swiffer-pads',
        name: 'Swiffer WetJet Floor Cleaner Spray Mop Pad Refill (24 ct.)',
        price: 13.72,
        min: 1,
        max: 2,
        description: '24 multi-surface mopping pad refills',
      },
      {
        key: 'swiffer-solution',
        name: 'Swiffer WetJet Multi-Purpose Liquid Floor Cleaner Solution Refill (2 pk)',
        price: 13.49,
        min: 1,
        max: 1,
        description: 'Cleaner Solution Refill with Gain Scent, 42.2 fl oz each (Pack of 2)',
      },
    ],
  },
  {
    key: 'bath',
    title: 'Bath',
    items: [
      {
        key: 'multifold-towel',
        name: 'Multifold Towel',
        price: 32,
        min: 1,
        max: 2,
        description: 'Commercial 2-Ply White XL Multifold Paper Towels, 115 Sheets per Pack (16 Packs)',
      },
      {
        key: 'toilet-paper',
        name: 'Toilet Paper (48 rolls)',
        price: 31.93,
        min: 1,
        max: 2,
        description: '48 Mega Rolls, each equal to 4 Regular Rolls, 320 2-ply sheets per roll',
      },
      {
        key: 'hand-soap',
        name: 'Liquid Hand Soap',
        price: 15.88,
        min: 1,
        max: 2,
        description: 'Antibacterial Liquid Hand Soap, 11.25 Ounce, 6 units per case',
      },
      {
        key: 'wipes',
        name: 'Disinfecting Wipes',
        price: 10.75,
        min: 1,
        max: 2,
        description: 'Lemon & Fresh Scent, 4 canisters each with 85 count white wipes',
      },
      {
        key: 'toilet-cleaner',
        name: 'Toilet Bowl Cleaner (2 pk)',
        price: 4.98,
        min: 1,
        max: 1,
        description: 'Clinging Bleach Gel, Ocean Mist - 24 Ounces, Pack of 2',
      },
      {
        key: 'air-freshener',
        name: 'Air Mist Air Freshener Spray (6 pk)',
        price: 16.44,
        min: 1,
        max: 1,
        description: 'Aerosol Can, Linen & Sky Scent, 8.8oz - 6 Count',
      },
      {
        key: 'tissues',
        name: 'Facial Tissues',
        price: 24.69,
        min: 1,
        max: 2,
        description: 'Ultra-Soft 3-Ply Premium Facial Tissues, 66 Tissues per Box, 18 units per case',
      },
      {
        key: 'liners',
        name: '6-10 Gallon Office Trash Can Liners',
        price: 27.99,
        min: 1,
        max: 2,
        description: '6-10 Gallon Trash Bags (300 Count), Clear Garbage Bags',
      },
    ],
  },
]

export const OFFICE_SUPPLY_PRIORITIES = ['Standard', 'Rush', 'Urgent'] as const

export type OfficeSupplyLineItem = {
  key: string
  name: string
  price: number
  quantity: number
  section: string
}

export const OFFICE_SUPPLY_ITEM_INDEX: Record<string, OfficeSupplyItem> = Object.fromEntries(
  OFFICE_SUPPLY_SECTIONS.flatMap((section) =>
    section.items.map((item) => [item.key, item]),
  ),
)

export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
