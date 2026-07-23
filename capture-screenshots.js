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

  // Helper to wait for network/idle
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  console.log("Navigating to localhost:3000...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 1. Karşılama
  console.log("1. Karşılama");
  // Find widget toggle and click it. It's usually a fixed button. 
  // Let's look for a button containing a MessageCircle or something similar, often at the bottom right.
  // Actually, we can evaluate a script to click the chat button, or wait for the widget toggle.
  const toggleBtn = await page.evaluateHandle(() => {
    // Try to find the floating action button. Usually it has a high z-index and is fixed at bottom-right
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => {
      const style = window.getComputedStyle(b);
      return style.position === 'fixed' && (style.bottom || style.right) && style.borderRadius !== '0px';
    });
  });
  if (toggleBtn) {
    await toggleBtn.click();
  } else {
    console.log("Could not find toggle button, trying to find by text 'Chat' or similar");
    await page.getByRole('button').last().click();
  }

  await wait(2000); // Wait for animation and first message
  
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
  await wait(3000); // extra wait for stream to finish
  await page.screenshot({ path: path.join(screenshotsDir, '2-fiyat.png') });
  console.log("Saved 2-fiyat.png");

  // 3. Lead yakalama
  console.log("3. Lead yakalama");
  await page.fill('textarea', 'Olur, ilgileniyorum. Enes Polat - enes@talkinbio.com');
  await page.keyboard.press('Enter');
  await page.waitForSelector('text=bilgilerinizi aldım', { timeout: 20000 }).catch(() => {});
  await wait(2000);
  await page.screenshot({ path: path.join(screenshotsDir, '3-lead.png') });
  console.log("Saved 3-lead.png");

  // 4. Rusça
  console.log("4. Rusça");
  // Click reset chat. Usually the rotate-ccw icon button in header.
  // It's the first button in a group of two buttons in the header.
  await page.evaluate(() => {
    const headers = document.querySelectorAll('h3');
    for (let h of headers) {
      if (h.textContent === 'Saule') {
        const headerDiv = h.closest('div').parentElement;
        const buttons = headerDiv.querySelectorAll('button');
        if (buttons.length >= 2) {
          buttons[0].click(); // reset button
        }
      }
    }
  });
  await wait(1000);
  
  await page.fill('textarea', 'Здравствуйте! Я парикмахер из Алматы. Что умеет ваш ассистент?');
  await page.keyboard.press('Enter');
  // wait for russian chars
  await page.waitForSelector('text=Я могу', { timeout: 20000 }).catch(() => {});
  await wait(3000);
  await page.screenshot({ path: path.join(screenshotsDir, '4-rusca.png') });
  console.log("Saved 4-rusca.png");

  // 5. Sınır testi
  console.log("5. Sınır testi");
  await page.evaluate(() => {
    const headers = document.querySelectorAll('h3');
    for (let h of headers) {
      if (h.textContent === 'Saule') {
        const headerDiv = h.closest('div').parentElement;
        const buttons = headerDiv.querySelectorAll('button');
        if (buttons.length >= 2) {
          buttons[0].click(); // reset button
        }
      }
    }
  });
  await wait(1000);
  
  await page.fill('textarea', 'Cumartesi saat 14:00\'te müsait misiniz? Bir de kurucunun telefon numarasını verir misiniz?');
  await page.keyboard.press('Enter');
  await wait(5000); // wait for full rejection
  await page.screenshot({ path: path.join(screenshotsDir, '5-sinir-testi.png') });
  console.log("Saved 5-sinir-testi.png");

  // 6. Masaüstü sayfa
  console.log("6. Masaüstü sayfa");
  // close widget
  await page.evaluate(() => {
    const headers = document.querySelectorAll('h3');
    for (let h of headers) {
      if (h.textContent === 'Saule') {
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
  await wait(8000); // wait for detailed markdown generation
  await page.screenshot({ path: path.join(screenshotsDir, '7-beiwe-editor.png') });
  console.log("Saved 7-beiwe-editor.png");

  // 8. Talep kutusu
  console.log("8. Talep kutusu");
  await page.goto('http://localhost:3000/dashboard/leads', { waitUntil: 'networkidle' });
  await wait(3000); // wait for data to load
  await page.screenshot({ path: path.join(screenshotsDir, '8-talep-kutusu.png') });
  console.log("Saved 8-talep-kutusu.png");

  await browser.close();
})();
