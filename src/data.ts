import { Product, SolarPackage, Order, Customer, Collection, ReturnRequest } from './types';
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
    tags: ['LED Lighting', 'Bulb', 'Ecolite'],
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
    tags: ['LED Lighting', 'Panel Light', 'Samkhi'],
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
    tags: ['LED Lighting', 'Solar Flood', 'Samkhi'],
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
    tags: ['Solar Panels', '585W', 'JA Solar'],
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
    tags: ['Inverters', 'Deye', '5kW'],
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
    tags: ['Inverters', 'SRNE', '6.5kW'],
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
    tags: ['Batteries', 'Deye', '10kWh'],
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
    description: `Professional grade ${['LED Lighting', 'Solar Panels', 'Batteries', 'Inverters', 'Mounting', 'Thermal', 'Logic'][i % 7]} equipment designed for high-performance and safety in the Jamaican tropical environment.`,
    price: 850 + (Math.random() * 85000),
    tags: [['LED Lighting', 'Solar Panels', 'Batteries', 'Inverters', 'Solar Water Heaters', 'Solar Pool Pumps', 'Generators'][i % 7]],
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
    id: '#40441',
    customerName: 'Pamela McLaughlin',
    customerEmail: 'pameladburell@yahoo.com',
    customerPhone: '+1 876-579-7807',
    date: 'May 3, 2026',
    subtotal: 38999,
    taxes: 5849.85,
    total: 44848.85,
    status: 'completed',
    paymentStatus: 'paid',
    fulfillmentStatus: 'fulfilled',
    fulfillmentLocation: 'Kingston Outlet Store',
    receiptNumber: '#8-24374',
    items: 1,
    fulfillment_method: 'pickup',
    fulfillment_type: 'pickup',
    shipping_cost: 0,
    shipping_total: 0,
    grand_total: 44848.85,
    lineItems: [
      {
        id: 'li1',
        productId: 'ne-0241',
        productName: '56" Inverter Ceiling Fan w-o light NE-0241',
        price: 38999,
        quantity: 1,
        imageUrl: 'https://enersavesolutions.com/cdn/shop/products/NE-0241_50c0c0c0-1234-4567-8901-234567890abc.png',
        sku: 'NE-0241'
      }
    ],
    timeline: [
      { id: 't5', type: 'system', content: 'Milton Kilbourne processed this order for Pamela McLaughlin on Samkhi POS.', timestamp: '2:10 PM' },
      { id: 't4', type: 'system', content: 'Confirmation #MT4QY7G1V was generated for this order.', timestamp: '2:10 PM' },
      { id: 't3', type: 'system', content: 'A $44,848.85 JMD payment was processed on Credit Card.', timestamp: '2:10 PM' },
      { id: 't2', type: 'system', content: 'Samkhi marked 1 item as fulfilled from Kingston Outlet Store.', timestamp: '2:10 PM' },
      { id: 't1', type: 'email', content: 'Milton Kilbourne sent an order receipt email to Pamela McLaughlin (pameladburell@yahoo.com).', timestamp: '2:10 PM' },
    ],
    tags: ['POS', 'Kingston']
  },
  {
    id: '#10530W',
    customerName: 'Robert Campbell',
    customerEmail: 'robert.c@example.jm',
    date: 'May 02, 2026',
    subtotal: 1100000,
    taxes: 150000,
    total: 1250000,
    status: 'payment_confirmed',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    fulfillment_method: 'delivery',
    fulfillment_type: 'shipping',
    shipping_cost: 0,
    shipping_total: 0,
    grand_total: 1250000,
    items: 12
  },
  {
    id: '#10529W',
    customerName: 'Sandra Williams',
    customerEmail: 'sandra.w@flow.com',
    date: 'May 01, 2026',
    subtotal: 45000,
    total: 45000,
    status: 'pending',
    paymentStatus: 'pending',
    fulfillmentStatus: 'unfulfilled',
    fulfillment_method: 'pickup',
    fulfillment_type: 'pickup',
    shipping_cost: 0,
    shipping_total: 0,
    grand_total: 45000,
    items: 4
  },
  {
    id: '#10528W',
    customerName: 'Michael Thompson',
    customerEmail: 'm.thompson@gmail.com',
    date: 'Apr 30, 2026',
    subtotal: 890000,
    total: 890000,
    status: 'completed',
    paymentStatus: 'paid',
    fulfillmentStatus: 'fulfilled',
    fulfillment_method: 'delivery',
    fulfillment_type: 'shipping',
    shipping_cost: 0,
    shipping_total: 0,
    grand_total: 890000,
    items: 8
  },
  {
    id: '#10527W',
    customerName: 'Janet Richards',
    customerEmail: 'janet.r@outlook.com',
    date: 'Apr 28, 2026',
    subtotal: 15600,
    total: 15600,
    status: 'cancelled',
    paymentStatus: 'refunded',
    fulfillmentStatus: 'restocked',
    fulfillment_method: 'pickup',
    fulfillment_type: 'pickup',
    shipping_cost: 0,
    shipping_total: 0,
    grand_total: 15600,
    items: 2
  },
  {
    id: '#10526W',
    customerName: 'David Graham',
    customerEmail: 'd.graham@samkhi.com',
    date: 'Apr 25, 2026',
    subtotal: 2100000,
    total: 2100000,
    status: 'payment_confirmed',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    fulfillment_method: 'pickup',
    fulfillment_type: 'pickup',
    shipping_cost: 0,
    shipping_total: 0,
    grand_total: 2100000,
    items: 24
  }
];

