/* SKIVVIES SHARE CARD (6 Nov 2026, Mike). Draws the "I covered somebody's butt" meme card in the browser,
 * in the site's own look (cream, ink, coral, gold; Anton + Inter), so there is no art to generate and the
 * card can carry the live count. Used on skivvies.org (after giving, and /share-it from the email) AND
 * loaded cross-site by recoverymisfits.org/skivvies.html to hand the picture to the Porch.
 *
 *   SkivviesCard.LINES        the captions, by kind: gave | out
 *   SkivviesCard.make({ kind, line, count })  -> Promise<Blob>   a 1080x1350 PNG (4:5, Instagram/Facebook size)
 *   SkivviesCard.url(opts)    -> share URL back to skivvies.org
 *
 * Nothing on the card names the donor or the amount (Mike's rule). Images are loaded with crossOrigin so a
 * canvas on another site can still export them (GitHub Pages sends Access-Control-Allow-Origin: *).
 */
(function () {
  "use strict";
  var SITE = window.SKIVVIES_SITE || "https://skivvies.org";
  /* One caption per piece of art. The art (img/cards/gave-N.webp, out-N.webp, drawn by ChatGPT 6 Nov 2026,
   * Mike's rule: underwear characters only, never a person in a rough state) fills the card; the caption is
   * the text that goes with the post. If the art fails to load the old drawn card is used instead. */
  var LINES = {
    gave: [
      "I just covered somebody's butt.\nYour turn.",
      "Best $20 I spent all week:\nunderwear for a stranger's day one.",
      "Rock bottom shouldn't be\nbare bottom. I helped.",
      "Fresh drawers for a stranger's\nday one. Done.",
      "Your turn. Cover a butt."
    ],
    out: [
      "My pair went out today.\nSomebody walked into day one covered.",
      "Update: my butt-covering\nhas been deployed.",
      "Somebody started day one covered.\nThat was my pair."
    ]
  };
  var EMOJI = { gave: "🍑", out: "🩲" };

  function fonts() {
    if (!document.querySelector('link[href*="family=Anton"]')) {
      var l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@700;900&family=Anton&display=swap";
      document.head.appendChild(l);
    }
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([document.fonts.load("400 80px Anton"), document.fonts.load("900 60px Inter"), document.fonts.load("700 30px Inter")])
      .then(function () { return document.fonts.ready; }).catch(function () {});
  }
  function img(src) {
    return new Promise(function (ok) {
      var i = new Image(); i.crossOrigin = "anonymous";
      i.onload = function () { ok(i); }; i.onerror = function () { ok(null); };
      i.src = src;
    });
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function wrap(c, text, max) {
    var out = [];
    text.split("\n").forEach(function (para) {
      var line = "";
      para.split(" ").forEach(function (w) {
        var t = line ? line + " " + w : w;
        if (c.measureText(t).width > max && line) { out.push(line); line = w; } else line = t;
      });
      out.push(line);
    });
    return out;
  }

  async function make(o) {
    o = o || {};
    var kind = o.kind === "out" ? "out" : "gave";
    var lines = LINES[kind], li = Math.max(0, Math.min(lines.length - 1, o.line | 0));
    var text = lines[li], count = Number(o.count) || 0;
    await fonts();
    var W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var c = cv.getContext("2d");
    c.fillStyle = "#fff6f0"; c.fillRect(0, 0, W, H);
    var art = await img(SITE + "/img/cards/" + kind + "-" + (li + 1) + ".webp?v=1");
    if (art) {
      /* cover the canvas with the art, cropping evenly; its bottom 20% is plain cream for the count + site line */
      c.drawImage(art, 0, 0, W, H);
      var yy = H - 150;
      if (count >= 2) {
        c.font = "400 44px Anton, Impact, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        var ct2 = count.toLocaleString() + " BUTTS COVERED SO FAR", cw2 = c.measureText(ct2).width + 70;
        c.fillStyle = "#f8bc54"; rr(c, (W - cw2) / 2, yy - 36, cw2, 72, 36); c.fill();
        c.fillStyle = "#102520"; c.fillText(ct2, W / 2, yy + 1);
        yy += 90;
      } else yy += 30;
      c.font = "900 54px Inter, Arial, sans-serif"; c.fillStyle = "#102520"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("skivvies.org", W / 2, yy);
      return new Promise(function (ok) { cv.toBlob(function (b) { ok(b); }, "image/png"); });
    }
    var pics = await Promise.all([img(SITE + "/img/thong.png"), img(SITE + "/img/boxers.png")]);
    /* the two icons */
    var s = 300, gap = 40, x0 = (W - (s * 2 + gap)) / 2, y0 = 100;
    if (pics[0]) c.drawImage(pics[0], x0, y0, s, s);
    if (pics[1]) c.drawImage(pics[1], x0 + s + gap, y0, s, s);
    /* the sticker */
    /* pick the biggest size that fits in 3 rows, so the card never runs into the wordmark */
    var size = 84, rows;
    do { c.font = "400 " + size + "px Anton, Impact, sans-serif"; rows = wrap(c, text.toUpperCase(), 860); size -= 6; } while (rows.length > 3 && size >= 54);
    var lh = Math.round((size + 6) * 1.16), boxH = rows.length * lh + 90, boxW = 940, bx = (W - boxW) / 2, by = 450;
    c.save(); c.translate(W / 2, by + boxH / 2); c.rotate(-2 * Math.PI / 180); c.translate(-W / 2, -(by + boxH / 2));
    c.fillStyle = "#f35d40"; rr(c, bx + 10, by + 12, boxW, boxH, 30); c.fill();
    c.fillStyle = "#102520"; rr(c, bx, by, boxW, boxH, 30); c.fill();
    c.fillStyle = "#fff3df"; c.textAlign = "center"; c.textBaseline = "middle";
    rows.forEach(function (r, i) { c.fillText(r, W / 2, by + 45 + lh / 2 + i * lh); });
    c.restore();
    var bottom = H - 265, y = by + boxH + 36, room = bottom - y - (count >= 2 ? 72 : 0);
    /* the emoji, big, centered in whatever room is left above the count */
    var es = Math.max(90, Math.min(150, room - 40));
    c.font = es + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(EMOJI[kind], W / 2, y + room / 2);
    y = bottom - 72;
    /* the count, when there is one worth showing (Mike: never a zero on the site) */
    if (count >= 2) {
      c.font = "400 44px Anton, Impact, sans-serif"; var ct = count.toLocaleString() + " BUTTS COVERED SO FAR";
      var cw = c.measureText(ct).width + 70;
      c.fillStyle = "#f8bc54"; rr(c, (W - cw) / 2, y, cw, 72, 36); c.fill();
      c.fillStyle = "#102520"; c.fillText(ct, W / 2, y + 37);
    }
    /* wordmark + line */
    c.font = "900 96px Inter, Arial, sans-serif"; c.fillStyle = "#102520"; c.textBaseline = "alphabetic";
    c.fillText("skivvies", W / 2, H - 150);
    c.fillStyle = "#f35d40"; rr(c, W / 2 - 150, H - 132, 300, 10, 5); c.fill();
    c.font = "700 30px Inter, Arial, sans-serif"; c.fillStyle = "#52635c";
    c.fillText("skivvies.org  ·  Because rock bottom shouldn't be bare bottom.", W / 2, H - 70);
    return new Promise(function (ok) { cv.toBlob(function (b) { ok(b); }, "image/png"); });
  }
  function url(o) { return SITE + "/cover-someones-butt"; }

  window.SkivviesCard = { LINES: LINES, make: make, url: url };
})();
