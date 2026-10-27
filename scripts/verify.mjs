import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = http.createServer((request, response) => {
  if (request.url === '/ad.js') {
    response.setHeader('Content-Type', 'text/javascript');
    response.end('window.adLoaded = true;');
    return;
  }

  response.setHeader('Content-Type', 'text/html');
  response.end(`<!doctype html><html><head><style>
    .adthrive-ad, .randomAdClass { display: flex; }
    #AdThrive_Footer_1_desktop, #randomFooterId { display: flex; }
    .ordinary-selector, .ordinary-content { display: block; }
  </style></head><body>
    <h1>Deck list</h1><a href="/plain-target">Plain link</a>
    <div id="content"><div class="container-xl"><div id="deck-sections">
      <h2>Text Decklist</h2><div class="deck-content-area">Card list</div>
      <div id="placement-mpu" class="placement mt-3" style="min-height:250px">Ads</div>
      <h2 id="visual-heading" class="mt-5 text-theme-muted">Visual Decklist</h2><div class="px-0" id="visual-decklist">Deck Style <button>Grouped</button></div>
      <div class="mt-3">Other information</div><h2>Deck Stats</h2><div class="card">Deck statistics</div>
      <div><h2 id="other-heading">Visual Decklist</h2><div class="card">Unrelated section</div></div>
    </div></div></div>
    <button onclick="
      const heading = document.createElement('h2');
      heading.textContent = 'Visual Decklist';
      heading.id = 'later-visual-heading';
      const visual = document.createElement('div');
      visual.className = 'px-0';
      visual.id = 'later-visual-decklist';
      visual.textContent = 'Deck Style';
      document.querySelector('#deck-sections').append(heading);
      document.querySelector('#deck-sections').append(visual);
    ">Open another deck</button>
    <div class="randomAdClass">Ad</div>
    <div id="randomFooterId">Footer ad</div>
    <div class="ordinary-content">Useful content</div>
    <div id="placement-header-desktop">Ad space</div>
    <button onclick="
      const style = document.createElement('style');
      style.textContent = '.adthrive-ad-cls, .newRandomAdClass { display: flex; }';
      document.head.appendChild(style);
      const ad = document.createElement('div');
      ad.className = 'newRandomAdClass';
      ad.textContent = 'New ad';
      document.body.appendChild(ad);
    ">Add ad</button>
    <button onclick="
      const style = document.createElement('style');
      document.body.appendChild(style);
      style.sheet.insertRule('.adthrive-ad-cls, .cssomRandomAd { display: flex; }');
      const ad = document.createElement('div');
      ad.className = 'cssomRandomAd';
      const frame = document.createElement('iframe');
      frame.title = '3rd party ad content';
      ad.appendChild(frame);
      document.body.appendChild(ad);
    ">Add recovered ad</button>
    <button onclick="
      window.delayedStyle = document.createElement('style');
      document.head.appendChild(window.delayedStyle);
    ">Prepare stylesheet</button>
    <button onclick="
      window.delayedStyle.sheet.insertRule('.adthrive-ad, .lateCssomAd { display: flex; }');
      const ad = document.createElement('div');
      ad.className = 'lateCssomAd';
      const frame = document.createElement('iframe');
      ad.appendChild(frame);
      document.body.appendChild(ad);
    ">Add late ad</button>
    <button onclick="document.querySelector('.lateCssomAd iframe').title = '3rd party ad content'">Identify ad frame</button>
    <a href="#deck-stats" role="tab" onclick="event.preventDefault(); document.body.dataset.tabActivated='yes'">Stats tab</a>
    <table class="table-clickable"><tbody>
      <tr data-href="/target?deck=1"><td><a href="/target?deck=1" onclick="window.linkClicks=(window.linkClicks||0)+1"><strong>Matching link</strong></a></td><td>Row destination</td></tr>
      <tr data-href="/row-destination"><td><a href="/different-destination">Different link</a></td></tr>
    </tbody></table>
    <button onclick="
      const row = document.createElement('tr');
      row.dataset.href = '/dynamic-target';
      row.innerHTML = '&lt;td&gt;&lt;a href=&quot;/dynamic-target&quot;&gt;Dynamic row link&lt;/a&gt;&lt;/td&gt;';
      document.querySelector('.table-clickable tbody').appendChild(row);
    ">Add row</button>
    <script>
      document.querySelector('.table-clickable tbody').addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (row?.hasAttribute('data-href') && !event.target.classList.contains('btn')) {
          window.location.href = row.getAttribute('data-href');
        }
      });
    </script>
    <script src="http://ads.adthrive.com:${server.address().port}/ad.js"></script>
  </body></html>`);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const profile = await mkdtemp(path.join(os.tmpdir(), 'better-riftdecks-test-'));
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROME_BIN || undefined,
    headless: false,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      '--proxy-server=direct://',
      '--proxy-bypass-list=*',
      '--host-resolver-rules=MAP riftdecks.com 127.0.0.1, MAP *.riftdecks.com 127.0.0.1, MAP mtgdecks.net 127.0.0.1, MAP *.mtgdecks.net 127.0.0.1, MAP inkdecks.com 127.0.0.1, MAP *.inkdecks.com 127.0.0.1, MAP example.test 127.0.0.1, MAP ads.adthrive.com 127.0.0.1',
    ],
  });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(5000);
  for (const host of ['riftdecks.com', 'www.riftdecks.com', 'mtgdecks.net', 'www.mtgdecks.net', 'inkdecks.com', 'www.inkdecks.com', 'example.test']) {
    await page.goto(`http://${host}:${server.address().port}/`, { waitUntil: 'load' });
    const isSupportedSite = host !== 'example.test';
    if (isSupportedSite) {
      await page.locator('.randomAdClass').waitFor({ state: 'hidden' });
      await page.locator('#randomFooterId').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#placement-header-desktop').isVisible(), false);
      assert.equal(await page.locator('#placement-mpu').isVisible(), false);
      assert.equal(await page.evaluate(() => window.adLoaded === true), false);
    } else {
      assert.equal(await page.locator('.randomAdClass').isVisible(), true);
      assert.equal(await page.locator('#randomFooterId').isVisible(), true);
      assert.equal(await page.locator('#placement-header-desktop').isVisible(), true);
      assert.equal(await page.locator('#placement-mpu').isVisible(), true);
      assert.equal(await page.evaluate(() => window.adLoaded === true), true);
    }
    assert.equal(await page.locator('.ordinary-content').isVisible(), true);
    assert.equal(await page.locator('.deck-content-area').isVisible(), true);
    assert.equal(await page.getByRole('heading', { name: 'Deck Stats' }).isVisible(), true);
    assert.equal(await page.locator('#other-heading').isVisible(), true);
    if (isSupportedSite) {
      await page.locator('#visual-decklist').waitFor({ state: 'hidden', timeout: 3000 });
      assert.equal(await page.locator('#visual-heading').isVisible(), false);
    } else {
      assert.equal(await page.locator('#visual-decklist').isVisible(), true);
      assert.equal(await page.locator('#visual-heading').isVisible(), true);
    }
    await page.getByRole('button', { name: 'Open another deck' }).click();
    if (isSupportedSite) {
      await page.locator('#later-visual-decklist').waitFor({ state: 'hidden', timeout: 3000 });
      assert.equal(await page.locator('#later-visual-heading').isVisible(), false);
    } else {
      assert.equal(await page.locator('#later-visual-decklist').isVisible(), true);
      assert.equal(await page.locator('#later-visual-heading').isVisible(), true);
    }
    await page.getByRole('button', { name: 'Add ad' }).click();
    if (isSupportedSite) {
      await page.locator('.newRandomAdClass').waitFor({ state: 'hidden' });
    } else {
      assert.equal(await page.locator('.newRandomAdClass').isVisible(), true);
    }
    await page.getByRole('button', { name: 'Add recovered ad' }).click();
    if (isSupportedSite) {
      await page.locator('.cssomRandomAd').waitFor({ state: 'hidden', timeout: 3000 });
    } else {
      assert.equal(await page.locator('.cssomRandomAd').isVisible(), true);
    }
    await page.getByRole('button', { name: 'Prepare stylesheet' }).click();
    await page.getByRole('button', { name: 'Add late ad' }).click();
    assert.equal(await page.locator('.lateCssomAd').isVisible(), true);
    await page.getByRole('button', { name: 'Identify ad frame' }).click();
    if (isSupportedSite) {
      await page.locator('.lateCssomAd').waitFor({ state: 'hidden', timeout: 3000 });
    } else {
      assert.equal(await page.locator('.lateCssomAd').isVisible(), true);
    }
    if (host === 'riftdecks.com' && process.env.BETTER_RIFTDECKS_SCREENSHOT) {
      await page.screenshot({ path: process.env.BETTER_RIFTDECKS_SCREENSHOT });
    }
    if (isSupportedSite) {
      await page.getByRole('button', { name: 'Add row' }).click();
      const oldUrl = page.url();
      for (const [name, expected, options] of [
        ['Plain link', '/plain-target', { modifiers: ['Meta'] }],
        ['Matching link', '/target', { modifiers: ['Meta'] }],
        ['Dynamic row link', '/dynamic-target', { modifiers: ['Meta'] }],
        ['Matching link', '/target', { modifiers: ['Shift'] }],
        ['Matching link', '/target', { button: 'middle' }],
      ]) {
        const [newPage] = await Promise.all([
          context.waitForEvent('page', { timeout: 5000 }),
          page.getByText(name, { exact: true }).click(options),
        ]);
        await newPage.waitForURL(`**${expected}*`, { waitUntil: 'domcontentloaded', timeout: 5000 });
        assert.equal(new URL(newPage.url()).pathname, expected);
        assert.equal(page.url(), oldUrl);
        await newPage.close();
      }
      assert.equal(await page.evaluate(() => window.linkClicks), 2);
      await page.getByRole('tab', { name: 'Stats tab' }).click({ modifiers: ['Meta'] });
      assert.equal(await page.locator('body').getAttribute('data-tab-activated'), 'yes');
      await page.getByText('Different link', { exact: true }).click({ modifiers: ['Meta'] });
      await page.waitForURL('**/row-destination');
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.getByText('Matching link', { exact: true }).click();
      await page.waitForURL('**/target?deck=1');
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.getByText('Row destination').click();
      await page.waitForURL('**/target?deck=1');
    } else {
      await page.getByText('Matching link').click({ modifiers: ['Meta'] });
      await page.waitForURL('**/target?deck=1');
    }
    console.log(`${host}: ${isSupportedSite ? 'ad, decklist, and link checks passed' : 'unchanged'}`);
  }
} finally {
  if (context) await context.close();
  server.close();
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
