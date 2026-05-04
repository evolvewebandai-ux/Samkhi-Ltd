import { Product, Category, SolarPackage, Order, Customer } from './types';
import { 
  Lightbulb, 
  Sun, 
  Battery, 
  Zap, 
  Droplets, 
  Wind, 
  Settings, 
  Cpu,
  Waves
} from 'lucide-react';

export const CATEGORIES: Category[] = [
  {
    id: 'led-lighting',
    name: 'LED Lighting',
    description: 'Energy-efficient lighting solutions for home and business.',
    imageUrl: 'https://enersavesolutions.com/cdn/shop/products/200W-SOLAR-FLOODLIGHT-withlightson.png?v=1662663196',
    icon: Lightbulb
  },
  {
    id: 'solar-panels',
    name: 'Solar Panels',
    description: 'High-performance photovoltaic panels for maximum energy capture.',
    imageUrl: 'https://enersavesolutions.com/cdn/shop/collections/DAH-S-455_1024x1024.png?v=1708193281',
    icon: Sun
  },
  {
    id: 'inverters',
    name: 'Inverters',
    description: 'Reliable power conversion for your solar system.',
    imageUrl: 'https://lekkatrician.com/wp-content/uploads/2023/03/SRNE-Hybrid-Solar-Inverter-6.5KW-48V.jpg',
    icon: Zap
  },
  {
    id: 'batteries',
    name: 'Batteries',
    description: 'Advanced lithium and deep-cycle energy storage.',
    imageUrl: 'https://lekkatrician.com/wp-content/uploads/2023/03/Deye-10.24KWH-Lithium-Battery.jpg',
    icon: Battery
  },
  {
    id: 'water-heaters',
    name: 'Solar Water Heaters',
    description: 'Harness the sun for hot water.',
    imageUrl: 'https://picsum.photos/seed/water/800/600',
    icon: Droplets
  },
  {
    id: 'pool-pumps',
    name: 'Solar Pool Pumps',
    description: 'Keep your pool clean and efficient.',
    imageUrl: 'https://picsum.photos/seed/pool/800/600',
    icon: Waves
  },
  {
    id: 'generators',
    name: 'Generators',
    description: 'Backup power when you need it most.',
    imageUrl: 'https://picsum.photos/seed/generator/800/600',
    icon: Wind
  }
];

export const SOLAR_PACKAGES: SolarPackage[] = [
  {
    id: 'starter',
    name: 'Starter Solar Package',
    price: 590000,
    badge: 'Popular Starter System',
    description: 'Perfect for small homes looking to offset their energy costs.',
    includes: [
      'SRNE 6.5k Off Grid Inverter',
      'Deye 10k Lithium Battery',
      '6 × 585W HT SOLAR PANELS',
      'Standard Installation Support'
    ]
  },
  {
    id: 'platinum',
    name: 'Platinum Solar Package',
    price: 1360000,
    badge: 'Premium Solution',
    description: 'High capacity solution for large homes and commercial properties.',
    includes: [
      '2 × Suntec 16k Lithium Batteries',
      '18 × 585W HT SOLAR PANELS',
      'High Capacity Backup Power',
      'Smart Monitoring System'
    ]
  }
];

// Generate 50+ products
const brands = ['Samkhi', 'JA Solar', 'Deye', 'SRNE', 'Suntec', 'Luminous'];

