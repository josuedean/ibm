/* Run with a static server serving this folder's parent on localhost:8765.
   npm install --no-save playwright (if unavailable); npx playwright install chromium.
   Optional CHROME_PATH points at a local Chromium executable. */
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8765/strategy-lab/');
 await page.evaluate(async()=>{window.lab={...await import('./js/engine.js'),...await import('./js/strategies.js'),...await import('./js/exports.js')};});
 async function match(a,b,rounds=10,seed='classroom'){return page.evaluate(async({a,b,rounds,seed})=>{
  const strategy=x=>{const preset=lab.STRATEGIES.find(s=>s.id===x);return preset?{...preset,filename:preset.id+'.py'}:{id:'upload',name:'uploaded',source:x,filename:'test.py'};};
  return await new lab.MatchEngine().run({a:strategy(a),b:strategy(b),rounds,seed});
 },{a,b,rounds,seed});}
 for(const [a,b,expected] of [['always-share','always-share',[30,30]],['always-keep','always-share',[50,10]],['always-keep','always-keep',[20,20]],['always-share','always-keep',[10,50]]]){const r=await match(a,b);assert.equal(r.status,'complete',r.error);assert.deepEqual([r.rows.at(-1).total_a,r.rows.at(-1).total_b],expected);console.log('PASS payoff '+a+'/'+b);}
 const random1=await match('random','random',40),random2=await match('random','random',40);assert.deepEqual(random1.rows,random2.rows);assert.notEqual(random1.seed_a,random1.seed_b);console.log('PASS seeded repeatability');
 const state='n=0\ndef space_exploration_strategy(h,r,m):\n global n\n n+=1\n assert n==r\n return "S" if n==1 else "K"';
 const state1=await match(state,state),state2=await match(state,state);assert.equal(state1.status,'complete',state1.error);assert.deepEqual(state1.rows,state2.rows);assert.equal(state1.rows[0].outcome,'SS');console.log('PASS self-play isolation and reset');
 const perspective='def space_exploration_strategy(h,r,m):\n assert len(h)==r-1\n assert m==1.0\n for mine, theirs in h: assert mine=="S" and theirs=="K"\n h.clear()\n return "S"';
 const p=await match(perspective,'always-keep');assert.equal(p.status,'complete',p.error);console.log('PASS mirrored history, copies, round numbering, simultaneous prior-only decisions');
 const bad='def space_exploration_strategy(h,r,m):\n return "S" if r<4 else "invalid"';const fail=await match(bad,'always-share');assert.equal(fail.status,'incomplete');assert.equal(fail.rows.length,3);assert.match(fail.error,/round 4/);console.log('PASS invalid return preserves prefix');
 for(const source of ['x =','import os','x=1','def space_exploration_strategy(a): return "S"']){const r=await match(source,'always-share');assert.equal(r.status,'incomplete');assert.equal(r.rows.length,0);}
 console.log('PASS syntax, unsupported import, missing function, incompatible signature');
 const infinite='def space_exploration_strategy(h,r,m):\n while True: pass';const t=await match(infinite,'always-share');assert.equal(t.status,'incomplete');assert.match(t.error,/timeout/);assert.equal((await match('always-share','always-share')).status,'complete');console.log('PASS timeout and recovery');
 const cancelled=await page.evaluate(async()=>{const e=new lab.MatchEngine();const s={...lab.STRATEGIES[0],filename:'random.py'};return e.run({a:s,b:s,rounds:100,seed:'cancel'},(n)=>{if(n>=10)e.cancel();});});assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.rows.length,10);assert.equal((await match('always-share','always-share')).status,'complete');console.log('PASS cancellation and recovery');
 // UI upload + replay + full-record CSV while playback is paused.
 await page.selectOption('#select-a','upload');await page.setInputFiles('#file-a',{name:'example_strategy.py',mimeType:'text/x-python',buffer:Buffer.from(perspective)});await page.selectOption('#select-b','always-keep');await page.fill('#rounds','10');await page.selectOption('#speed','1500');await page.click('#run');await page.waitForFunction(()=>document.querySelector('#cancel').hidden,{},{timeout:180000});await page.click('#play');assert.equal(await page.locator('#result-state').textContent(),'WAITING FOR PLAYBACK');
 const download=page.waitForEvent('download');await page.click('#round-csv');const csv=await download;const file=await csv.path();const content=await fs.readFile(file,'utf8');assert.equal(content.trim().split('\r\n').length,11);assert.ok(content.includes('example_strategy.py'));await page.click('#skip');assert.equal(await page.locator('#total-a').textContent(),'10');assert.equal(await page.locator('#total-b').textContent(),'50');await page.click('#replay');await page.click('#play');await page.click('#next');await page.click('#skip');assert.equal(await page.locator('#total-a').textContent(),'10');console.log('PASS uploads, subdirectory paths, concealed playback, replay, full export');
 await page.screenshot({path:process.env.SCREENSHOT_DIR?process.env.SCREENSHOT_DIR+'/desktop.png':'/tmp/space-dilemma-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:process.env.SCREENSHOT_DIR?process.env.SCREENSHOT_DIR+'/mobile.png':'/tmp/space-dilemma-mobile.png',fullPage:true});console.log('PASS mobile layout without horizontal overflow');
 assert.deepEqual(errors,[]);await browser.close();console.log('ALL BROWSER CHECKS PASSED');
})().catch(e=>{console.error(e);process.exit(1);});
