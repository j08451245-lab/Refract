// Multi-version static server for the exported Next.js sites under site/.
// Each version gets its own port. Implements the /_next/image optimizer
// endpoint that static exports lack, so optimized images actually load.
// Run:  node site/serve-all.mjs
import http from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT_BASE = Number(process.env.PORT_BASE || 5000);

// name -> exported site folder. Port = PORT_BASE + index in this list.
const SITES = [
  { name: 'v3', dir: 'v3' },                 // current, port 5000
  { name: 'v1', dir: 'v1' },                 // port 5001
  { name: 'v2', dir: 'v2' },                 // port 5002
  { name: 'v4', dir: 'v4' },                 // port 5003
  { name: 'v3-original', dir: 'v3-backup-original' }, // port 5004 (pre-fix, comparison)
];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.map': 'application/json',
};

function send(res, status, headers, streamOrBuffer) {
  res.writeHead(status, headers);
  if (Buffer.isBuffer(streamOrBuffer)) res.end(streamOrBuffer);
  else if (streamOrBuffer) streamOrBuffer.pipe(res);
  else res.end();
}

// NOTE (2026-09-30): enterprise hiding REMOVED — the section is being fixed,
// not hidden. Do not re-add without talking to Davi first.
// Adds a Blog link at the top of the footer "Resources" column on every page.
// Re-runs briefly on an interval so it survives React hydration re-renders.
const BLOG_LINK_JS =
  '<script id="add-blog-link">(function(){function add(){var hs=document.querySelectorAll("footer h3");' +
  'for(var i=0;i<hs.length;i++){if(/resources/i.test(hs[i].textContent||"")){var ul=hs[i].nextElementSibling;' +
  'if(!ul||ul.tagName!=="UL")continue;if(ul.querySelector(\'a[href="/blog"]\'))return true;' +
  'var li=document.createElement("li");li.innerHTML=\'<a class="rounded tracking-tight inline-flex items-center gap-x-1.5 leading-snug font-normal text-gray-20 transition-colors duration-200 hover:text-primary-blue" href="/blog">Blog</a>\';' +
  'ul.insertBefore(li,ul.firstChild);return true;}}return false;}' +
  'var n=0,t=setInterval(function(){n++;var ok=add();if((ok&&n>20)||n>60)clearInterval(t);},300);})();</script>';
// NOTE (2026-10-06): honest annual billing for /pricing. The exported v3 bundle
// ships a Monthly/Annually toggle with NO annual logic (clicking Annually never
// changed the price). This wires it: Annually shows Pro at $192/year
// ($16/mo equivalent, 20% off vs $20 monthly). Monthly restores $20/month.
// Only the Pro card changes; Starter (Free) and Enterprise (Custom) are static.
const PRICING_BILLING_JS =
  '<script id="pricing-billing">(function(){var FLAG="data-billing-applied";' +
  'function proCard(){var lis=document.querySelectorAll("li");' +
  'for(var i=0;i<lis.length;i++){var li=lis[i];var h=li.querySelector("h3");' +
  'if(h&&/^pro$/i.test((h.textContent||"").trim())&&/Unlimited access\\./.test(li.innerText||""))return li;}return null;}' +
  'function priceWrap(li){return li?li.querySelector("div.row-start-2.mt-5"):null;}' +
  'function isAnnual(){var sw=document.querySelector(\'button[role="switch"]\');' +
  'if(sw)return sw.getAttribute("aria-checked")==="true";' +
  'var btns=[...document.querySelectorAll("button")].filter(function(b){return/^(monthly|annually)$/i.test((b.textContent||"").trim());});' +
  'for(var i=0;i<btns.length;i++){if(/^annually$/i.test((btns[i].textContent||"").trim())&&/text-foreground/.test(btns[i].className))return true;}return false;}' +
  'function annualHtml(){return "<div class=\'flex gap-x-1 flex-row items-end\'><span style=\'font-size:40px;line-height:1;letter-spacing:-0.02em;font-weight:500;\'>$192</span><span class=\'text-base text-muted-foreground tracking-tight\'>/ year</span></div><p class=\'mt-1 text-xs text-muted-foreground\'>$16/mo, billed annually &mdash; save 20%</p>";}' +
  'function apply(){try{var li=proCard();if(!li)return false;var w=priceWrap(li);if(!w)return false;' +
  'if(isAnnual()){if(w.getAttribute(FLAG)==="annual")return true;' +
  'if(w.getAttribute(FLAG)!=="saved"){w.setAttribute("data-billing-orig",w.innerHTML);w.setAttribute(FLAG,"saved");}' +
  'w.innerHTML=annualHtml();w.setAttribute(FLAG,"annual");return true;}' +
  'if(w.getAttribute(FLAG)==="annual"||w.getAttribute(FLAG)==="saved"){var o=w.getAttribute("data-billing-orig");' +
  'if(o!=null){w.innerHTML=o;}w.removeAttribute(FLAG);}return true;}catch(e){return false;}}' +
  'document.addEventListener("click",function(e){var b=e.target&&e.target.closest?e.target.closest("button"):null;' +
  'if(!b)return;var t=(b.textContent||"").trim();' +
  'if(b.getAttribute("role")==="switch"||/^(monthly|annually)$/i.test(t)){setTimeout(apply,80);setTimeout(apply,400);}});' +
  'var obs=new MutationObserver(function(){setTimeout(apply,80);});' +
  'var n=0,t=setInterval(function(){n++;var sw=document.querySelector(\'button[role="switch"]\');' +
  'if(sw){try{obs.observe(sw,{attributes:true,attributeFilter:["aria-checked"]});}catch(e){}apply();}' +
  'if(n>40){clearInterval(t);setTimeout(apply,1000);}},300);})();</script>';
