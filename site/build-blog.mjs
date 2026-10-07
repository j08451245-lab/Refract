// Generates the blog listing + build-in-public posts for the v3 static export.
// Reads v3/blog.html as the shell (header/footer/hero), strips Next.js hydration
// scripts (so React can't wipe our edits), and writes:
//   v3/blog.html           -> listing with post cards (search + filter still work)
//   v3/blog/<slug>.html    -> one static page per post
// Run: node site/build-blog.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHELL = join(__dirname, 'v3', 'blog.html');
const OUT = join(__dirname, 'v3');
const BACKUP = join(__dirname, '..', 'artifacts', 'site-v3-brand', 'blog.html.pre-blog');

// ---------- posts (build in public) ----------
const P1 = `
<p>If you're reading this, the blog works. That felt like the right first post.</p>
<p><strong>Refract</strong> is a native Windows companion that puts AI where you actually work: it sees what's on your screen when you allow it to, answers instantly, takes dictation with on-device speech recognition, and follows you into the browser with a companion extension. We're building the tool we want to use every day — and we decided to build it in public.</p>
<h2>Why in public?</h2>
<p>Because software built in the open gets better faster. Sharing what we ship — and what breaks along the way — keeps us honest, and it means every decision we make gets scrutinized by the people who actually use the thing. No marketing fog, no "coming soon" pages that never come. When something ships, you'll read about it here, including what went wrong.</p>
<h2>What to expect</h2>
<ul>
  <li><strong>Engineering deep dives</strong> — how the pieces actually work: the desktop app, the browser extension, on-device speech-to-text, and the glue between them.</li>
  <li><strong>Product decisions in real time</strong> — why we cut features, why we kept the ugly-but-honest ones, and what we're betting on next.</li>
  <li><strong>Honest post-mortems</strong> — renames that almost broke things, animations we had to patch byte-by-byte, and everything else that never makes the landing page.</li>
</ul>
<h2>Where we are</h2>
<p>The Windows app is live and improving weekly. The browser extension is shipped and tested. Mobile is on the roadmap. Under the hood we're investing in the boring stuff that makes speed possible: local-first data, on-device models where they beat the cloud, and a test suite that lets us move fast without leaving craters.</p>
<div class="bpp-callout">This blog is part of the product. If a post helped you, or you disagree with a call we made, tell us — the feedback loop is the point.</div>
<p>Next up: a story about renaming an entire product without breaking it, and how we performed surgery on a compiled animation file we couldn't rebuild. Come back — we'll be here.</p>
`;

const POSTS = [
  {
    slug: 'building-refract-in-public',
    title: 'Hello, world: we are building Refract in public',
    date: 'Aug 30, 2026',
    iso: '2026-08-30',
    tag: 'Product',
    excerpt: 'What Refract is, why we are building it in the open, and what you can expect from this blog: real decisions, real mistakes, real progress.',
    gradient: 'linear-gradient(135deg,#2E3038 0%,#1C1D22 100%)',
    html: P1,
  },
];

const P2 = `
<p>A while ago this product had a different name. Changing it taught us more about our own codebase than any feature ever did — so here's the post-mortem.</p>
<p>A rename looks like a find-and-replace. It isn't. A product name accretes into <em>identifiers</em>: message channels, environment variables, storage keys, regexes, folder names, test assertions. Some of those are safe to rename. Others are contracts — with CI, with telemetry backends, with the data already sitting in users' browsers. Rename the wrong one and nothing crashes; things just <em>quietly stop working</em>.</p>
<h2>The sneaky one: message contracts</h2>
<p>Our browser extension has a service worker that talks to content scripts over message channels keyed by string prefixes. At some point one side had been updated to the new name and the other hadn't — with the result that a feature was <strong>silently dead in runtime</strong>: messages sent on a channel nobody listened to. No test failed, because each side was "correct" in isolation.</p>
<p>The fix was a pair of parity tests that assert both sides of the contract declare the same channels. Names as APIs means: if it's a name, it gets a test.</p>
<h2>What we deliberately did NOT rename</h2>
<ul>
  <li><strong>Telemetry identifiers</strong> — dashboards and CI pipelines reference them by name; renaming breaks history.</li>
  <li><strong>Legacy storage keys</strong> — they're the <em>old</em> keys users already have; the migration code reads them by name. Rename them and you throw away people's settings.</li>
  <li><strong>Security regexes</strong> — redaction patterns still need to catch tokens issued with the old prefix.</li>
</ul>
<h2>The safety net</h2>
<p>Before touching anything: a snapshot commit of the entire tree, so "undo" was always one command away. Then the work went through the full gate — typecheck, the extension's test suite, and the parity tests. Everything green before the rename commit; everything green after.</p>
<div class="bpp-callout">Lesson: write down which names are contracts and which are plumbing. The plumbing can churn freely; the contracts need a migration plan and a test that fails when the two sides disagree.</div>
<p>Net result: 68 files changed, zero broken features, and a much better map of where the name <code>refract</code> lives — and where it deliberately doesn't.</p>
`;

