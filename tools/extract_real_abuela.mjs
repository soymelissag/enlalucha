/*
 * Extract a clean, transparent abuela cut-out from one of the painted scene
 * SVGs in public/ (Artboard 3 = svg/frame-1, Artboard 4 = svg/frame-2).
 *
 * The paintings have no semantic layers, so extraction = keep a set of the
 * root group's children (found by rendering each in isolation) and crop tight.
 * How the shipped cut-outs were produced:
 *   node tools/extract_real_abuela.mjs frame-1 "84"       assets/abuela/real/depie.svg
 *   node tools/extract_real_abuela.mjs frame-2 "75,70"    assets/abuela/real/andadera.svg "75:1150"
 * The last arg optionally drops descendant paths below a Y within one kept
 * group (used to remove a stray floating shoe from frame-2).
 *
 * Requires: npm i playwright-core, with Chromium available. Not needed at
 * runtime — the resulting SVGs are committed under assets/abuela/real/.
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'fs';
const exe='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
// args: file keepCsv out  [dropBelowY on group index G => "G:Y"]
const [file, keepCsv, out, dropSpec] = process.argv.slice(2);
const keep = keepCsv.split(',').map(Number);
const b=await chromium.launch({executablePath:exe,args:['--no-sandbox']});
const page=await b.newPage({viewport:{width:800,height:1100}});
const svg = readFileSync('/home/user/enlalucha/svg/'+file+'.svg','utf8');
await page.setContent('<body style="margin:0">'+svg+'</body>');
await page.waitForTimeout(150);
const result = await page.evaluate(({keep,dropSpec})=>{
  const s=document.querySelector('svg'); let root=s;
  const k=[...s.children].filter(c=>c.tagName==='g'||c.tagName==='path');
  if(k.length===1&&k[0].tagName==='g')root=k[0];
  const kids=[...root.children];
  const set=new Set(keep);
  kids.forEach((c,j)=>{ if(!set.has(j)) c.remove(); });
  // optional: within a specific kid index, drop descendant paths below a y
  if(dropSpec){
    for(const spec of dropSpec.split(';')){
      const [gi,yy]=spec.split(':').map(Number);
      const el=kids[gi];
      if(el){ el.querySelectorAll('path').forEach(pp=>{const bb=pp.getBBox(); if(bb.y>yy) pp.remove();}); }
    }
  }
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  [...root.children].forEach(c=>{ const bb=c.getBBox(); if(bb.width===0&&bb.height===0)return; x0=Math.min(x0,bb.x);y0=Math.min(y0,bb.y);x1=Math.max(x1,bb.x+bb.width);y1=Math.max(y1,bb.y+bb.height); });
  const pad=6; x0-=pad;y0-=pad;x1+=pad;y1+=pad; const w=x1-x0,h=y1-y0;
  s.setAttribute('viewBox',`${x0} ${y0} ${w} ${h}`);
  s.setAttribute('width',Math.round(w)); s.setAttribute('height',Math.round(h));
  s.removeAttribute('style');
  return {w:Math.round(w),h:Math.round(h),outer:s.outerHTML};
}, {keep,dropSpec});
writeFileSync(out,'<?xml version="1.0" encoding="UTF-8"?>\n'+result.outer);
console.log('wrote',out,result.w+'x'+result.h);
await b.close();
