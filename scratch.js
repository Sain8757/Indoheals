const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5001/admin');
  
  console.log("Testing Coupons...");
  await page.click('a[href="#coupons"]');
  await page.waitForTimeout(500);
  
  // click create coupon button
  const buttons = await page.$$('button');
  for (let b of buttons) {
    const text = await b.evaluate(el => el.textContent);
    if (text.includes('+ Coupon Banao')) {
      await b.click();
      console.log('Clicked Coupon Banao');
      break;
    }
  }

  await page.waitForTimeout(1000);
  await browser.close();
})();
