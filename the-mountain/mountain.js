/* The Mountain — app logic.
   Privacy: all progress, journal entries and bookmarks are stored only in this
   browser's localStorage under KEY. Nothing is sent anywhere: there are no
   network calls in this file, and the page's Content-Security-Policy sets
   connect-src 'none'. Journal text is never written to the console. */
(function () {
  "use strict";

  var STUDY = window.MOUNTAIN_STUDY;
  var SCRIPTURE = window.MOUNTAIN_SCRIPTURE;
  var SECTIONS = STUDY.sections;
  var TOTAL = SECTIONS.length;
  var KEY = "theMountain.v1";
  var app = document.getElementById("app");
  var FONT_MIN = -2, FONT_MAX = 5;

  /* --------------------------------------------------------------- state */
  function defaults() {
    return {
      v: 1,
      completed: {},        // sectionId -> ISO date first completed
      history: [],          // [{id, at}] every completion (including reviews)
      journal: {},          // sectionId -> {text, updated}
      plan: {},             // action plan field id -> text
      planUpdated: null,
      bookmarks: [],        // [{ref, v, text, sectionId, added}]
      studyCompletions: [], // ISO dates the full study was finished
      lastSection: null,    // index (1-based) of last section opened
      scroll: {},           // index -> scrollY for resume
      fontStep: 0,
      theme: "auto",
    };
  }
  var storageOK = true;
  var state = load();

  function load() {
    var s = defaults();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        for (var k in parsed) if (Object.prototype.hasOwnProperty.call(s, k)) s[k] = parsed[k];
      }
      localStorage.setItem(KEY + ".probe", "1");
      localStorage.removeItem(KEY + ".probe");
    } catch (e) {
      storageOK = false;
    }
    return s;
  }
  function save() {
    if (!storageOK) return false;
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { toast("Could not save on this device. Storage may be full or disabled."); return false; }
  }

  /* ------------------------------------------------------------- helpers */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function idxOf(id) { for (var i = 0; i < TOTAL; i++) if (SECTIONS[i].id === id) return i + 1; return 0; }
  function completedCount() { var n = 0; SECTIONS.forEach(function (s) { if (state.completed[s.id]) n++; }); return n; }
  function firstIncomplete() { for (var i = 0; i < TOTAL; i++) if (!state.completed[SECTIONS[i].id]) return i + 1; return 0; }
  function continueTarget() {
    var last = state.lastSection;
    if (last && SECTIONS[last - 1] && !state.completed[SECTIONS[last - 1].id]) return last;
    return firstIncomplete();
  }
  function fmtDate(iso, withTime) {
    try {
      var d = new Date(iso);
      var o = { month: "short", day: "numeric", year: "numeric" };
      if (withTime) { o.hour = "numeric"; o.minute = "2-digit"; }
      return d.toLocaleString(undefined, o);
    } catch (e) { return iso; }
  }
  function words(s) { return (String(s).match(/\S+/g) || []).length; }
  function passageText(ref) {
    var p = SCRIPTURE[ref]; var out = [];
    p.blocks.forEach(function (b) { b.lines.forEach(function (l) { out.push(l[1]); }); });
    return out.join(" ");
  }
  function sectionMinutes(s) {
    var w = 0;
    s.passages.forEach(function (r) { w += words(passageText(r)); });
    w += words(s.context.join(" ")) + words(s.explanation.join(" ")) + words(s.prayer) + words(s.questions.join(" "));
    s.application.forEach(function (a) { w += words(a.heading + " " + a.text); });
    var reading = w / 200;          // relaxed devotional reading pace
    var reflect = s.actionPlan ? 15 : 10; // unhurried time to pray, reflect and journal
    return Math.max(10, Math.round((reading + reflect) / 5) * 5);
  }
  var MINUTES = SECTIONS.map(sectionMinutes);
  function perSection() {
    var lo = Math.min.apply(null, MINUTES), hi = Math.max.apply(null, MINUTES);
    return lo === hi ? lo + ' min' : lo + '–' + hi + ' min';
  }
  var TOTAL_MIN = MINUTES.reduce(function (a, b) { return a + b; }, 0);
  function fmtTotal(m) {
    var h = Math.floor(m / 60), r = m % 60;
    return h ? (h + " hr" + (r ? " " + r + " min" : "")) : (m + " min");
  }
  function verseText(ref, v) {
    var p = SCRIPTURE[ref]; var out = [];
    p.blocks.forEach(function (b) { b.lines.forEach(function (l) { if (l[0] === v) out.push(l[1]); }); });
    return out.join(" ");
  }
  function verseRef(ref, v) {
    // "Exodus 24:12–18" -> "Exodus 24:13"; "Psalm 46" -> "Psalm 46:3"
    var base = ref.split(":")[0];
    return base + ":" + v;
  }
  function isMarked(ref, v) {
    for (var i = 0; i < state.bookmarks.length; i++) {
      var b = state.bookmarks[i]; if (b.ref === ref && b.v === v) return i;
    }
    return -1;
  }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* --------------------------------------------------------------- icons */
  var I = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    mark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    mtn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20l6.5-11 4 6 2.5-4L21 20z"/></svg>',
  };

  /* --------------------------------------------------------------- scene */
  function pines(list) {
    return list.map(function (p) {
      var x = p[0], y = p[1], s = p[2];
      var w = 22 * s, h = 70 * s;
      return '<path class="pine" d="M' + x + ' ' + (y - h) + ' L' + (x - w) + ' ' + y + ' L' + (x + w) + ' ' + y + ' Z M' + (x - 2 * s) + ' ' + y + ' h' + (4 * s) + ' v' + (10 * s) + ' h' + (-4 * s) + ' Z"/>';
    }).join("");
  }
  function scene(opts) {
    opts = opts || {};
    var id = "g" + Math.random().toString(36).slice(2, 8);
    var stars = [[90,70],[180,140],[260,50],[340,110],[430,40],[520,95],[880,60],[960,130],[1040,45],[1120,100],[1160,170],[60,190],[760,70],[700,120],[380,180],[1010,200]]
      .map(function (s, i) { return '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="' + (i % 3 === 0 ? 2.2 : 1.4) + '"/>'; }).join("");
    var trees = pines([[40,640,1.1],[90,650,1.4],[140,636,1],[230,655,1.2],[1000,642,1.1],[1060,652,1.5],[1120,640,1],[1170,650,1.3],[300,662,.9],[930,660,.9]]);
    var shade = opts.shade
      ? '<linearGradient id="' + id + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1f17" stop-opacity="0"/><stop offset="1" stop-color="#0f1f17" stop-opacity=".78"/></linearGradient>'
      : "";
    return '<svg class="scene" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMax slice" role="img" aria-label="' + (opts.label || "Mountain peak above a forest at dawn") + '" focusable="false">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky-top"/><stop offset=".55" class="sky-mid"/><stop offset="1" class="sky-low"/></linearGradient>' + shade + '</defs>' +
      '<rect width="1200" height="700" fill="url(#' + id + ')"/>' +
      '<g class="stars">' + stars + '</g>' +
      '<circle class="sun-glow" cx="790" cy="235" r="140"/><circle class="sun" cx="790" cy="235" r="58"/>' +
      '<path class="ridge-far" d="M0 450 L110 400 L210 430 L330 350 L450 410 L540 372 L690 425 L800 360 L950 410 L1070 365 L1200 400 L1200 700 L0 700Z"/>' +
      '<path class="peak" d="M120 700 L400 430 L500 330 L560 262 L592 290 L640 180 L690 250 L728 226 L870 410 L1050 560 L1200 620 L1200 700Z"/>' +
      '<path class="peak-light" d="M640 180 L690 250 L728 226 L870 410 L1050 560 L900 520 L780 380 L700 300 Z"/>' +
      '<g class="cloud"><ellipse cx="610" cy="228" rx="120" ry="16"/><ellipse cx="700" cy="244" rx="90" ry="12"/><ellipse cx="540" cy="250" rx="70" ry="10"/></g>' +
      '<path class="hill-mid" d="M0 560 C190 505 320 548 470 524 C630 498 770 566 910 534 C1030 508 1120 524 1200 512 L1200 700 L0 700Z"/>' +
      '<path class="hill-front" d="M0 625 C180 592 380 646 600 618 C820 590 1000 644 1200 606 L1200 700 L0 700Z"/>' +
      trees +
      (opts.shade ? '<rect y="330" width="1200" height="370" fill="url(#' + id + 's)"/>' : "") +
      "</svg>";
  }

  /* ------------------------------------------------------------- shared */
  function topbar(center, right) {
    return '<header class="topbar"><div class="topbar-inner">' +
      '<a class="icon-btn" href="#/" aria-label="Back to The Mountain home">' + I.back + '<span>Home</span></a>' +
      '<div class="where">' + center + '</div>' +
      (right || '<a class="icon-btn" href="#/settings" aria-label="Settings: theme and text size">' + I.gear + '</a>') +
      "</div></header>";
  }
  function applyFont() {
    var size = 1.25 * (1 + 0.1 * state.fontStep);
    document.documentElement.style.setProperty("--scripture-size", size.toFixed(3) + "rem");
  }
  function applyTheme() {
    if (state.theme === "light" || state.theme === "dark") document.documentElement.setAttribute("data-theme", state.theme);
    else document.documentElement.removeAttribute("data-theme");
    var dark = state.theme === "dark" || (state.theme !== "light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      if (state.theme === "auto") metas[i].setAttribute("content", metas[i].media.indexOf("dark") > -1 ? "#0e1712" : "#1f3d2b");
      else metas[i].setAttribute("content", dark ? "#0e1712" : "#1f3d2b");
    }
  }
  function isDark() {
    return state.theme === "dark" || (state.theme === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function setPct(root) {
    var bars = root.querySelectorAll("[data-pct]");
    for (var i = 0; i < bars.length; i++) bars[i].style.setProperty("--pct", bars[i].getAttribute("data-pct") + "%");
  }

  /* ---------------------------------------------------------------- home */
  function renderHome() {
    var done = completedCount();
    var cont = continueTarget();
    var contLabel = done === TOTAL && !cont
      ? "Review the Study" : (cont ? "Section " + cont + " · " + SECTIONS[cont - 1].title : "");
    var contHref = cont ? "#/section/" + cont : "#/complete";
    var started = done > 0 || state.lastSection;
    var dots = SECTIONS.map(function (s, i) {
      var c = state.completed[s.id] ? "done" : (i + 1 === cont && started ? "here" : "");
      return '<span class="' + c + '"></span>';
    }).join("");
    var list = SECTIONS.map(function (s, i) {
      var n = i + 1, isDone = !!state.completed[s.id], here = n === cont && started;
      return '<li class="' + (isDone ? "done" : here ? "here" : "") + '"><a href="#/section/' + n + '">' +
        '<span class="num">' + (isDone ? I.check + '<span class="visually-hidden">Completed: </span>' : n) + '</span>' +
        '<span class="t"><strong>' + esc(s.title) + '</strong><small>' + esc(s.passages.join(" · ")) + " · " + MINUTES[i] + " min" + (here ? " · Up next" : "") + '</small></span>' +
        '<span class="chev">' + I.next + '</span></a></li>';
    }).join("");

    app.innerHTML =
      '<section class="hero">' + scene({ shade: true }) +
        '<div class="hero-top"><button class="icon-btn" id="themeQuick" type="button" aria-label="' + (isDark() ? "Switch to light mode" : "Switch to dark mode") + '">' + (isDark() ? I.sun : I.moon) + '</button></div>' +
        '<div class="hero-text"><div class="kicker">' + esc(STUDY.series) + '</div><h1>' + esc(STUDY.title) + '</h1><p class="subtitle">' + esc(STUDY.subtitle) + '</p></div>' +
      '</section>' +
      '<div class="wrap">' +
        '<div class="home-card">' +
          '<div class="progress-label"><span>Study progress</span><strong>' + done + ' of ' + TOTAL + ' sections</strong></div>' +
          '<div class="bar" role="progressbar" aria-label="Study progress" aria-valuemin="0" aria-valuemax="' + TOTAL + '" aria-valuenow="' + done + '"><span data-pct="' + Math.round(done / TOTAL * 100) + '"></span></div>' +
          '<div class="dots" aria-hidden="true">' + dots + '</div>' +
          '<div class="home-actions">' +
            '<a class="btn btn-primary" href="#/section/1" id="startBtn">Start Here</a>' +
            '<a class="btn btn-secondary btn-stack" href="' + contHref + '" id="continueBtn">Continue Study' +
              (started ? '<span class="sub">' + esc(contLabel) + '</span>' : '<span class="sub">Picks up where you leave off</span>') + '</a>' +
          '</div>' +
          '<div class="meta-row">' +
            '<span>' + I.clock + 'About ' + fmtTotal(TOTAL_MIN) + ' total · ' + perSection() + ' per section</span>' +
            '<span>' + I.book + 'Scripture: ' + esc(STUDY.translation.name) + ' (' + esc(STUDY.translation.abbr) + ')</span>' +
          '</div>' +
        '</div>' +
        '<nav class="home-links" aria-label="Study tools">' +
          '<a href="#/journal">' + I.pen + 'Journal</a>' +
          '<a href="#/bookmarks">' + I.mark + 'Bookmarks</a>' +
          '<a href="#/settings">' + I.gear + 'Settings</a>' +
        '</nav>' +
        '<section class="journey" aria-labelledby="journeyH"><h2 id="journeyH">The Journey</h2><ol>' + list + '</ol></section>' +
        '<p class="privacy-note">' + I.lock + 'Private by design. Your progress, journal and bookmarks are saved only on this device and are never sent anywhere.' +
          (storageOK ? "" : ' <strong>Saving is unavailable in this browser mode (for example, private browsing), so progress will not be kept.</strong>') + '</p>' +
      '</div>';
    setPct(app);
    document.getElementById("themeQuick").addEventListener("click", function () {
      state.theme = isDark() ? "light" : "dark"; save(); applyTheme(); renderHome();
      document.getElementById("themeQuick").focus();
    });
    document.title = "The Mountain";
  }

  /* ------------------------------------------------------------- section */
  function renderScripture(ref) {
    var p = SCRIPTURE[ref];
    var html = '<div class="passage"><h3>' + esc(ref) + '</h3>';
    if (p.superscription) html += '<p class="superscription">' + esc(p.superscription) + '</p>';
    html += '<div class="scripture-text">';
    p.blocks.forEach(function (b) {
      var seen = {};
      if (b.poem) {
        html += '<div class="poem">';
        b.lines.forEach(function (l) {
          var v = l[0];
          if (l[2] === "selah") { html += '<span class="selah">Selah.</span>'; return; }
          var first = !seen[v]; seen[v] = true;
          html += '<span class="line' + (first ? "" : " indent") + '">' + verseSpan(ref, v, l[1], first) + '</span>';
        });
        html += '</div>';
      } else {
        html += '<p>' + b.lines.map(function (l) { return verseSpan(ref, l[0], l[1], true); }).join(" ") + '</p>';
      }
    });
    html += '</div></div>';
    return html;
  }
  function verseSpan(ref, v, text, showNum) {
    var marked = isMarked(ref, v) > -1;
    return '<span class="verse' + (marked ? " marked" : "") + '" role="button" tabindex="0" data-ref="' + esc(ref) + '" data-v="' + v + '" aria-pressed="' + marked + '" aria-label="' + esc(verseRef(ref, v)) + (marked ? ", bookmarked" : "") + '. Tap to ' + (marked ? "remove bookmark" : "bookmark") + '">' +
      (showNum ? '<sup aria-hidden="true">' + v + '</sup>' : "") + esc(text) + '</span>';
  }

  function renderSection(n) {
    var s = SECTIONS[n - 1];
    if (!s) { location.replace("#/"); return; }
    state.lastSection = n; save();
    var isDone = !!state.completed[s.id];
    var j = state.journal[s.id] || {};
    var last = n === TOTAL;

    var parts = [];
    // 2. Scripture
    parts.push('<section class="part" aria-labelledby="p-scr"><div class="part-head"><span class="n">01</span><h2 id="p-scr">Scripture</h2></div>' +
      '<div class="scripture">' +
        '<div class="scripture-tools"><span class="trans-badge">' + esc(STUDY.translation.name) + ' (' + esc(STUDY.translation.abbr) + ')</span>' +
          '<span class="size-ctl" role="group" aria-label="Scripture text size">' +
            '<button type="button" class="small" data-font="-1" aria-label="Smaller Scripture text">A&minus;</button>' +
            '<button type="button" class="large" data-font="1" aria-label="Larger Scripture text">A+</button>' +
          '</span></div>' +
        '<p class="tap-hint">Tap any verse to bookmark it.</p>' +
        s.passages.map(renderScripture).join("") +
        '<p class="license">Scripture from the World English Bible (WEB), Public Domain.</p>' +
      '</div></section>');
    // 3. Context
    parts.push('<section class="part prose" aria-labelledby="p-ctx"><div class="part-head"><span class="n">02</span><h2 id="p-ctx">Biblical Context</h2></div>' +
      '<span class="label-chip">Background</span>' + s.context.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") + '</section>');
    // 4. Explanation
    parts.push('<section class="part prose" aria-labelledby="p-exp"><div class="part-head"><span class="n">03</span><h2 id="p-exp">Explanation</h2></div>' +
      '<span class="label-chip">What the passage says</span>' + s.explanation.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") + '</section>');
    // 5. Application
    parts.push('<section class="part" aria-labelledby="p-app"><div class="part-head"><span class="n">04</span><h2 id="p-app">Personal Application</h2></div>' +
      '<div class="application"><p class="disclaimer">These are personal reflections for life today. They are not direct biblical teaching. Weigh them against Scripture, in prayer.</p>' +
      s.application.map(function (a) { return '<div class="item"><h3>' + esc(a.heading) + '</h3><p>' + esc(a.text) + '</p></div>'; }).join("") +
      '</div></section>');
    // 6. Questions
    parts.push('<section class="part" aria-labelledby="p-q"><div class="part-head"><span class="n">05</span><h2 id="p-q">Reflection Questions</h2></div>' +
      '<ol class="questions">' + s.questions.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + '</ol></section>');
    // 7. Journal (+ action plan)
    var planHtml = "";
    if (s.actionPlan) {
      planHtml = '<p class="part-note">Your action plan for returning to everyday life. Saved privately with your journal.</p>' +
        s.actionPlan.map(function (f) {
          return '<div class="plan-field"><label for="plan-' + f.id + '">' + esc(f.label) + '<span class="hint">' + esc(f.hint) + '</span></label>' +
            '<textarea class="short" id="plan-' + f.id + '" data-plan="' + f.id + '">' + esc(state.plan[f.id] || "") + '</textarea></div>';
        }).join("");
    }
    parts.push('<section class="part journal-box" aria-labelledby="p-j"><div class="part-head"><span class="n">06</span><h2 id="p-j">' + (s.actionPlan ? "Journal &amp; Action Plan" : "Private Journal") + '</h2></div>' +
      planHtml +
      '<label for="journal">' + (s.actionPlan ? "Journal entry" : "Write freely. Use the questions above as prompts if they help.") + '</label>' +
      '<textarea id="journal" placeholder="What is God showing you?">' + esc(j.text || "") + '</textarea>' +
      '<div class="save-state" id="saveState" aria-live="polite">' + (j.updated ? I.lock + "Saved privately on this device · " + esc(fmtDate(j.updated, true)) : I.lock + "Saves automatically, only on this device") + '</div>' +
      '</section>');
    // 8. Prayer
    parts.push('<section class="part prayer" aria-labelledby="p-pr"><div class="part-head"><span class="n">07</span><h2 id="p-pr">Closing Prayer</h2></div><p>' + esc(s.prayer) + '</p></section>');

    var finishLabel = last ? (isDone ? "Finish the Study" : "Complete the Study") : (isDone ? "Continue to Section " + (n + 1) : "Complete and Continue");
    var prev = n > 1 ? '<a href="#/section/' + (n - 1) + '">' + I.back + '<span>' + esc(SECTIONS[n - 2].title) + '</span></a>' : "<span></span>";
    var next = n < TOTAL ? '<a href="#/section/' + (n + 1) + '"><span>' + esc(SECTIONS[n].title) + '</span>' + I.next + '</a>' : "<span></span>";

    app.innerHTML = topbar("Section " + n + " of " + TOTAL) +
      '<div class="band">' + scene({ label: "Mountain scenery" }) + '</div>' +
      '<article class="wrap">' +
        '<header class="sec-head"><div class="kicker">Section ' + n + '</div><h1 id="secTitle">' + esc(s.title) + '</h1>' +
          '<div class="refs"><span>' + I.book + esc(s.passages.join(" · ")) + '</span><span>' + I.clock + 'About ' + MINUTES[n - 1] + ' min</span></div>' +
          (isDone ? '<div class="completed-flag">' + I.check + 'Completed ' + esc(fmtDate(state.completed[s.id])) + '</div>' : "") +
        '</header>' +
        parts.join("") +
        '<div class="finish"><button type="button" class="btn btn-gold" id="finishBtn">' + I.check + finishLabel + '</button></div>' +
        '<nav class="pager" aria-label="Section navigation">' + prev + next + '</nav>' +
      '</article>';

    document.title = s.title + " · The Mountain";
    wireSection(n, s);
  }

  function wireSection(n, s) {
    updateFontButtons();
    // font size
    app.querySelectorAll("[data-font]").forEach(function (b) {
      b.addEventListener("click", function () {
        var d = parseInt(b.getAttribute("data-font"), 10);
        state.fontStep = Math.max(FONT_MIN, Math.min(FONT_MAX, state.fontStep + d));
        save(); applyFont(); updateFontButtons();
      });
    });
    // bookmarks
    function toggle(el) {
      var ref = el.getAttribute("data-ref"), v = parseInt(el.getAttribute("data-v"), 10);
      var i = isMarked(ref, v);
      if (i > -1) { state.bookmarks.splice(i, 1); toast("Bookmark removed"); }
      else {
        state.bookmarks.push({ ref: ref, v: v, text: verseText(ref, v), sectionId: s.id, added: new Date().toISOString() });
        toast("Bookmarked " + verseRef(ref, v));
      }
      save();
      var marked = i === -1;
      app.querySelectorAll('.verse[data-ref="' + ref + '"][data-v="' + v + '"]').forEach(function (x) {
        x.classList.toggle("marked", marked);
        x.setAttribute("aria-pressed", String(marked));
        x.setAttribute("aria-label", verseRef(ref, v) + (marked ? ", bookmarked" : "") + ". Tap to " + (marked ? "remove bookmark" : "bookmark"));
      });
    }
    app.querySelectorAll(".verse").forEach(function (el) {
      el.addEventListener("click", function () {
        if (window.getSelection && String(window.getSelection()).length > 0) return; // allow text selection
        toggle(el);
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(el); }
      });
    });
    // journal autosave
    var status = document.getElementById("saveState");
    var timer;
    function persist() {
      var ta = document.getElementById("journal");
      if (!ta) return;
      var text = ta.value;
      if (text.trim()) state.journal[s.id] = { text: text, updated: new Date().toISOString() };
      else delete state.journal[s.id];
      app.querySelectorAll("[data-plan]").forEach(function (p) {
        var k = p.getAttribute("data-plan");
        if (p.value.trim()) state.plan[k] = p.value; else delete state.plan[k];
        state.planUpdated = new Date().toISOString();
      });
      if (save()) status.innerHTML = I.lock + "Saved privately on this device · " + esc(fmtDate(new Date().toISOString(), true));
    }
    function schedule() { status.textContent = "Saving…"; clearTimeout(timer); timer = setTimeout(persist, 500); }
    app.querySelectorAll("textarea").forEach(function (ta) {
      ta.addEventListener("input", schedule);
      ta.addEventListener("blur", function () { clearTimeout(timer); persist(); });
    });
    currentFlush = function () { clearTimeout(timer); persist(); };
    // remember reading position
    scrollSaver = function () { state.scroll[n] = Math.round(window.scrollY); };
    // finish
    document.getElementById("finishBtn").addEventListener("click", function () {
      currentFlush();
      var now = new Date().toISOString();
      var wasDone = !!state.completed[s.id];
      if (!wasDone) state.completed[s.id] = now;
      state.history.push({ id: s.id, at: now });
      delete state.scroll[n];
      var allDone = completedCount() === TOTAL;
      if (n === TOTAL || (allDone && !wasDone && firstIncomplete() === 0)) {
        if (allDone && !wasDone) state.studyCompletions.push(now);
        if (allDone && wasDone && n === TOTAL) { /* reviewing: no new study completion */ }
        state.lastSection = null;
        save();
        location.hash = "#/complete";
        return;
      }
      state.lastSection = n + 1;
      save();
      toast(wasDone ? "Section " + n + " reviewed" : "Section " + n + " complete. Progress saved.");
      location.hash = "#/section/" + (n + 1);
    });
  }
  function updateFontButtons() {
    app.querySelectorAll('[data-font="-1"]').forEach(function (b) { b.disabled = state.fontStep <= FONT_MIN; });
    app.querySelectorAll('[data-font="1"]').forEach(function (b) { b.disabled = state.fontStep >= FONT_MAX; });
  }

  /* ------------------------------------------------------------- journal */
  function exportText() {
    var lines = [];
    lines.push("THE MOUNTAIN: A STUDY OF MOSES");
    lines.push("Private Journal · Exported " + fmtDate(new Date().toISOString(), true));
    lines.push("Scripture: World English Bible (WEB), Public Domain");
    lines.push("");
    var any = false;
    SECTIONS.forEach(function (s, i) {
      var j = state.journal[s.id];
      var plan = s.actionPlan ? s.actionPlan.filter(function (f) { return state.plan[f.id]; }) : [];
      if (!j && !plan.length) return;
      any = true;
      lines.push("========================================");
      lines.push("Section " + (i + 1) + " — " + s.title + " (" + s.passages.join("; ") + ")");
      if (state.completed[s.id]) lines.push("Completed " + fmtDate(state.completed[s.id]));
      lines.push("");
      if (plan.length) {
        lines.push("ACTION PLAN");
        plan.forEach(function (f) { lines.push("• " + f.label + ":"); lines.push("  " + state.plan[f.id].replace(/\n/g, "\n  ")); });
        lines.push("");
      }
      if (j) {
        lines.push("Journal · " + fmtDate(j.updated, true));
        lines.push(j.text);
        lines.push("");
      }
    });
    if (state.bookmarks.length) {
      lines.push("========================================");
      lines.push("BOOKMARKED VERSES");
      state.bookmarks.forEach(function (b) { lines.push("• " + verseRef(b.ref, b.v) + " — " + b.text); });
      lines.push("");
    }
    if (!any && !state.bookmarks.length) lines.push("(No journal entries yet.)");
    return lines.join("\n");
  }

  function renderJournal() {
    var entries = SECTIONS.map(function (s, i) {
      var j = state.journal[s.id];
      var plan = s.actionPlan ? s.actionPlan.filter(function (f) { return state.plan[f.id]; }) : [];
      if (!j && !plan.length) return "";
      return '<div class="entry"><h3><a href="#/section/' + (i + 1) + '">Section ' + (i + 1) + ': ' + esc(s.title) + '</a></h3>' +
        '<div class="when">' + (j ? "Updated " + esc(fmtDate(j.updated, true)) : "") + (state.completed[s.id] ? " · Completed " + esc(fmtDate(state.completed[s.id])) : "") + '</div>' +
        plan.map(function (f) { return '<p class="plan-k">' + esc(f.label) + '</p><div class="body">' + esc(state.plan[f.id]) + '</div>'; }).join("") +
        (j ? (plan.length ? '<p class="plan-k">Journal entry</p>' : "") + '<div class="body">' + esc(j.text) + '</div>' : "") +
        '</div>';
    }).join("");
    app.innerHTML = topbar("Journal") +
      '<div class="wrap"><header class="page-head"><div class="kicker">Private</div><h1>My Journal</h1>' +
      '<p>Entries stay on this device. Export a copy now and then so you never lose them.</p></header>' +
      '<div class="panel"><h2>Export</h2><p>Download a plain-text file of every entry, your action plan and bookmarked verses. The file is created on your phone; nothing is uploaded.</p>' +
        '<div class="stack"><button type="button" class="btn btn-primary" id="dlBtn">Download journal (.txt)</button>' +
        (navigator.share ? '<button type="button" class="btn btn-secondary" id="shareBtn">Save or send with…</button>' : "") +
        '<button type="button" class="btn btn-quiet" id="copyBtn">Copy all to clipboard</button></div></div>' +
      '<div class="panel">' + (entries || '<p class="empty">No journal entries yet. Your writing from each section will appear here.</p>') + '</div>' +
      '</div>';
    document.title = "Journal · The Mountain";
    document.getElementById("dlBtn").addEventListener("click", function () {
      var blob = new Blob([exportText()], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "the-mountain-journal-" + new Date().toISOString().slice(0, 10) + ".txt";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast("Journal downloaded");
    });
    var sb = document.getElementById("shareBtn");
    if (sb) sb.addEventListener("click", function () {
      // The system share sheet is controlled by the user; nothing is sent unless they choose a destination.
      var text = exportText();
      var file;
      try { file = new File([text], "the-mountain-journal.txt", { type: "text/plain" }); } catch (e) { file = null; }
      var data = file && navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file], title: "The Mountain Journal" } : { title: "The Mountain Journal", text: text };
      navigator.share(data).catch(function () {});
    });
    document.getElementById("copyBtn").addEventListener("click", function () {
      var text = exportText();
      function fallback() {
        var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", "");
        ta.className = "visually-hidden"; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); toast("Copied to clipboard"); } catch (e) { toast("Copy is not available here"); }
        ta.remove();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast("Copied to clipboard"); }, fallback);
      else fallback();
    });
  }

  /* ----------------------------------------------------------- bookmarks */
  function renderBookmarks() {
    var list = state.bookmarks.slice().sort(function (a, b) {
      return idxOf(a.sectionId) - idxOf(b.sectionId) || a.v - b.v;
    });
    var html = list.length ? list.map(function (b) {
      var n = idxOf(b.sectionId);
      return '<div class="bm"><div class="ref">' + esc(verseRef(b.ref, b.v)) + ' · WEB</div><p>' + esc(b.text) + '</p>' +
        '<div class="acts">' + (n ? '<a class="icon-btn" href="#/section/' + n + '">' + I.book + 'Open section</a>' : "") +
        '<button type="button" class="icon-btn" data-rm="' + esc(b.ref) + '|' + b.v + '">' + I.mark + 'Remove</button></div></div>';
    }).join("") : '<p class="empty">No bookmarks yet. In any section, tap a verse to save it here.</p>';
    app.innerHTML = topbar("Bookmarks") +
      '<div class="wrap"><header class="page-head"><div class="kicker">Scripture</div><h1>Bookmarks</h1><p>Verses you have saved during the study.</p></header>' +
      '<div class="panel">' + html + '</div></div>';
    document.title = "Bookmarks · The Mountain";
    app.querySelectorAll("[data-rm]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = b.getAttribute("data-rm").split("|");
        var i = isMarked(p[0], parseInt(p[1], 10));
        if (i > -1) { state.bookmarks.splice(i, 1); save(); toast("Bookmark removed"); renderBookmarks(); }
      });
    });
  }

  /* ------------------------------------------------------------ settings */
  function renderSettings() {
    var hist = state.history.slice().reverse().slice(0, 40).map(function (h) {
      var n = idxOf(h.id);
      return '<li><span>' + (n ? "Section " + n + ": " + esc(SECTIONS[n - 1].title) : esc(h.id)) + '</span><span class="d">' + esc(fmtDate(h.at)) + '</span></li>';
    }).join("");
    var studies = state.studyCompletions.map(function (d, i) { return '<li><span>Full study completed' + (state.studyCompletions.length > 1 ? " (" + (i + 1) + ")" : "") + '</span><span class="d">' + esc(fmtDate(d)) + '</span></li>'; }).join("");
    function seg(v, label) { return '<button type="button" data-theme-set="' + v + '" aria-pressed="' + (state.theme === v) + '">' + label + '</button>'; }
    app.innerHTML = topbar("Settings", '<span class="icon-btn" aria-hidden="true"></span>') +
      '<div class="wrap"><header class="page-head"><div class="kicker">Settings</div><h1>Reading &amp; Privacy</h1></header>' +
      '<div class="panel"><h2>Appearance</h2><div class="seg" role="group" aria-label="Color theme">' + seg("auto", "Auto") + seg("light", "Light") + seg("dark", "Dark") + '</div></div>' +
      '<div class="panel"><h2>Scripture text size</h2>' +
        '<span class="size-ctl" role="group" aria-label="Scripture text size"><button type="button" class="small" data-font="-1" aria-label="Smaller Scripture text">A&minus;</button><button type="button" class="large" data-font="1" aria-label="Larger Scripture text">A+</button></span>' +
        '<p class="preview">“My presence will go with you, and I will give you rest.” <span class="trans-badge">Exodus 33:14</span></p></div>' +
      '<div class="panel"><h2>Completion history</h2>' + (studies || hist ? '<ul class="history">' + studies + hist + '</ul>' : '<p class="empty">Nothing completed yet.</p>') + '</div>' +
      '<div class="panel"><h2>Privacy</h2><p>Everything you write is stored in this browser on this device only. It is not sent to any server, analytics or third party, and it is not part of the website’s code on GitHub. Clearing your browser’s website data will erase it, so export your journal from time to time.</p>' +
        '<div class="stack"><a class="btn btn-quiet" href="#/journal">Export my journal</a>' +
        '<button type="button" class="btn btn-danger" id="resetProgress">Reset progress (keep journal)</button>' +
        '<button type="button" class="btn btn-danger" id="eraseAll">Erase everything on this device</button></div></div>' +
      '<div class="panel"><h2>About</h2><p>Scripture quotations are from the World English Bible (WEB), which is in the Public Domain. “World English Bible” is a trademark of eBible.org. Study notes separate Scripture, background, explanation and personal application; application sections are reflections, not Scripture.</p></div>' +
      '</div>';
    document.title = "Settings · The Mountain";
    app.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.theme = b.getAttribute("data-theme-set"); save(); applyTheme();
        app.querySelectorAll("[data-theme-set]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      });
    });
    updateFontButtons();
    app.querySelectorAll("[data-font]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.fontStep = Math.max(FONT_MIN, Math.min(FONT_MAX, state.fontStep + parseInt(b.getAttribute("data-font"), 10)));
        save(); applyFont(); updateFontButtons();
      });
    });
    document.getElementById("resetProgress").addEventListener("click", function () {
      if (!confirm("Reset your study progress? Your journal entries and bookmarks will be kept.")) return;
      state.completed = {}; state.lastSection = null; state.scroll = {};
      save(); toast("Progress reset"); location.hash = "#/";
    });
    document.getElementById("eraseAll").addEventListener("click", function () {
      if (!confirm("Erase all progress, journal entries, action plan and bookmarks from this device? This cannot be undone. Consider exporting your journal first.")) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      state = defaults(); applyFont(); applyTheme(); toast("Everything erased"); location.hash = "#/";
    });
  }

  /* ------------------------------------------------------------ complete */
  function renderComplete() {
    var done = completedCount();
    var all = done === TOTAL;
    app.innerHTML = topbar(all ? "Study complete" : "The Mountain") +
      '<div class="done-hero">' + scene({ label: "Mountain scenery" }) + '</div>' +
      '<div class="wrap done-body">' +
        '<div class="kicker">' + (all ? "Coming down from the mountain" : done + " of " + TOTAL + " sections complete") + '</div>' +
        '<h1>' + (all ? "You have finished The Mountain" : "Keep climbing") + '</h1>' +
        (all ? '<p>Return to your home, your work and your family carrying what God has shown you. Revisit your action plan in a week.</p>'
             : '<p>Some sections are still waiting for you.</p>') +
        '<p class="verse-card">“My presence will go with you, and I will give you rest.”<cite>Exodus 33:14 · WEB</cite></p>' +
        '<div class="stack done-actions">' +
          (all ? '<a class="btn btn-primary" href="#/section/' + TOTAL + '">Review my action plan</a>' : '<a class="btn btn-primary" href="#/section/' + (firstIncomplete() || 1) + '">Continue Study</a>') +
          '<a class="btn btn-secondary" href="#/journal">Read &amp; export my journal</a>' +
          '<a class="btn btn-quiet" href="#/">Back to the beginning</a>' +
        '</div></div>';
    document.title = "Complete · The Mountain";
  }

  /* -------------------------------------------------------------- router */
  var currentFlush = function () {};
  var scrollSaver = null;
  var lastRoute = "";

  function route() {
    try { currentFlush(); } catch (e) {}
    if (scrollSaver) { scrollSaver(); save(); }
    currentFlush = function () {}; scrollSaver = null;

    var h = location.hash.replace(/^#\/?/, "");
    var m = h.match(/^section\/(\d+)$/);
    var restoreY = 0;
    if (m) {
      var n = parseInt(m[1], 10);
      if (n < 1 || n > TOTAL) { location.replace("#/"); return; }
      if (resumeRequested && state.scroll[n]) restoreY = state.scroll[n];
      renderSection(n);
    }
    else if (h === "journal") renderJournal();
    else if (h === "bookmarks") renderBookmarks();
    else if (h === "settings") renderSettings();
    else if (h === "complete") renderComplete();
    else renderHome();
    resumeRequested = false;
    lastRoute = h;
    window.scrollTo(0, restoreY);
    if (h && !restoreY) { try { app.focus({ preventScroll: true }); } catch (e) { app.focus(); } }
  }

  var resumeRequested = false;
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("#continueBtn");
    if (a) resumeRequested = true;
  });
  window.addEventListener("hashchange", route);
  // Save journal text and reading position when the app is backgrounded or closed.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") { try { currentFlush(); } catch (e) {} if (scrollSaver) { scrollSaver(); save(); } }
  });
  window.addEventListener("pagehide", function () { try { currentFlush(); } catch (e) {} if (scrollSaver) { scrollSaver(); save(); } });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function () { if (state.theme === "auto") { applyTheme(); if (!lastRoute) renderHome(); } };
    if (mq.addEventListener) mq.addEventListener("change", onChange); else if (mq.addListener) mq.addListener(onChange);
  }

  applyFont();
  applyTheme();
  route();
})();
