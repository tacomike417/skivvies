// Skivvies post generator: node gen.js spec.json outdir
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const [,,specPath,outDir]=process.argv;const posts=JSON.parse(fs.readFileSync(specPath,'utf8'));
fs.mkdirSync(outDir,{recursive:true});
const BG={cream:{bg:'#fff6f0',ink:'#102520',accent:'#f35d40'},coral:{bg:'#f35d40',ink:'#fff6f0',accent:'#102520'},ink:{bg:'#102520',ink:'#fff6f0',accent:'#f35d40'}};
const FONT=`@font-face{font-family:P;src:url(/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf)}`;
function fsz(line,base){return line.length>70?base-44:line.length>44?base-32:line.length>30?base-16:base}
function iconHtml(p){const c=BG[p.bg];const icon=path.resolve(p.bg==='coral'?'brand/icons-c':'brand/icons-t',`icon-${p.icon}.png`);
return `<!doctype html><html><head><meta charset="utf-8"><style>${FONT}
body{margin:0}.t{width:1080px;height:1080px;background:${c.bg};color:${c.ink};position:relative;overflow:hidden;font-family:"Inter Display",Inter}
.ic{position:absolute;left:50%;top:70px;transform:translateX(-50%);width:520px;height:520px;object-fit:contain}
.wrap{position:absolute;left:70px;right:70px;top:600px;height:360px;display:flex;align-items:center;justify-content:center;text-align:center}
.line{font-weight:900;font-size:${fsz(p.line,128)}px;line-height:1.02;letter-spacing:-.03em}
.foot{position:absolute;left:0;right:0;bottom:36px;text-align:center;font-family:P;font-size:30px;color:${c.accent}}
.foot b{font-family:"Inter Display",Inter;font-weight:900;font-size:40px;letter-spacing:-.04em;color:${c.ink};margin-right:14px;vertical-align:-3px}
</style></head><body><div class="t" id="t"><img class="ic" src="file://${icon}"><div class="wrap"><div class="line">${p.line}</div></div>
<div class="foot"><b>skivvies</b>skivvies.org</div></div></body></html>`}
function imageHtml(p){const c=BG[p.bg];const img=path.resolve(p.image);
// full-bleed image on top 60%, solid band below with the line + footer
return `<!doctype html><html><head><meta charset="utf-8"><style>${FONT}
body{margin:0}.t{width:1080px;height:1080px;background:${c.bg};color:${c.ink};position:relative;overflow:hidden;font-family:"Inter Display",Inter}
.im{position:absolute;left:0;top:0;width:1080px;height:660px;object-fit:cover}
.band{position:absolute;left:0;right:0;top:660px;bottom:0;background:${c.bg}}
.wrap{position:absolute;left:60px;right:60px;top:690px;height:290px;display:flex;align-items:center;justify-content:center;text-align:center}
.line{font-weight:900;font-size:${fsz(p.line,84)}px;line-height:1.04;letter-spacing:-.03em}
.foot{position:absolute;left:0;right:0;bottom:28px;text-align:center;font-family:P;font-size:28px;color:${c.accent}}
.foot b{font-family:"Inter Display",Inter;font-weight:900;font-size:36px;letter-spacing:-.04em;color:${c.ink};margin-right:12px;vertical-align:-3px}
</style></head><body><div class="t" id="t"><img class="im" src="file://${img}"><div class="band"></div><div class="wrap"><div class="line">${p.line}</div></div>
<div class="foot"><b>skivvies</b>skivvies.org</div></div></body></html>`}
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1100,height:1100}});
let n=0;for(const p of posts){if(process.env.ONLY&&!process.env.ONLY.split(',').includes(String(p.n)))continue;
const h=p.image?imageHtml(p):iconHtml(p);fs.writeFileSync('_tmp.html',h);await pg.goto('file://'+path.resolve('_tmp.html'));await pg.waitForTimeout(200);
const el=await pg.$('#t');await el.screenshot({path:path.join(outDir,`${String(p.n).padStart(2,'0')}.png`)});n++;}
await b.close();console.log('rendered',n);})();
