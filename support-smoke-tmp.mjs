import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', err => errors.push('pageerror: ' + err.message));

// 1. Load homepage, check footer link
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'C:/Users/nikec/AppData/Local/Temp/claude/C--Users-nikec-Desktop-jd-skill-parser/718dd66e-602f-44bd-b7f6-bdb38c67fabd/scratchpad/01-home.png', fullPage: true });

const footerLink = page.locator('a:has-text("Support the project")');
const footerLinkCount = await footerLink.count();
console.log('Footer link found:', footerLinkCount);

if (footerLinkCount > 0) {
  await footerLink.first().click();
  await page.waitForURL('**/support', { timeout: 10000 }).catch(e => console.log('URL wait error:', e.message));
}

await page.waitForTimeout(500);
console.log('Current URL after footer click:', page.url());
await page.screenshot({ path: 'C:/Users/nikec/AppData/Local/Temp/claude/C--Users-nikec-Desktop-jd-skill-parser/718dd66e-602f-44bd-b7f6-bdb38c67fabd/scratchpad/02-support-via-footer.png', fullPage: true });

// 2. Direct nav to /support
await page.goto('http://localhost:5173/support', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: 'C:/Users/nikec/AppData/Local/Temp/claude/C--Users-nikec-Desktop-jd-skill-parser/718dd66e-602f-44bd-b7f6-bdb38c67fabd/scratchpad/03-support-direct.png', fullPage: true });

const bodyText = await page.locator('body').innerText();
console.log('--- /support page text ---');
console.log(bodyText.slice(0, 1500));

const signInBtn = page.locator('button:has-text("Sign in"), a:has-text("Sign in")');
console.log('Sign-in button count:', await signInBtn.count());

// 3. Mobile viewport check
await page.setViewportSize({ width: 375, height: 800 });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.screenshot({ path: 'C:/Users/nikec/AppData/Local/Temp/claude/C--Users-nikec-Desktop-jd-skill-parser/718dd66e-602f-44bd-b7f6-bdb38c67fabd/scratchpad/04-support-mobile.png', fullPage: true });

const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
console.log('Mobile scrollWidth vs clientWidth:', scrollWidth, clientWidth, scrollWidth > clientWidth ? 'OVERFLOW' : 'OK');

console.log('--- console errors ---');
console.log(errors.length ? errors.join('\n') : 'none');

await browser.close();
