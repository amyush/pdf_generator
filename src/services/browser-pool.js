const puppeteer = require('puppeteer');
const config = require('../config');

let browser = null;
const available = [];
const waiting = [];

async function initBrowserPool() {
  browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });

  for (let i = 0; i < config.puppeteer.concurrency; i++) {
    const page = await browser.newPage();
    available.push(page);
  }
  console.log(`Browser pool: ${config.puppeteer.concurrency} pages ready`);
}

function acquirePage() {
  return new Promise((resolve) => {
    const page = available.pop();
    if (page) return resolve(page);
    waiting.push(resolve);
  });
}

async function releasePage(page) {
  try {
    await page.goto('about:blank');
  } catch {
    // Page is broken (crashed/OOM), replace with fresh one
    try { await page.close(); } catch {}
    page = await browser.newPage();
  }

  const next = waiting.shift();
  if (next) {
    next(page);
  } else {
    available.push(page);
  }
}

async function closeBrowserPool() {
  if (browser) {
    await browser.close();
    console.log('Browser pool closed');
  }
}

module.exports = { initBrowserPool, acquirePage, releasePage, closeBrowserPool };