const P3 = `
<p>This is a story about a compiled animation file, a brand that no longer existed inside it, and no source project to fix either.</p>
<p>The landing page has a Rive animation (a <code>.riv</code> file) used as the backdrop of one of its nicest sections. Trouble was: baked into that binary were assets with the <em>old</em> branding. And we don't have the original design source for that file — the export we received is all there is. Redrawing the whole scene was off the table.</p>
<h2>Step 1: look inside</h2>
<p><code>.riv</code> files are RIFF containers, the same family of container formats as WebP and WAV. That means embedded images sit at recognizable offsets with a length header. So we wrote a small scanner that walks the file and carves out every <code>RIFF....WEBP</code> blob it finds:</p>
<pre><code>offset 146    ->  9276 bytes  asset_00.webp
offset 9458   ->  4352 bytes  asset_01.webp   (a pill: icon + name)
offset 20079  -> 12748 bytes  asset_03.webp   (same pill, darker state)
offset 32868  -> 13118 bytes  asset_04.webp   (a smaller pill)
...</code></pre>
<p>Eight assets total. Three of them were the problem.</p>
<h2>Step 2: the byte-for-byte constraint</h2>
<p>Here's the catch: you can't just splice a different-sized image into a RIFF container — every chunk is size-addressed, so changing lengths shifts every offset after it. The fix had to be <strong>exactly the same size in bytes</strong> as the original.</p>
<p>We rendered the replacement art (new icon, new name) at the exact pixel dimensions of each asset, encoded to WebP at whatever quality landed just <em>under</em> the original byte count, then padded the difference with a custom RIFF chunk — a few bytes of harmless metadata that parsers skip. Same total size, same offsets, nothing downstream breaks.</p>
<h2>Step 3: verify like a paranoid person</h2>
<p>Bytes equal doesn't mean it renders. So: re-extract the patched file and diff the assets against what we intended (round-trip check), then load the real page in a headless browser and screenshot the section — once per patch iteration. That's how we caught that the animation actually renders <em>two stacked layers</em>, and the old branding was still showing through under the new art. The final move: make the replacement assets fully transparent, so the element simply isn't drawn anymore, and hide the leftover placeholder in the DOM with a CSS rule.</p>
<div class="bpp-callout">Lessons: (1) prefer assets you can regenerate — a binary you can't rebuild is a liability; (2) keep the originals somewhere safe, they're your reference; (3) never trust a patch you haven't seen render.</div>
<p>The section loads the same animation, at the same size, with the same performance — minus the ghost of a brand that no longer exists. Sometimes shipping is a paintbrush. Sometimes it's a hex editor.</p>
`;

