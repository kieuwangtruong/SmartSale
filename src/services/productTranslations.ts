import { currentLanguage } from './i18n'
import type { Product } from './productApi'

const PRODUCT_NAME_EN: Record<number, string> = {
  1: 'Bluetooth Pro Headphones',
  2: 'RGB Mechanical Keyboard',
  3: 'Silent Wireless Mouse',
  4: 'Mini Bluetooth Speaker',
  5: 'Smart Watch S2',
  6: 'Anti-glare LED Desk Lamp',
  7: 'Ergonomic Office Chair',
  8: 'Multi-function Blender',
  9: '1.8L Electric Kettle',
  10: 'Smart Power Outlet',
  11: 'Office Laptop Air 14',
  12: 'Mini Coffee Maker',
  13: 'Nova 5G Smartphone',
  14: 'Tab M10 Tablet',
  15: '24-inch IPS Monitor',
  16: 'Compact Digital Camera',
  17: 'Mini Full HD Projector',
  18: 'Full HD 1080p Webcam',
  19: '7-in-1 USB-C Hub',
  20: '1TB Portable SSD',
  21: '15.6-inch Shockproof Laptop Backpack',
  22: 'Aluminum Laptop Stand',
  23: '5L Air Fryer',
  24: '1.8L Smart Rice Cooker',
  25: 'Handheld Vacuum Cleaner',
  26: 'Air Circulator Fan',
  27: 'Handheld Steam Iron',
  28: 'Minimalist Wooden Desk',
  29: 'Leather-bound Work Notebook',
  30: 'WiFi Laser Printer',
  31: '12-core Desktop PC',
  32: '3-drawer Office Filing Cabinet',
  33: 'Desktop PC',
  34: 'Gaming Console',
  35: 'PlayStation 5',
}

const PRODUCT_NAME_BY_VI: Record<string, string> = {
  'Tai nghe Bluetooth Pro': 'Bluetooth Pro Headphones',
  'Bàn phím cơ RGB': 'RGB Mechanical Keyboard',
  'Chuột không dây Silent': 'Silent Wireless Mouse',
  'Loa Bluetooth Mini': 'Mini Bluetooth Speaker',
  'Đồng hồ thông minh S2': 'Smart Watch S2',
  'Đèn bàn LED chống cận': 'Anti-glare LED Desk Lamp',
  'Ghế văn phòng công thái học': 'Ergonomic Office Chair',
  'Máy xay sinh tố đa năng': 'Multi-function Blender',
  'Ấm đun siêu tốc 1.8L': '1.8L Electric Kettle',
  'Ổ cắm điện thông minh': 'Smart Power Outlet',
  'Laptop văn phòng Air 14': 'Office Laptop Air 14',
  'Máy pha cà phê mini': 'Mini Coffee Maker',
  'Điện thoại Nova 5G': 'Nova 5G Smartphone',
  'Máy tính bảng Tab M10': 'Tab M10 Tablet',
  'Màn hình IPS 24 inch': '24-inch IPS Monitor',
  'Máy ảnh kỹ thuật số Compact': 'Compact Digital Camera',
  'Máy chiếu Mini Full HD': 'Mini Full HD Projector',
  'Webcam Full HD 1080p': 'Full HD 1080p Webcam',
  'Hub USB-C 7 trong 1': '7-in-1 USB-C Hub',
  'Ổ cứng SSD di động 1TB': '1TB Portable SSD',
  'Balo chống sốc Laptop 15.6 inch': '15.6-inch Shockproof Laptop Backpack',
  'Giá đỡ Laptop nhôm': 'Aluminum Laptop Stand',
  'Nồi chiên không dầu 5L': '5L Air Fryer',
  'Nồi cơm điện thông minh 1.8L': '1.8L Smart Rice Cooker',
  'Máy hút bụi cầm tay': 'Handheld Vacuum Cleaner',
  'Quạt điện tuần hoàn không khí': 'Air Circulator Fan',
  'Bàn ủi hơi nước cầm tay': 'Handheld Steam Iron',
  'Bàn làm việc gỗ tối giản': 'Minimalist Wooden Desk',
  'Sổ tay công việc bìa da': 'Leather-bound Work Notebook',
  'Máy in Laser WiFi': 'WiFi Laser Printer',
  'Máy tính để bàn 12 sợi': '12-core Desktop PC',
  'Tủ hồ sơ văn phòng 3 ngăn': '3-drawer Office Filing Cabinet',
  'Bộ PC': 'Desktop PC',
  'Máy chơi game': 'Gaming Console',
  'PS5': 'PlayStation 5',
}

const PHRASE_RULES: Array<[RegExp, string]> = [
  [/tai nghe/gi, 'Headphones'],
  [/chuột/gi, 'Mouse'],
  [/bàn phím/gi, 'Keyboard'],
  [/loa/gi, 'Speaker'],
  [/đồng hồ thông minh/gi, 'Smart Watch'],
  [/đèn bàn/gi, 'Desk Lamp'],
  [/ghế văn phòng/gi, 'Office Chair'],
  [/máy xay sinh tố/gi, 'Blender'],
  [/ấm đun siêu tốc/gi, 'Electric Kettle'],
  [/ổ cắm điện thông minh/gi, 'Smart Power Outlet'],
  [/laptop/gi, 'Laptop'],
  [/máy pha cà phê/gi, 'Coffee Maker'],
  [/điện thoại/gi, 'Smartphone'],
  [/máy tính bảng/gi, 'Tablet'],
  [/màn hình/gi, 'Monitor'],
  [/máy ảnh/gi, 'Camera'],
  [/máy chiếu/gi, 'Projector'],
  [/webcam/gi, 'Webcam'],
  [/hub usb-c/gi, 'USB-C Hub'],
  [/ổ cứng ssd/gi, 'SSD'],
  [/balo/gi, 'Backpack'],
  [/nồi chiên không dầu/gi, 'Air Fryer'],
  [/nồi cơm điện/gi, 'Rice Cooker'],
  [/máy hút bụi/gi, 'Vacuum Cleaner'],
  [/quạt điện/gi, 'Electric Fan'],
  [/bàn ủi/gi, 'Steam Iron'],
  [/bàn làm việc/gi, 'Desk'],
  [/sổ tay/gi, 'Notebook'],
  [/máy in/gi, 'Printer'],
  [/tủ hồ sơ/gi, 'Filing Cabinet'],
  [/không dây/gi, 'Wireless'],
  [/thông minh/gi, 'Smart'],
  [/mini/gi, 'Mini'],
  [/đa năng/gi, 'Multi-function'],
  [/cơ/gi, 'Mechanical'],
  [/chống sốc/gi, 'Shockproof'],
  [/tối giản/gi, 'Minimalist'],
]

function translateByRules(name: string): string {
  let result = name
  for (const [pattern, replacement] of PHRASE_RULES) {
    result = result.replace(pattern, replacement)
  }
  return result
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase())
}

export function translateProductName(product: Pick<Product, 'id' | 'name'> | string, id?: number): string {
  const name = typeof product === 'string' ? product : product.name
  if (currentLanguage.value === 'vi') return name

  const productId = typeof product === 'string' ? id : product.id
  if (productId && PRODUCT_NAME_EN[productId]) {
    return PRODUCT_NAME_EN[productId]
  }

  const exact = PRODUCT_NAME_BY_VI[name.trim()]
  if (exact) return exact

  const normalized = name.trim().toLowerCase()
  const fuzzy = Object.entries(PRODUCT_NAME_BY_VI).find(([vi]) => vi.toLowerCase() === normalized)
  if (fuzzy) return fuzzy[1]

  return translateByRules(name)
}