// NOTE (2026-10-06): honest CTA targets for /pricing. No checkout exists yet,
// so Subscribe (Pro) and Talk to sales (Enterprise) open an email to the founder
// with a pre-filled subject/body. Starter's "Get for Windows" is untouched.
const PRICING_CTA_JS =
  '<script id="pricing-cta">(function(){var EMAIL="j4633705@gmail.com";' +
  'function annual(){var sw=document.querySelector(\'button[role="switch"]\');' +
  'return sw&&sw.getAttribute("aria-checked")==="true";}' +
  'function go(kind){var subject=kind==="pro"?"Refract Pro subscription":"Refract Enterprise";' +
  'var body=kind==="pro"?(annual()?"Hi, I would like to subscribe to Refract Pro (Annual, $192/year).":"Hi, I would like to subscribe to Refract Pro (Monthly, $20/month)."):"Hi, I would like to talk about Refract Enterprise for my team.";' +
  'window.location.href="mailto:"+EMAIL+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);}' +
  'window.__pricingCtas={subscribe:"mailto:"+EMAIL+"?subject=Refract Pro subscription",enterprise:"mailto:"+EMAIL+"?subject=Refract Enterprise"};' +
  'document.addEventListener("click",function(e){var b=e.target&&e.target.closest?e.target.closest("button,a"):null;' +
  'if(!b)return;var t=((b.textContent||"").trim().toLowerCase());' +
  'if(t==="subscribe"){e.preventDefault();e.stopPropagation();go("pro");}' +
  'else if(t==="talk to sales"){e.preventDefault();e.stopPropagation();go("enterprise");}},true);})();</script>';
function injectHtml(buf, extraJs) {
  const s = buf.toString('utf8');
  let out = s;
  const scripts = [BLOG_LINK_JS];
  if (extraJs && !out.includes('id="pricing-billing"')) scripts.push(PRICING_BILLING_JS);
  if (extraJs && !out.includes('id="pricing-cta"')) scripts.push(PRICING_CTA_JS);
  const missing = scripts.filter((tag) => !out.includes(tag.slice(0, 24)));
  if (missing.length) {
    const j = out.toLowerCase().lastIndexOf('</body>');
    const add = missing.join('');
    out = j !== -1 ? out.slice(0, j) + add + out.slice(j) : out + add;
  }
  return Buffer.from(out, 'utf8');
}

