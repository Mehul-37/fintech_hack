import { chromium } from 'file:///C:/Users/yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';

await fs.mkdir('tmp/recording-checks', {recursive: true});
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false,
  args: ['--start-fullscreen', '--disable-notifications'],
});
const context = await browser.newContext({viewport: {width: 1920, height: 1080}, screen: {width: 1920, height: 1080}, deviceScaleFactor: 1});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {if(message.type() === 'error') errors.push(message.text());});
await page.goto('http://127.0.0.1:5173/', {waitUntil: 'networkidle'});
await page.waitForTimeout(3200);
await page.screenshot({path: 'tmp/recording-checks/01-overview.png'});
console.log('OVERVIEW', (await page.locator('body').innerText()).slice(0, 5500));
await page.getByRole('button', {name: 'Replay Arjun’s timeline', exact: true}).click();
await page.waitForTimeout(500);
console.log('CUSTOMERS', await page.getByRole('combobox', {name: 'Demo customer', exact: true}).locator('option').allTextContents());
await page.getByRole('button', {name: 'Jump to day 24', exact: true}).click();
await page.waitForTimeout(800);
await page.screenshot({path: 'tmp/recording-checks/02-arjun.png'});
console.log('ARJUN', (await page.locator('body').innerText()).slice(0, 9500));
await page.getByRole('button', {name: 'Create fraud investigation', exact: false}).click();
await page.getByRole('combobox', {name: 'Case status', exact: true}).selectOption('In review');
await page.getByRole('button', {name: 'Customer 360', exact: true}).last().click();
await page.getByRole('button', {name: 'Request repayment-support review', exact: false}).click();
await page.getByRole('textbox', {name: 'Analyst note', exact: true}).fill('Review the transfers and assess EMI timing. Customer confirmation pending.');
await page.getByRole('button', {name: 'Add note', exact: false}).click();
await page.getByRole('textbox', {name: 'Analyst note', exact: true}).scrollIntoViewIfNeeded();
await page.screenshot({path: 'tmp/recording-checks/03-saved-note.png'});
console.log('CASE', (await page.locator('body').innerText()).slice(-6500));
await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('button', {name: 'Customer 360', exact: true}).click();
await page.getByRole('combobox', {name: 'Demo customer', exact: true}).selectOption({label: 'Rohan Kapoor · Mule-like pass-through'}).catch(async () => {
  const options = await page.getByRole('combobox', {name: 'Demo customer', exact: true}).locator('option').evaluateAll(nodes => nodes.map(n=>({value:n.value,label:n.textContent})));
  await page.getByRole('combobox', {name: 'Demo customer', exact: true}).selectOption(options.find(o=>o.label.includes('Rohan Kapoor')).value);
});
await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('button', {name: 'Transactions & Network', exact: true}).click();
await page.getByRole('tab', {name: /Money-flow network/}).click();
await page.waitForTimeout(800);
await page.screenshot({path: 'tmp/recording-checks/04-rohan.png'});
console.log('NETWORK', (await page.locator('body').innerText()).slice(-6500));
console.log('ERRORS', JSON.stringify(errors));
await context.close();
await browser.close();
