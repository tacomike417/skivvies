#!/usr/bin/env python3
"""Makes a real page file for each address (about.html, share.html, ...) from index.html,
with that page's own title, description and Google/share-preview tags baked in.
Also writes 404.html, sitemap.xml and robots.txt.
Run it after any change to index.html:  python3 build.py
"""
import json, re, datetime, pathlib

ROOT = pathlib.Path(__file__).parent
SITE = "https://skivvies.org"
src = (ROOT / "index.html").read_text()

# pull the PATHS and META tables straight out of index.html so there is one source of truth
paths = json.loads(re.search(r"const PATHS=(\{.*?\});", src).group(1).replace("'", '"').replace("{", '{"', 1).replace(",", ',"').replace(":", '":'))
meta_js = re.search(r"const META=\{(.*?)\};\n", src, re.S).group(1)
meta = {}
for key, title, desc in re.findall(r'(\w+):\["(.*?)","(.*?)"\]', meta_js):
    meta[key] = (title, desc)

def esc(t):
    return t.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")

def page_html(key, extra_head=""):
    title, desc = meta[key]
    url = SITE + paths[key]
    h = src
    h = re.sub(r"<title>.*?</title>", f"<title>{esc(title)}</title>", h, count=1)
    h = re.sub(r'<meta name="description" content=".*?">', f'<meta name="description" content="{esc(desc)}">', h, count=1)
    h = re.sub(r'<link rel="canonical" href=".*?">', f'<link rel="canonical" href="{url}">', h, count=1)
    h = re.sub(r'<meta property="og:url" content=".*?">', f'<meta property="og:url" content="{url}">', h, count=1)
    h = re.sub(r'<meta property="og:title" content=".*?">', f'<meta property="og:title" content="{esc(title)}">', h, count=1)
    h = re.sub(r'<meta property="og:description" content=".*?">', f'<meta property="og:description" content="{esc(desc)}">', h, count=1)
    if extra_head:
        h = h.replace("</head>", extra_head + "\n</head>", 1)
    return h

written = []
for key, path in paths.items():
    if key == "home":
        continue
    out = ROOT / (path.strip("/") + ".html")
    out.write_text(page_html(key))
    written.append(out.name)

(ROOT / "404.html").write_text(page_html("home", '<meta name="robots" content="noindex">'))
written.append("404.html")

today = datetime.date.today().isoformat()
urls = "\n".join(f"  <url><loc>{SITE}{p}</loc><lastmod>{today}</lastmod></url>" for p in paths.values())
(ROOT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n')
(ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: {SITE}/sitemap.xml\n")
written += ["sitemap.xml", "robots.txt"]
print("built:", ", ".join(written))
