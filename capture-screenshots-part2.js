const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }, // desktop for dashboard
    locale: 'tr-TR'
  });
  const page = await context.newPage();
  
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Login
  console.log("7. Logging in for dashboard...");
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'enespehlivan@live.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
  
  // 7. Beiwe editörü
  console.log("7. Beiwe editörü");
  await page.goto('http://localhost:3000/dashboard/editor', { waitUntil: 'networkidle' });
  await wait(4000);
  
  // Click the collapsed widget preview to expand it
  await page.evaluate(() => {
    const groupDivs = document.querySelectorAll('.group');
    for (const div of groupDivs) {
      if (div.querySelector('input[readonly]')) {
        div.click();
      }
    }
  });
  await wait(2000);

  // Dump DOM
  const html = await page.content();
  fs.writeFileSync(path.join(__dirname, 'debug-dom3.html'), html);

  // Send a message to Beiwe
  await page.fill('textarea', 'Bana yapabildiklerini markdown formatında, kalın yazılar ve listeler kullanarak anlat.');
  await page.keyboard.press('Enter');
  await wait(15000); // wait for detailed markdown generation
  await page.screenshot({ path: path.join(screenshotsDir, '7-beiwe-editor.png') });
  console.log("Saved 7-beiwe-editor.png");

  // 8. Talep kutusu
  console.log("8. Talep kutusu");
  await page.goto('http://localhost:3000/dashboard/leads', { waitUntil: 'networkidle' });
  await wait(4000); // wait for data to load
  await page.screenshot({ path: path.join(screenshotsDir, '8-talep-kutusu.png') });
  console.log("Saved 8-talep-kutusu.png");

  await browser.close();
})();