const P4 = `
<p>Somebody asked for a chess coach inside the meeting overlay. It sounded like a joke. It took a weekend.</p>
<p>The idea is simple: point the overlay at a chessboard — chess.com, lichess, anything on screen — and it tells you the best move, drawn as an arrow on a rendered board. Underneath it's a hybrid pipeline: a vision model reads the position into FEN, a local Stockfish engine (WebAssembly, running on your machine, fully offline) computes the best move, and the LLM explains the <em>idea</em> behind it in one or two human sentences.</p>
<h2>Why hybrid?</h2>
<p>LLMs are fluent and frequently wrong at chess — they hallucinate illegal moves with total confidence. Engines are exactly right and explain nothing. Splitting the job (vision → FEN, engine → move, LLM → explanation) gives us the best of both, and every stage validates the previous one: an illegal FEN never reaches the engine, an illegal move never reaches the screen.</p>
<h2>The overlay problem</h2>
<p>The fun constraint was the overlay itself: it has to render a full 2D board with highlights and an SVG arrow, update it without flickering mid-stream (stale-while-revalidate), and never, ever crash the overlay tree on a bad position. Every untrusted boundary got a fallback. Boring work, invisible when it works — which is the point.</p>
<div class="bpp-callout">Lesson: when the model is confidently wrong in a domain, don't prompt harder — route around it with a tool that can't be wrong.</div>
`;

const P5 = `
<p>Refract already talked to a dozen cloud AI providers. The gap was the one running on your own machine, in your own terminal: <strong>opencode</strong>. So we made the local opencode server a first-class provider — same models, same auth you already configured, zero new API keys.</p>
<h2>How it works</h2>
<p>On enable, the app spawns <code>opencode serve</code> as a managed sidecar on a fixed local port, with a random per-boot password held only in memory. The provider talks to its session API: create session, send prompt, delete session. Nothing persists on the opencode side, and the sidecar dies with the app — but only if we started it.</p>
<h2>Streaming, then honesty</h2>
<p>The first version waited for the full answer. Nobody likes staring at a spinner, so v2 streams tokens over the server's event feed with the same ephemeral-session hygiene. One thing we kept honest: when the vision-capable models on the account have no quota, the provider says so instead of hallucinating — a provider that admits what it can't do beats one that pretends.</p>
<div class="bpp-callout">Lesson: the best integration respects the other tool's boundaries — ephemeral sessions, no credential copying, kill only what you started.</div>
`;

const P6 = `
<p>Days before preparing a release, we ran a adversarial review pass over the app's trust boundaries — and it paid off immediately. Three findings, three fixes, one near-miss worth telling.</p>
<h2>The RCE hiding in a settings field</h2>
<p>A settings field let users configure the command used to auto-start a local memory server. That string flowed straight into <code>spawn(command, { shell: true })</code> — with every provider API key in the child environment. Any renderer compromise turned into arbitrary shell with credentials. The fix came in layers: strict command validation (existing binary only, no shell metacharacters, expanded interpreter gate after review caught <code>cmd</code> and <code>powershell</code> bypassing it), argv-form spawn with no shell, and a native reconfirmation dialog whenever the saved command changes.</p>
<h2>The near-miss</h2>
<p>During the same pass, a test-alignment task deleted an input-sanitization call to satisfy an exact-string test assertion. Review caught it before merge: the right move was overwriting the parameter in place, keeping both the test string and the defense. Defense-in-depth dies exactly this way — one "harmless" cleanup at a time.</p>
<div class="bpp-callout">Lesson: review security fixes adversarially, not just for spec compliance. Ask what each change <em>removes</em>, not only what it adds.</div>
`;