export const PRODUCTS: Product[] = [
  {
    id: 'ecolite-chandelier-bulb',
    name: 'Ecolite® 4W E12 Base Led Chandalier Bulb',
    description: 'Elegant LED chandelier bulb with E12 base, perfect for decorative fixtures.',
    price: 750,
    category: 'led-lighting',
    imageUrl: 'https://fygaro-subscribers.s3.amazonaws.com/9669b088-1765-4e05-962b-abd27a3236ec/products/171704/c9d5763f-f3b3-44d7-b516-a8d1e8e7ad45.png',
    brand: 'Ecolite',
    inStock: true,
    isFeatured: true,
    specifications: { Power: '4W', Base: 'E12', Lumens: '400', Lifespan: '25,000 hrs' }
  },
  {
    id: 'led-panel-light',
    name: "Ecolite® 2x4 FT 60W Led Panel Light ETL Certified",
    description: 'Sleek LED panel light for office and commercial use.',
    price: 25000,
    category: 'led-lighting',
    imageUrl: 'https://fygaro-subscribers.s3.amazonaws.com/9669b088-1765-4e05-962b-abd27a3236ec/products/171685/5fcd226f-c673-42c6-86df-9ed5a5e6ccbc.jpg',
    brand: 'Samkhi',
    inStock: true,
    isFeatured: true,
    specifications: { Size: '2ft x 4ft', Power: '60W', Color: 'Cool White' }
  },
  {
    id: 'solar-flood-60w',
    name: 'Solar 20w RGB Flood Light',
    description: 'Outdoor solar-powered flood light with remote control.',
    price: 15000,
    category: 'led-lighting',
    imageUrl: 'https://fygaro-subscribers.s3.amazonaws.com/9669b088-1765-4e05-962b-abd27a3236ec/products/247375/6d37dfeb-ca08-47ce-af3d-1f2a85a69bf9.jpg',
    brand: 'Samkhi',
    inStock: true,
    isFeatured: true,
    specifications: { Power: '20W', Battery: 'Lithium 10Ah', IP: 'IP65' }
  },
  {
    id: 'ja-solar-585w',
    name: '585W HT SOLAR PANELS',
    description: 'High-performance mono-crystalline solar panel with high transparency technology.',
    price: 30000,
    category: 'solar-panels',
    imageUrl: 'https://fygaro-subscribers.s3.amazonaws.com/9669b088-1765-4e05-962b-abd27a3236ec/products/323482/c6fc19b5-9dea-474d-adfb-873ccbdae02d.jpg',
    brand: 'JA Solar',
    inStock: true,
    isFeatured: true,
    specifications: { Power: '585W', Type: 'Mono PERC', Efficiency: '22.0%' }
  },
  {
    id: 'deye-inverter-5k',
    name: 'Deye 5kW Hybrid Inverter',
    description: 'Versatile hybrid inverter for grid-tied and off-grid use.',
    price: 185000,
    category: 'inverters',
    imageUrl: 'https://lekkatrician.com/wp-content/uploads/2023/04/Deye-5KW-Hybrid-Inverter-Single-Phase.jpg',
    brand: 'Deye',
    inStock: true,
    isFeatured: true,
    specifications: { Power: '5kW', Input: '48VDC', Type: 'Hybrid' }
  },
  {
    id: 'srne-inverter-6-5k',
    name: 'SRNE 6.5kW Hybrid Inverter',
    description: 'High-performance hybrid solar inverter with advanced remote monitoring.',
    price: 165000,
    category: 'inverters',
    imageUrl: 'https://lekkatrician.com/wp-content/uploads/2023/03/SRNE-Hybrid-Solar-Inverter-6.5KW-48V.jpg',
    brand: 'SRNE',
    inStock: true,
    isFeatured: true,
    specifications: { Power: '6.5kW', Input: '48VDC', Type: 'Hybrid' }
  },
  {
    id: 'deye-battery-10k',
    name: 'Deye 10kWh Lithium Battery',
    description: 'Long-lasting lithium iron phosphate battery for energy storage.',
    price: 320000,
    category: 'batteries',
    imageUrl: 'https://lekkatrician.com/wp-content/uploads/2023/03/Deye-10.24KWH-Lithium-Battery.jpg',
    brand: 'Deye',
    inStock: true,
    isFeatured: true,
    specifications: { Capacity: '10kWh', Cycles: '6000+', Warranty: '10 Yrs' }
  },
  // Adding more products dynamically to reach 70+
  ...Array.from({ length: 64 }).map((_, i) => ({
    id: `dynamic-prod-${i}`,
    name: `${brands[i % brands.length]} ${['Component', 'Accessory', 'System', 'Part', 'Controller', 'Module', 'Cable', 'Breaker'][i % 8]} Type ${i + 1}`,
    description: `Professional grade ${['LED', 'Solar', 'Battery', 'Inverter', 'Mounting', 'Thermal', 'Logic'][i % 7]} equipment designed for high-performance and safety in the Jamaican tropical environment.`,
    price: 850 + (Math.random() * 85000),
    category: CATEGORIES[i % CATEGORIES.length].id,
    imageUrl: `https://picsum.photos/seed/prod${i + 10}/400/400`,
    brand: brands[i % brands.length],
    inStock: Math.random() > 0.15,
    rating: 4 + Math.floor(Math.random() * 2),
    reviews: Math.floor(Math.random() * 100),
    specifications: { 
      Material: 'Commercial Grade', 
      Certification: 'CE / Energy Star',
      Voltage: i % 2 === 0 ? '110V' : '220V',
      Origin: 'Importer Standard'
    }
  }))
];