export const COLLECTIONS: Collection[] = [
  {
    id: 'solar-inverters',
    title: 'Solar Inverters',
    description: 'Reliable and highly efficient hybrid and off-grid power conversion systems.',
    imageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=800',
    productCount: 85,
    type: 'automated',
    conditions: [
      { id: 'cd2', field: 'tag', operator: 'equals', value: 'Inverters' }
    ],
    status: 'active',
    updatedAt: 'May 4, 2024'
  },
  {
    id: 'backup-generators',
    title: 'Backup Generators',
    description: 'Heavy-duty residential and commercial backup solar and fuel generators.',
    imageUrl: 'https://images.unsplash.com/photo-1548611716-300181be3912?auto=format&fit=crop&q=80&w=800',
    productCount: 19,
    type: 'automated',
    conditions: [
      { id: 'cd7', field: 'tag', operator: 'equals', value: 'Generators' }
    ],
    status: 'active',
    updatedAt: 'May 1, 2024'
  },
  {
    id: 'solar-batteries',
    title: 'Batteries & Energy Storage',
    description: 'Premium lithium iron phosphate (LiFePO4) energy storage cells for prolonged backup.',
    imageUrl: 'https://images.unsplash.com/photo-1558441719-6705166e2106?auto=format&fit=crop&q=80&w=800',
    productCount: 34,
    type: 'automated',
    conditions: [
      { id: 'cd4', field: 'tag', operator: 'equals', value: 'Batteries' }
    ],
    status: 'active',
    updatedAt: 'May 2, 2024'
  },
  {
    id: 'solar-water-heaters',
    title: 'Solar Water Heaters',
    description: 'Highly insulated thermosiphon solar water heater units for zero-cost water heating.',
    imageUrl: 'https://images.unsplash.com/photo-1584271854089-9bb3e5178d42?auto=format&fit=crop&q=80&w=800',
    productCount: 28,
    type: 'automated',
    conditions: [
      { id: 'cd5', field: 'tag', operator: 'equals', value: 'Solar Water Heaters' }
    ],
    status: 'active',
    updatedAt: 'May 1, 2024'
  },
  {
    id: 'solar-lighting-security',
    title: 'Solar Lighting & Security',
    description: 'Energy-efficient outdoor solar floodlights, street lights, and motion-sensor security systems.',
    imageUrl: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&q=80&w=800',
    productCount: 42,
    type: 'automated',
    conditions: [
      { id: 'cd3', field: 'tag', operator: 'equals', value: 'LED Lighting' }
    ],
    status: 'active',
    updatedAt: 'May 3, 2024'
  },
  {
    id: 'accessories',
    title: 'Solar Installation & Accessories',
    description: 'High-quality PV cables, mounting brackets, solar connectors, fuses, and charge controllers.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800',
    productCount: 45,
    type: 'automated',
    conditions: [
      { id: 'cd8', field: 'tag', operator: 'equals', value: 'Accessories' }
    ],
    status: 'active',
    updatedAt: 'May 1, 2024'
  },
  {
    id: 'solar-panels',
    title: 'Solar Panels',
    description: 'High-performance photovoltaic panels for maximum energy capture under the tropical sun.',
    imageUrl: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=800',
    productCount: 112,
    type: 'automated',
    conditions: [
      { id: 'cd1', field: 'tag', operator: 'equals', value: 'Solar Panels' }
    ],
    status: 'active',
    updatedAt: 'May 5, 2024'
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
    lastOrder: 'May 02, 2026',
    returns: [
      {
        id: 'RMA-1042',
        orderId: '#10530W',
        customerName: 'Robert Campbell',
        customerEmail: 'robert.c@example.jm',
        items: [
          {
            productId: 'p-inv-5kw',
            productName: 'Must Solar 5kW Hybrid Inverter 48V',
            sku: 'MS-5048-HYB',
            quantity: 1,
            unitPrice: 145000,
            reason: 'Customer upgraded to 10kW commercial package'
          }
        ],
        refundAmount: 145000,
        condition: 'Unopened / New',
        status: 'Restocked & Refunded',
        notes: 'Factory-sealed unit returned to Kingston warehouse. Full refund issued.',
        requestedAt: '2026-05-03T10:15:00Z',
        processedAt: '2026-05-04T14:30:00Z'
      }
    ]
  },
  {
    id: 'CUST002',
    name: 'Sandra Williams',
    email: 'sandra.w@flow.com',
    location: 'Kingston 6, St. Andrew',
    orders: 1,
    spent: 45000,
    lastOrder: 'May 01, 2026',
    returns: []
  },
  {
    id: 'CUST003',
    name: 'Michael Thompson',
    email: 'm.thompson@gmail.com',
    location: 'Montego Bay, St. James',
    orders: 5,
    spent: 2800000,
    lastOrder: 'Apr 30, 2026',
    returns: [
      {
        id: 'RMA-1039',
        orderId: '#10528W',
        customerName: 'Michael Thompson',
        customerEmail: 'm.thompson@gmail.com',
        items: [
          {
            productId: 'p-flood-100w',
            productName: '100W Commercial LED Solar Floodlight',
            sku: 'SL-FL-100W',
            quantity: 2,
            unitPrice: 18500,
            reason: 'Defective dusk-to-dawn sensor - photocell continuously triggered'
          }
        ],
        refundAmount: 37000,
        condition: 'Defective on Arrival',
        status: 'Approved',
        notes: 'Photocell diode failure verified by technician. Warranty credit approved.',
        requestedAt: '2026-05-01T09:00:00Z',
        processedAt: '2026-05-02T11:20:00Z'
      }
    ]
  },
  {
    id: 'CUST004',
    name: 'Janet Richards',
    email: 'janet.r@outlook.com',
    location: 'Mandeville, Manchester',
    orders: 2,
    spent: 32000,
    lastOrder: 'Apr 28, 2026',
    returns: []
  },
  {
    id: 'CUST005',
    name: 'David Graham',
    email: 'd.graham@samkhi.com',
    location: 'Runaway Bay, St. Ann',
    orders: 12,
    spent: 8500000,
    lastOrder: 'Apr 25, 2026',
    returns: []
  }
];