POSTS.push(
  {
    slug: 'renaming-a-product-without-breaking-it',
    title: 'Renaming a product without breaking it',
    date: 'Sep 2, 2026',
    iso: '2026-09-02',
    tag: 'Blog',
    excerpt: 'A product name is not just a label — it accretes into message contracts, storage keys and test assertions. The post-mortem of a rename that could have gone very wrong.',
    gradient: 'linear-gradient(135deg,#3B5BDB 0%,#7048E8 100%)',
    html: P2,
  },
  {
    slug: 'binary-surgery-on-a-compiled-animation',
    title: 'Binary surgery on a compiled animation',
    date: 'Sep 6, 2026',
    iso: '2026-09-06',
    tag: 'Blog',
    excerpt: 'No source file, no way to rebuild — so we carved the embedded images out of a .riv binary, patched them byte-for-byte, and verified every frame.',
    gradient: 'linear-gradient(135deg,#0CA678 0%,#1971C2 100%)',
    html: P3,
  },
  {
    slug: 'chess-coach-in-the-overlay',
    title: 'Chess coach in the overlay: vision, engine, explanation',
    date: 'Sep 27, 2026',
    iso: '2026-09-27',
    tag: 'Product',
    excerpt: 'Point the overlay at any chessboard and get the best move drawn as an arrow — vision model reads the position, local Stockfish computes, the LLM explains the idea. Why hybrid beats prompting harder.',
    gradient: 'linear-gradient(135deg,#F59F00 0%,#E8590C 100%)',
    html: P4,
  },
  {
    slug: 'terminal-models-as-a-provider',
    title: 'Your terminal models are now a provider',
    date: 'Sep 28, 2026',
    iso: '2026-09-28',
    tag: 'Product',
    excerpt: 'The local opencode server is now a first-class Refract provider: same models and auth from your terminal, zero new API keys, managed sidecar, token streaming included.',
    gradient: 'linear-gradient(135deg,#0C8599 0%,#3B5BDB 100%)',
    html: P5,
  },
  {
    slug: 'closing-an-rce-before-release',
    title: 'Closing an RCE days before release',
    date: 'Sep 29, 2026',
    iso: '2026-09-29',
    tag: 'Blog',
    excerpt: 'A settings field flowed into spawn(shell:true) with every API key in the environment. Three layers of fix, one interpreter bypass caught in review, and one near-miss that almost deleted a defense.',
    gradient: 'linear-gradient(135deg,#E64980 0%,#7048E8 100%)',
    html: P6,
  }
);
// ---------- styling ----------
const CARD_CSS = `
.bpp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:28px}
.bpp-card{display:flex;flex-direction:column;background:#fff;border:1px solid #E7EAF2;border-radius:28px;overflow:hidden;text-decoration:none;box-shadow:0 1px 2px rgba(16,24,40,.05),0 0 0 rgba(21,112,239,0);transition:transform .28s cubic-bezier(.22,.68,.36,1.05),box-shadow .28s ease,border-color .28s ease}
.bpp-card:hover{transform:translateY(-6px);border-color:#C9DCFA;box-shadow:0 20px 48px -12px rgba(21,112,239,.28),0 4px 12px rgba(16,24,40,.08)}
.bpp-cover{position:relative;height:190px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.bpp-cover::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 0%,rgba(255,255,255,.22),transparent 55%),radial-gradient(80% 60% at 85% 100%,rgba(255,255,255,.10),transparent 60%);pointer-events:none}
.bpp-cover img{height:64px;opacity:.96;filter:drop-shadow(0 8px 20px rgba(0,0,0,.35));transition:transform .28s cubic-bezier(.22,.68,.36,1.05)}
.bpp-card:hover .bpp-cover img{transform:scale(1.08) rotate(-2deg)}
.bpp-tagpill{position:absolute;top:14px;left:14px;z-index:2;background:rgba(255,255,255,.82);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#1C1D22;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:5px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.65);box-shadow:0 2px 8px rgba(16,24,40,.12)}
.bpp-body{display:flex;flex-direction:column;gap:8px;padding:20px 22px 22px;flex:1}
.bpp-author{display:flex;align-items:center;gap:8px;font-size:12px;color:#667085}
.bpp-avatar{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:linear-gradient(135deg,#3B5BDB,#7048E8);color:#fff;font-size:10px;font-weight:700;letter-spacing:.03em;flex:none}
.bpp-who{font-weight:600;color:#344054}
.bpp-dot{color:#D0D5DD}
.bpp-date{font-size:12px;color:#667085}
.bpp-read{font-size:12px;color:#667085}
.bpp-title{font-size:19px;font-weight:650;color:#101828;letter-spacing:-.02em;line-height:1.3}
.bpp-card:hover .bpp-title{color:#0B4FBE}
.bpp-excerpt{font-size:14px;color:#475467;line-height:1.6;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.bpp-more{margin-top:auto;padding-top:14px;font-size:13px;font-weight:700;color:#1570EF;display:inline-flex;align-items:center;gap:6px}
.bpp-more::after{content:"→";transition:transform .2s ease}
.bpp-card:hover .bpp-more::after{transform:translateX(4px)}
`;