export const ORDERS: Order[] = [
  {
    id: '#10530W',
    customerName: 'Robert Campbell',
    customerEmail: 'robert.c@example.jm',
    date: 'May 02, 2026',
    total: 1250000,
    status: 'paid',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    items: 12
  },
  {
    id: '#10529W',
    customerName: 'Sandra Williams',
    customerEmail: 'sandra.w@flow.com',
    date: 'May 01, 2026',
    total: 45000,
    status: 'pending',
    paymentStatus: 'pending',
    fulfillmentStatus: 'unfulfilled',
    items: 4
  },
  {
    id: '#10528W',
    customerName: 'Michael Thompson',
    customerEmail: 'm.thompson@gmail.com',
    date: 'Apr 30, 2026',
    total: 890000,
    status: 'fulfilled',
    paymentStatus: 'paid',
    fulfillmentStatus: 'fulfilled',
    items: 8
  },
  {
    id: '#10527W',
    customerName: 'Janet Richards',
    customerEmail: 'janet.r@outlook.com',
    date: 'Apr 28, 2026',
    total: 15600,
    status: 'cancelled',
    paymentStatus: 'refunded',
    fulfillmentStatus: 'restocked',
    items: 2
  },
  {
    id: '#10526W',
    customerName: 'David Graham',
    customerEmail: 'd.graham@samkhi.com',
    date: 'Apr 25, 2026',
    total: 2100000,
    status: 'paid',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    items: 24
  }
];

export const CUSTOMERS: Customer[] = [
  {
    id: 'CUST001',
    name: 'Robert Campbell',
    email: 'robert.c@example.jm',
    location: 'Ocho Rios, St. Ann',
    orders: 3,
    spent: 1450000,
    lastOrder: 'May 02, 2026'
  },
  {
    id: 'CUST002',
    name: 'Sandra Williams',
    email: 'sandra.w@flow.com',
    location: 'Kingston 6, St. Andrew',
    orders: 1,
    spent: 45000,
    lastOrder: 'May 01, 2026'
  },
  {
    id: 'CUST003',
    name: 'Michael Thompson',
    email: 'm.thompson@gmail.com',
    location: 'Montego Bay, St. James',
    orders: 5,
    spent: 2800000,
    lastOrder: 'Apr 30, 2026'
  },
  {
    id: 'CUST004',
    name: 'Janet Richards',
    email: 'janet.r@outlook.com',
    location: 'Mandeville, Manchester',
    orders: 2,
    spent: 32000,
    lastOrder: 'Apr 28, 2026'
  },
  {
    id: 'CUST005',
    name: 'David Graham',
    email: 'd.graham@samkhi.com',
    location: 'Runaway Bay, St. Ann',
    orders: 12,
    spent: 8500000,
    lastOrder: 'Apr 25, 2026'
  }
];
