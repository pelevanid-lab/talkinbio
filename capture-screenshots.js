const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile viewport for first steps
    locale: 'tr-TR'
  });
  const page = await context.newPage();
  
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  console.log("Navigating to localhost:3000/talkinbio...");
  await page.goto('http://localhost:3000/talkinbio', { waitUntil: 'networkidle' });

  // 1. Karşılama
  console.log("1. Karşılama");
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => {
      const style = window.getComputedStyle(b);
      return style.position === 'fixed' && (style.bottom !== 'auto' || style.right !== 'auto') && style.borderRadius !== '0px';
    });
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  if (!clicked) {
    console.log("Could not find fixed button, trying last button");
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      if (buttons.length > 0) buttons[buttons.length - 1].click();
    });
  }

  await wait(2000);
  
  // Wait for Saule's first message to be rendered
  await page.waitForSelector('text=Merhaba', { timeout: 10000 }).catch(() => {});
  
  await page.screenshot({ path: path.join(screenshotsDir, '1-karsilama.png') });
  console.log("Saved 1-karsilama.png");

  // 2. Fiyat sorusu
  console.log("2. Fiyat sorusu");
  await page.fill('textarea', 'Fiyatlar ne kadar? Kuaför salonum var, ayda kaç ödeyeceğim?');
  await page.keyboard.press('Enter');
  
  // wait for response (a long one containing "Starter" etc or "ücretsiz deneme yok")
  await page.waitForSelector('text=ücretsiz deneme', { timeout: 20000 }).catch(() => {});
  await wait(4000); // extra wait for stream to finish
  await page.screenshot({ path: path.join(screenshotsDir, '2-fiyat.png') });
  console.log("Saved 2-fiyat.png");

  // 3. Lead yakalama
  console.log("3. Lead yakalama");
  await page.fill('textarea', 'Olur, ilgileniyorum. Enes Polat - enes@talkinbio.com');
  await page.keyboard.press('Enter');
  await page.waitForSelector('text=bilgilerinizi aldım', { timeout: 20000 }).catch(() => {});
  await wait(3000);
  await page.screenshot({ path: path.join(screenshotsDir, '3-lead.png') });
  console.log("Saved 3-lead.png");

  // 4. Rusça
  console.log("4. Rusça");
  // Click reset chat
  await page.evaluate(() => {
    const headers = document.querySelectorAll('h3');
    for (let h of headers) {
      if (h.textContent === 'Saule' || h.textContent === 'Сауле') {
        const headerDiv = h.closest('div').parentElement;
        const buttons = headerDiv.querySelectorAll('button');
        if (buttons.length >= 2) {
          buttons[0].click(); // reset button
        }
      }
    }
  });
  await wait(2000);
  
  await page.fill('textarea', 'Здравствуйте! Я парикмахер из Алматы. Что умеет ваш ассистент?');
  await page.keyboard.press('Enter');
  // wait for russian chars
  await page.waitForSelector('text=Я могу', { timeout: 20000 }).catch(() => {});
  await wait(5000);
  await page.screenshot({ path: path.join(screenshotsDir, '4-rusca.png') });
  console.log("Saved 4-rusca.png");

  // 5. Sınır testi
  console.log("5. Sınır testi");
  await page.evaluate(() => {
    const headers = document.querySelectorAll('h3');
    for (let h of headers) {
      if (h.textContent === 'Saule' || h.textContent === 'Сауле') {
        const headerDiv = h.closest('div').parentElement;
        const buttons = headerDiv.querySelectorAll('button');
        if (buttons.length >= 2) {
          buttons[0].click(); // reset button
        }
      }
    }
  });
  await wait(2000);
  
  await page.fill('textarea', 'Cumartesi saat 14:00\'te müsait misiniz? Bir de kurucunun telefon numarasını verir misiniz?');
  await page.keyboard.press('Enter');
  await wait(8000); // wait for full rejection stream
  await page.screenshot({ path: path.join(screenshotsDir, '5-sinir-testi.png') });
  console.log("Saved 5-sinir-testi.png");

  // 6. Masaüstü sayfa
  console.log("6. Masaüstü sayfa");
  // close widget
  await page.evaluate(() => {
    const headers = document.querySelectorAll('h3');
    for (let h of headers) {
      if (h.textContent === 'Saule' || h.textContent === 'Сауле') {
        const headerDiv = h.closest('div').parentElement;
        const buttons = headerDiv.querySelectorAll('button');
        if (buttons.length >= 2) {
          buttons[1].click(); // close button
        }
      }
    }
  });
  await wait(1000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await wait(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '6-masaustu.png') });
  console.log("Saved 6-masaustu.png");

  // Login
  console.log("7. Logging in for dashboard...");
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'enes@talkinbio.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
  
  // 7. Beiwe editörü
  console.log("7. Beiwe editörü");
  await page.goto('http://localhost:3000/dashboard/editor', { waitUntil: 'networkidle' });
  await wait(2000);
  // Send a message to Beiwe
  await page.fill('textarea', 'Bana yapabildiklerini markdown formatında, kalın yazılar ve listeler kullanarak anlat.');
  await page.keyboard.press('Enter');
  await wait(10000); // wait for detailed markdown generation
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