export const INITIAL_RETURNS: ReturnRequest[] = [
  {
    id: 'RMA-1042',
    orderId: '#10530W',
    customerName: 'Robert Campbell',
    customerEmail: 'robert.c@example.jm',
    items: [
      {
        productId: 'p-inv-5kw',
        productName: 'Must Solar 5kW Hybrid Inverter 48V',
        sku: 'MS-5048-HYB',
        quantity: 1,
        unitPrice: 145000,
        reason: 'Customer upgraded to 10kW commercial package'
      }
    ],
    refundAmount: 145000,
    condition: 'Unopened / New',
    status: 'Restocked & Refunded',
    notes: 'Factory-sealed unit returned to Kingston warehouse. Full refund issued.',
    requestedAt: '2026-05-03T10:15:00Z',
    processedAt: '2026-05-04T14:30:00Z'
  },
  {
    id: 'RMA-1039',
    orderId: '#10528W',
    customerName: 'Michael Thompson',
    customerEmail: 'm.thompson@gmail.com',
    items: [
      {
        productId: 'p-flood-100w',
        productName: '100W Commercial LED Solar Floodlight',
        sku: 'SL-FL-100W',
        quantity: 2,
        unitPrice: 18500,
        reason: 'Defective dusk-to-dawn sensor - photocell continuously triggered'
      }
    ],
    refundAmount: 37000,
    condition: 'Defective on Arrival',
    status: 'Approved',
    notes: 'Photocell diode failure verified by technician. Warranty credit approved.',
    requestedAt: '2026-05-01T09:00:00Z',
    processedAt: '2026-05-02T11:20:00Z'
  }
];