function makeHandler(ROOT, FALLBACKS = []) {
  const safePath = (root, urlPath) => {
    let decoded;
    try { decoded = decodeURIComponent(urlPath); } catch { return null; }
    decoded = decoded.replace(/\/+$/, '');
    const abs = resolve(join(root, decoded));
    if (abs !== root && !abs.startsWith(root + sep)) return null; // traversal guard
    return abs;
  };

  // Resolve a URL path against this site's root first, then fallback roots
  // (v3 is complete; v1/v2/v4 are HTML-only snapshots). Tries exact path,
  // path + '.html' (clean URLs) and path + '/index.html'.
  const resolveAsset = (urlPath) => {
    for (const root of [ROOT, ...FALLBACKS]) {
      const abs = safePath(root, urlPath);
      if (!abs) continue;
      if (existsSync(abs) && statSync(abs).isFile()) return abs;
      if (!extname(abs)) {
        const withHtml = abs + '.html';
        if (existsSync(withHtml)) return withHtml;
        const withIndex = join(abs, 'index.html');
        if (existsSync(withIndex)) return withIndex;
      }
    }
    return null;
  };


  // GET /_next/image?url=%2Fpath.png&w=640&q=100
  async function handleNextImage(req, res, searchParams) {
    const src = searchParams.get('url');
    if (!src || !src.startsWith('/')) {
      return send(res, 400, { 'Content-Type': 'text/plain' }, null);
    }
    const width = Math.min(Math.max(parseInt(searchParams.get('w'), 10) || 640, 1), 3840);
    const quality = Math.min(Math.max(parseInt(searchParams.get('q'), 10) || 75, 1), 100);
    const abs = resolveAsset(src);
    if (!abs) {
      return send(res, 404, { 'Content-Type': 'text/plain' }, null);
    }
    const ext = extname(abs).toLowerCase();
    // Formats sharp shouldn't re-encode: serve as-is.
    if (!['.png', '.jpg', '.jpeg', '.webp', '.avif', '.tiff'].includes(ext)) {
      return send(res, 200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      }, createReadStream(abs));
    }
    const wantsWebp = /image\/webp/.test(req.headers.accept || '');
    const fmt = wantsWebp ? 'webp' : (ext === '.png' ? 'png' : 'jpeg');
    try {
      const sharp = (await import('sharp')).default;
      const body = await sharp(abs)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .toFormat(fmt, { quality })
        .toBuffer();
      send(res, 200, {
        'Content-Type': fmt === 'webp' ? 'image/webp' : (fmt === 'png' ? 'image/png' : 'image/jpeg'),
        'Content-Length': body.length,
        'Cache-Control': 'public, max-age=31536000, immutable',
      }, body);
    } catch (err) {
      console.error('[_next/image] failed for', src, err.message);
      send(res, 500, { 'Content-Type': 'text/plain' }, null);
    }
  }

  return function handler(req, res) {
    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (u.pathname === '/_next/image') {
      handleNextImage(req, res, u.searchParams).catch((err) => {
        console.error('[_next/image] handler error', err);
        try { send(res, 500, { 'Content-Type': 'text/plain' }, null); } catch {}
      });
      return;
    }

    let abs = resolveAsset(u.pathname);
    if (!abs) return send(res, 404, { 'Content-Type': 'text/plain' }, null);
    if (statSync(abs).isDirectory()) {
      abs = join(abs, 'index.html');
      if (!existsSync(abs)) return send(res, 404, { 'Content-Type': 'text/plain' }, null);
    }

    const ext = extname(abs).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    // _next/static content is content-hashed -> cache hard; else revalidate
    const cacheControl = u.pathname.startsWith('/_next/static/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate';
    const size = statSync(abs).size;

    // Range support (needed for <video> seeking)
    const range = req.headers.range;
    if (range && /^bytes=\d*-\d*$/.test(range)) {
      const [startStr, endStr] = range.replace('bytes=', '').split('-');
      const start = startStr ? parseInt(startStr, 10) : 0;
      const end = endStr ? parseInt(endStr, 10) : size - 1;
      if (start >= size || end >= size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': mime,
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': cacheControl,
      });
      return createReadStream(abs, { start, end }).pipe(res);
    }

    if (ext === '.html') {
      const isPricing = /(^|\/)pricing\.html$/.test(abs.replace(/\\/g, '/'));
      const body = injectHtml(readFileSync(abs), isPricing);
      return send(res, 200, {
        'Content-Type': mime,
        'Content-Length': body.length,
        'Cache-Control': cacheControl,
      }, body);
    }

    send(res, 200, {
      'Content-Type': mime,
      'Content-Length': size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cacheControl,
    }, createReadStream(abs));
  };
}

let up = 0;
const roots = SITES
  .map((s) => resolve(join(__dirname, s.dir)))
  .filter((r) => existsSync(join(r, 'index.html')));
// v3's root first among fallbacks (most complete export)
const FALLBACK_ORDER = ['v3', 'v4', 'v2', 'v1', 'v3-backup-original'];
SITES.forEach((site, i) => {
  const root = resolve(join(__dirname, site.dir));
  if (!existsSync(join(root, 'index.html'))) {
    console.warn(`[skip] ${site.name}: no index.html in ${root}`);
    return;
  }
  const fallbacks = FALLBACK_ORDER
    .map((d) => resolve(join(__dirname, d)))
    .filter((r) => r !== root && roots.includes(r));
  const port = PORT_BASE + i;
  http.createServer(makeHandler(root, fallbacks)).listen(port, () => {
    up++;
    console.log(`${site.name.padEnd(12)} http://localhost:${port}  (root: ${root})`);
  });
});



