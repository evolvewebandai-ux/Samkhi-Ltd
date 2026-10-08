import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Support running in CJS/ESM contexts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const DEFAULT_DOMAIN = 'https://www.samkhilimited.com';
const FIREBASE_CONFIG_PATH = path.join(__dirname, 'firebase-applet-config.json');
const DATA_FILE_PATH = path.join(__dirname, 'src', 'data.ts');

async function run() {
  console.log('🚀 Starting Sitemap and robots.txt generator...');

  // 1. Determine local site domain using env fallback hierarchy
  let siteUrl = process.env.VITE_SITE_URL || process.env.APP_URL || DEFAULT_DOMAIN;
  if (siteUrl.endsWith('/')) {
    siteUrl = siteUrl.slice(0, -1);
  }
  console.log(`📡 Target base domain configured as: ${siteUrl}`);

  // 2. Base static storefront pages
  const staticPages = [
    { route: '', changefreq: 'daily', priority: '1.0' },
    { route: 'shop', changefreq: 'daily', priority: '0.9' },
    { route: 'led-lighting', changefreq: 'daily', priority: '0.8' },
    { route: 'solar', changefreq: 'daily', priority: '0.8' },
    { route: 'inverters-batteries', changefreq: 'daily', priority: '0.8' },
    { route: 'water-heaters', changefreq: 'daily', priority: '0.8' },
    { route: 'pool-pumps', changefreq: 'daily', priority: '0.8' },
    { route: 'generators', changefreq: 'daily', priority: '0.8' },
    { route: 'commercial', changefreq: 'weekly', priority: '0.8' },
    { route: 'about', changefreq: 'monthly', priority: '0.7' },
    { route: 'contact', changefreq: 'monthly', priority: '0.7' },
    { route: 'faq', changefreq: 'monthly', priority: '0.6' },
    { route: 'warranty', changefreq: 'monthly', priority: '0.6' },
    { route: 'delivery', changefreq: 'monthly', priority: '0.6' },
    { route: 'returns', changefreq: 'monthly', priority: '0.6' },
    { route: 'privacy', changefreq: 'monthly', priority: '0.5' },
    { route: 'terms', changefreq: 'monthly', priority: '0.5' },
    { route: 'quote', changefreq: 'daily', priority: '0.8' },
  ];

  const productIdsSet = new Set<string>();

  // 3. Strategy A: Try importing products dynamically from src/data.ts
  try {
    const dataModule = await import('./src/data.js'); // Use js or ts resolve
    if (dataModule && dataModule.PRODUCTS && Array.isArray(dataModule.PRODUCTS)) {
      dataModule.PRODUCTS.forEach((prod: any) => {
        if (prod && prod.id) {
          productIdsSet.add(prod.id);
        }
      });
      console.log(`✨ Successfully imported ${dataModule.PRODUCTS.length} static products from source file.`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Warning: Direct TypeScript module import failed (${err.message}). Falling back to robust regex parsing.`);
    
    // Strategy B: Fallback to reading and parsing data.ts using regular expressions
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        // Match product IDs such as id: 'ecolite-chandelier-bulb' or id: "ecolite-chandelier-bulb"
        const matches = fileContent.matchAll(/id:\s*['"]([^'"]+)['"]/g);
        let count = 0;
        for (const match of matches) {
          const id = match[1];
          // Filter out other types of IDs by checking if is in order array, target dynamic block, or standard product structure
          if (id && !id.startsWith('#') && id !== 'starter' && id !== 'platinum' && !id.startsWith('c') && !id.startsWith('CUST') && id !== 'li1') {
            productIdsSet.add(id);
            count++;
          }
        }
        console.log(`📦 Fallback parsed ${count} possible product references from src/data.ts`);
      }
    } catch (parseErr: any) {
      console.error(`❌ Failed to parse data file: ${parseErr.message}`);
    }
  }

  // 4. Strategy C: Attempt connection to cloud Firestore to fetch user added products
  try {
    if (fs.existsSync(FIREBASE_CONFIG_PATH)) {
      const configJson = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_PATH, 'utf-8'));
      const projectId = configJson.projectId;
      const databaseId = configJson.firestoreDatabaseId || '(default)';
      
      if (projectId) {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/products`;
        console.log(`🌐 Attemping live Firestore sync fetch from: ${firestoreUrl}`);
        
        const response = await fetch(firestoreUrl);
        if (response.ok) {
          const data = await response.json();
          if (data && data.documents && Array.isArray(data.documents)) {
            let firestoreProductCount = 0;
            data.documents.forEach((doc: any) => {
              // Extract fields.id.stringValue
              const fields = doc.fields || {};
              const id = fields.id?.stringValue || fields.id?.nullValue;
              if (id) {
                productIdsSet.add(id);
                firestoreProductCount++;
              } else {
                // If ID is not directly in fields, extract from document path
                const parts = doc.name ? doc.name.split('/') : [];
                const lastPart = parts[parts.length - 1];
                if (lastPart) {
                  productIdsSet.add(lastPart);
                  firestoreProductCount++;
                }
              }
            });
            console.log(`⚡ Successfully synced ${firestoreProductCount} live custom products from Cloud Firestore!`);
          } else {
            console.log('ℹ️ Firestore products collection is currently empty or contains no records.');
          }
        } else {
          console.log(`ℹ️ Firestore REST respond status: ${response.status} (Skipped database sync).`);
        }
      }
    }
  } catch (firebaseErr: any) {
    console.warn(`ℹ️ Cloud database sync was bypassed or could not connect: ${firebaseErr.message}`);
  }

  // 5. Generate XML output
  const today = new Date().toISOString().split('T')[0];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add static routes
  staticPages.forEach((page) => {
    const routePath = page.route ? `/${page.route}` : '';
    xml += '  <url>\n';
    xml += `    <loc>${siteUrl}${routePath}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  // Add product detail routes
  Array.from(productIdsSet).forEach((productId) => {
    xml += '  <url>\n';
    xml += `    <loc>${siteUrl}/product/${productId}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';

  // 6. Generate robots.txt content
  let robotsTxt = `# Samkhi Limited Robots Exclusion Standard File\n`;
  robotsTxt += `# Dynamic Build Timestamp: ${new Date().toUTCString()}\n\n`;
  robotsTxt += `User-agent: *\n`;
  robotsTxt += `Allow: /\n\n`;
  robotsTxt += `# Block search engines from crawling administration or checkout directories\n`;
  robotsTxt += `Disallow: /admin\n`;
  robotsTxt += `Disallow: /admin/\n`;
  robotsTxt += `Disallow: /checkout\n`;
  robotsTxt += `Disallow: /checkout/\n`;
  robotsTxt += `Disallow: /cart\n`;
  robotsTxt += `Disallow: /cart/\n`;
  robotsTxt += `Disallow: /account\n`;
  robotsTxt += `Disallow: /account/\n\n`;
  robotsTxt += `# Point to dynamic sitemap xml location\n`;
  robotsTxt += `Sitemap: ${siteUrl}/sitemap.xml\n`;

  // 7. Write to output locations
  const writeOutputs = (fileName: string, content: string) => {
    // Write to static public folder so it gets bundled persistently
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const publicPath = path.join(publicDir, fileName);
    fs.writeFileSync(publicPath, content, 'utf-8');
    console.log(`✓ Saved ${fileName} persistently to: /public/${fileName}`);

    // Post-build injection: write directly to build output folder if it exists
    const distDir = path.join(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      const distPath = path.join(distDir, fileName);
      fs.writeFileSync(distPath, content, 'utf-8');
      console.log(`✓ Injected ${fileName} into live build folder: /dist/${fileName}`);
    }
  };

  writeOutputs('sitemap.xml', xml);
  writeOutputs('robots.txt', robotsTxt);

  console.log('🎉 SEO Sitemap and configurations successfully generated!');
}

run().catch((err) => {
  console.error('❌ Error generating SEO materials:', err);
  process.exit(1);
});