const ARTICLE_CSS = `
.bpp{max-width:720px;margin:0 auto;padding-top:16px}
.bpp-meta{display:flex;gap:10px;align-items:center;font-size:13px;color:#667085}
.bpp-tagpill{background:#101828;color:#fff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px}
.bpp h1{font-size:40px;line-height:1.15;font-weight:600;letter-spacing:-.02em;color:#101828;margin:12px 0 8px}
.bpp-lede{font-size:19px;color:#475467;line-height:1.55;margin-bottom:28px}
.bpp h2{font-size:26px;font-weight:600;letter-spacing:-.015em;color:#101828;margin:36px 0 12px}
.bpp h3{font-size:19px;font-weight:600;color:#101828;margin:28px 0 8px}
.bpp p{font-size:16px;line-height:1.7;color:#344054;margin:14px 0}
.bpp ul,.bpp ol{margin:14px 0 14px 22px;color:#344054;font-size:16px;line-height:1.7}
.bpp li{margin:6px 0}
.bpp code{background:#F2F4F7;border:1px solid #E4E7EC;border-radius:6px;padding:1px 6px;font-size:14px;color:#101828}
.bpp pre{background:#101828;color:#E4E7EC;border-radius:12px;padding:16px 18px;overflow:auto;font-size:13.5px;line-height:1.6;margin:18px 0}
.bpp pre code{background:none;border:none;color:inherit;padding:0}
.bpp blockquote{border-left:3px solid #1570EF;margin:18px 0;padding:4px 0 4px 18px;color:#475467;font-style:italic}
.bpp hr{border:none;border-top:1px solid #E7EAF2;margin:28px 0}
.bpp-callout{background:#F8F9FC;border:1px solid #E7EAF2;border-radius:16px;padding:16px 18px;margin:18px 0;font-size:15px;color:#344054}
.bpp-back{margin-top:44px;padding-top:20px;border-top:1px solid #E7EAF2}
.bpp-back a{color:#1570EF;font-weight:600;text-decoration:none;font-size:14px}
`;

const FILTER_JS = `(function(){
var grid=document.getElementById('bpp-grid');if(!grid)return;
var cards=[].slice.call(grid.querySelectorAll('.bpp-card'));
var row=document.querySelector('.z-10.flex.flex-wrap');
var btns=row?[].slice.call(row.querySelectorAll('button')):[];
var input=document.querySelector('input[placeholder="Search for posts"]');
var active='All';
function labelOf(b){var t='';b.querySelectorAll('span').forEach(function(s){t+=s.textContent;});
if(/product/i.test(t))return 'Product';if(/blog/i.test(t))return 'Blog';return 'All';}
function apply(){var q=input?input.value.trim().toLowerCase():'';
cards.forEach(function(c){var ok=(active==='All'||(c.getAttribute('data-tags')||'').indexOf(active)>-1)
&&(!q||(c.getAttribute('data-search')||'').indexOf(q)>-1);c.style.display=ok?'':'none';});}
btns.forEach(function(b){b.addEventListener('click',function(){active=labelOf(b);
btns.forEach(function(x){x.classList.toggle('bg-black',x===b);x.classList.toggle('text-white',x===b);
x.classList.toggle('bg-white',x!==b);x.classList.toggle('text-gray-500',x!==b);});apply();});});
if(input)input.addEventListener('input',apply);
apply();})();`;

// ---------- generation ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Remove Next.js hydration (inline flight data + chunk scripts + their preloads)
function stripScripts(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link rel="preload" href="\/_next\/[^"]*"[^>]*>/gi, '');
}

// Replace html[start..end) keeping the document's div balance intact:
// region net (opens-closes) is reproduced by padding the inner HTML.
function replaceRegion(html, startIdx, endIdx, inner) {
  const region = html.slice(startIdx, endIdx);
  const net = (region.match(/<div\b/g) || []).length - (region.match(/<\/div>/g) || []).length;
  const padded = '<div>'.repeat(Math.max(0, net)) + inner + '</div>'.repeat(Math.max(0, -net));
  return html.slice(0, startIdx) + padded + html.slice(endIdx);
}

