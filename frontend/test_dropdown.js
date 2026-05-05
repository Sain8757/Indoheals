const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:5001/index.html');
  await page.waitForSelector('#accountLink');
  
  const initialClass = await page.$eval('#accountDropdown', el => el.className);
  console.log('Initial class:', initialClass);
  
  await page.click('#accountLink');
  await page.waitForTimeout(500); // Wait for transition
  
  const afterClickClass = await page.$eval('#accountDropdown', el => el.className);
  console.log('After click class:', afterClickClass);
  
  // also get the bounding box of the dropdown
  const box = await page.$eval('#accountDropdown', el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
          x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          display: style.display, visibility: style.visibility, opacity: style.opacity,
          zIndex: style.zIndex
      };
  });
  console.log('Dropdown metrics:', box);
  
  await browser.close();
})();
