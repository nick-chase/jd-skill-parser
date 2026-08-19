import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
const footer = await page.locator('footer').innerHTML().catch(e => 'NO FOOTER TAG: ' + e.message);
console.log(footer);
await browser.close();