function readingTime(html) {
  const words = html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function authorInitials(name) {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function cardHtml(p) {
  const author = p.author || 'Refract Team';
  const mins = readingTime(p.html);
  const search = esc((p.title + ' ' + p.excerpt + ' ' + p.tag + ' ' + author).toLowerCase());
  return `<a class="bpp-card" href="/blog/${p.slug}" data-tags="${p.tag}" data-search="${search}">` +
    `<div class="bpp-cover" style="background:${p.gradient}"><span class="bpp-tagpill">${p.tag}</span><img src="/logo_no_text.svg" alt=""/></div>` +
    `<div class="bpp-body"><div class="bpp-author"><span class="bpp-avatar">${authorInitials(author)}</span>` +
    `<span class="bpp-who">${esc(author)}</span><span class="bpp-dot">·</span><span class="bpp-date">${p.date}</span>` +
    `<span class="bpp-dot">·</span><span class="bpp-read">${mins} min read</span></div>` +
    `<span class="bpp-title">${esc(p.title)}</span>` +
    `<span class="bpp-excerpt">${esc(p.excerpt)}</span><span class="bpp-more">Read post &rarr;</span></div></a>`;
}

const shellRaw = readFileSync(existsSync(BACKUP) ? BACKUP : SHELL, 'utf8');
if (!existsSync(BACKUP)) copyFileSync(SHELL, BACKUP); // first-run backup (generator always re-reads it)
const shell = stripScripts(shellRaw);

// --- listing page: months scaffold -> cards grid; "No posts yet" -> removed
const pressIdx = shell.indexOf('>Press</button>');
if (pressIdx === -1) throw new Error('filter row anchor not found');
const monthsStart = pressIdx + '>Press</button></div></div>'.length;
const listingInner = `<style>${CARD_CSS}</style>` +
  `<div id="bpp-grid" class="bpp-grid">${POSTS.map(cardHtml).join('\n')}</div>` +
  `<script>${FILTER_JS}</script>`;
const ctaAnchor = shell.indexOf('py-16 text-center', monthsStart);
if (ctaAnchor === -1) throw new Error('CTA anchor not found');
const ctaStart = shell.lastIndexOf('<div', ctaAnchor);
let listing = replaceRegion(shell, monthsStart, ctaStart, listingInner);
const emptyAnchor = listing.indexOf('px-6 py-24 text-center');
if (emptyAnchor !== -1) {
  const emptyStart = listing.lastIndexOf('<div', emptyAnchor);
  const footerIdx = listing.indexOf('<footer', emptyStart);
  listing = replaceRegion(listing, emptyStart, footerIdx, '');
}
writeFileSync(join(OUT, 'blog.html'), listing);

// --- post pages: swap search+filters+empty-state for the article
const postDir = join(OUT, 'blog');
mkdirSync(postDir, { recursive: true });
const contentAnchor = shell.indexOf('mx-auto mb-16 w-full max-w-5xl');
if (contentAnchor === -1) throw new Error('content anchor not found');
const contentStart = shell.lastIndexOf('<div', contentAnchor);
const footerIdx2 = shell.indexOf('<footer', contentStart);

for (const p of POSTS) {
  const author = p.author || 'Refract Team';
  const mins = readingTime(p.html);
  const articleInner = `<style>${ARTICLE_CSS}</style>` +
    `<article class="bpp">` +
    `<div class="bpp-meta"><span class="bpp-tagpill">${p.tag}</span><time datetime="${p.iso}">${p.date}</time><span>·</span><span>By ${esc(author)}</span><span>·</span><span>${mins} min read</span></div>` +
    `<h1>${esc(p.title)}</h1>` +
    `<p class="bpp-lede">${esc(p.excerpt)}</p>` +
    p.html +
    `<div class="bpp-back"><a href="/blog">&larr; Back to all posts</a></div>` +
    `</article>`;
  let page = replaceRegion(shell, contentStart, footerIdx2, articleInner);
  page = page.replace('<title>Blog | Refract</title>', `<title>${esc(p.title)} | Refract Blog</title>`);
  page = page.split('Read our blog for the latest news and insights on Refract.').join(esc(p.excerpt));
  writeFileSync(join(postDir, `${p.slug}.html`), page);
  console.log(`post:    /blog/${p.slug}`);
}
console.log(`listing: /blog (${POSTS.length} posts)`);

