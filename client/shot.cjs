const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const OUT = 'C:/Users/suraj/Desktop/HRE/screenshots';

(async () => {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.setViewportSize({ width: 1440, height: 900 });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

  const shot = async (path, name, fullPage = true) => {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
    console.log('shot:', name);
  };

  await shot('/', '01-home');
  await shot('/how-it-works', '02-how-it-works');
  await shot('/register', '03-register');
  await shot('/marketplace', '04-marketplace');

  // login
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'buyer@hotelsunrise.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);

  await shot('/dashboard', '05-dashboard');
  await shot('/requirements/new', '06-post-requirement');
  await shot('/matches', '07-matches');
  await shot('/negotiations', '08-negotiations');
  await shot('/bookings/new', '09-booking-confirm');
  await shot('/fulfillment', '10-fulfillment');

  console.log('\n--- ERRORS ---');
  console.log(errors.length ? errors.join('\n') : 'none');

  await browser.close();
})();
