const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'landing.png', fullPage: true });

  await page.goto('http://localhost:5173/events/1');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'event1.png', fullPage: true });

  await page.goto('http://localhost:5173/events/2');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'event2.png', fullPage: true });

  await browser.close();
})();
