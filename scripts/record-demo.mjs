import { chromium } from 'file:///C:/Users/yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve('output/videos');
await fs.mkdir(path.join(out, 'raw'), {recursive: true});
await fs.mkdir(path.join(out, 'checks'), {recursive: true});
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false,
  args: ['--start-fullscreen', '--disable-notifications'],
});
const context = await browser.newContext({
  viewport: {width: 1920, height: 1080}, screen: {width: 1920, height: 1080},
  deviceScaleFactor: 1,
  recordVideo: {dir: path.join(out, 'raw'), size: {width: 1920, height: 1080}},
});
const pageCreatedAt = Date.now();
const page = await context.newPage();
const video = page.video();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
await page.goto('http://127.0.0.1:5173/', {waitUntil: 'networkidle'});
await page.waitForTimeout(3100);
await page.evaluate(() => document.fonts.ready);
// Keep the footage free of tooltip remnants left by automated navigation.
await page.mouse.move(1900, 1040);
const startedAt = Date.now();
const markers = [];
const scenes = [
  {file:'01-project-scope.mp4', start:0, duration:15, label:'Project scope'},
  {file:'02-solution-approach.mp4', start:15, duration:15, label:'Solution approach'},
  {file:'03-arjun-suspicious-transfers.mp4', start:30, duration:25, label:'Arjun: suspicious transfers'},
  {file:'04-cash-flow-and-emi.mp4', start:55, duration:30, label:'Cash flow and repayment context'},
  {file:'05-rohan-money-flow-network.mp4', start:85, duration:15, label:'Rohan: money-flow network'},
  {file:'06-investigation-and-support-review.mp4', start:100, duration:25, label:'Saved investigation and support review'},
  {file:'07-closing-customer-timeline.mp4', start:125, duration:15, label:'Closing customer timeline'},
];
async function at(seconds) {
  const remaining = startedAt + seconds * 1000 - Date.now();
  if (remaining > 0) await page.waitForTimeout(remaining);
  else if (remaining < -1800) throw new Error(`Recording schedule missed ${seconds}s by ${-remaining}ms`);
}
async function mark(index) {
  const scene=scenes[index];
  markers.push({scene:scene.label, elapsedMs:Date.now()-startedAt});
  console.log(`RECORDING ${index+1}/7: ${scene.label} (${scene.start}s)`, {flush:true});
  await page.screenshot({path:path.join(out,'checks', `${String(index+1).padStart(2,'0')}-start.png`)});
}
async function moveTo(locator, seconds=.6) {
  const box=await locator.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x+Math.min(box.width*.45,80), box.y+Math.min(box.height*.45,22), {steps:Math.round(seconds*35)});
}
async function click(locator) {
  await locator.scrollIntoViewIfNeeded();
  await moveTo(locator);
  await locator.click();
  await page.mouse.move(1900,1040,{steps:12});
}
async function top() {await page.evaluate(()=>window.scrollTo({top:0,behavior:'smooth'}));}
const nav = name => page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true});
const day = n => page.getByRole('button',{name:`Jump to day ${n}`,exact:true});

await mark(0);
await at(4);
await moveTo(page.locator('.metric-grid'));
await at(8);
await moveTo(page.locator('.portfolio-card .card-heading'));
await at(12);
await moveTo(nav('Cases & Actions'));

await at(15);
await mark(1);
await at(17);
await click(page.getByRole('button',{name:'Replay Arjun’s timeline',exact:true}));
await at(20);
await moveTo(page.locator('.score-grid'));
await at(23);
await moveTo(page.locator('.context-card'));
await at(27);
await moveTo(page.locator('.financial-card'));

await at(30);
await mark(2);
await at(34);
await click(day(12));
await at(38);
await click(day(13));
await at(42);
await click(page.getByRole('button',{name:/Two transfers · six minutes apart/}));
await at(44);
await page.screenshot({path:path.join(out,'checks','03-transfer-evidence.png')});
await at(50);
await click(page.getByRole('button',{name:'Close detail',exact:true}));

await at(55);
await mark(3);
await at(57);
await click(day(17));
await at(61);
await click(day(20));
await at(65);
await click(day(24));
await at(68);
await page.screenshot({path:path.join(out,'checks','04-final-financial-state.png')});
await moveTo(page.locator('.financial-card'));
await at(73);
await moveTo(page.locator('.loan-card'));
await at(79);
await moveTo(page.locator('.score-grid'));

await at(85);
await mark(4);
await page.getByRole('combobox',{name:'Demo customer',exact:true}).selectOption('MR-1004');
await click(nav('Transactions & Network'));
await click(page.getByRole('tab',{name:/Money-flow network/}));
await at(90);
await page.mouse.move(1900,1040,{steps:12});
await page.screenshot({path:path.join(out,'checks','05-rohan-network.png')});
await at(94);
await moveTo(page.getByText('Fan-in → rapid onward flow',{exact:true}));

await at(100);
await mark(5);
await click(nav('Customer 360'));
await page.getByRole('combobox',{name:'Demo customer',exact:true}).selectOption('MR-1001');
await top();
await at(104);
await click(page.getByRole('button',{name:/Create fraud investigation/}));
await at(107);
await page.getByRole('combobox',{name:'Case status',exact:true}).selectOption('In review');
await at(109);
await click(page.getByRole('button',{name:'Customer 360',exact:true}).last());
await click(page.getByRole('button',{name:/Request repayment-support review/}));
await at(113);
const note=page.getByRole('textbox',{name:'Analyst note',exact:true});
await note.scrollIntoViewIfNeeded();
await note.pressSequentially('Assess EMI timing; customer confirmation pending.',{delay:32});
await at(117);
await click(page.getByRole('button',{name:/Add note/}));
await page.locator('.saved-note').last().scrollIntoViewIfNeeded();
await at(120);
await page.screenshot({path:path.join(out,'checks','06-saved-note-and-activity.png')});
await page.mouse.move(1900,1040,{steps:12});

await at(125);
await mark(6);
await click(nav('Customer 360'));
await top();
await at(129);
await page.mouse.move(1900,1040,{steps:12});
await page.screenshot({path:path.join(out,'checks','07-closing.png')});
await at(140);
const endedAt=Date.now();
await context.close();
const rawPath=await video.path();
const manifest={width:1920,height:1080,durationSeconds:140,audio:false,
  startedAt:new Date(startedAt).toISOString(), elapsedSeconds:(endedAt-startedAt)/1000,
  preRollEstimateSeconds:(startedAt-pageCreatedAt)/1000,rawPath,scenes,markers,errors};
await fs.writeFile(path.join(out,'recording-manifest.json'),JSON.stringify(manifest,null,2));
await browser.close();
console.log('CAPTURE COMPLETE',JSON.stringify(manifest));
