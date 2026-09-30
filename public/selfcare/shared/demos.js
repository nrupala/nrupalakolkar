/* Self-care shared video demonstrator — same-origin, zero third-party requests.
   Human character clips (woman/man), looping muted playsinline video, with an
   anatomical overlay built as a LAYER SYSTEM so future layers (muscles,
   skeleton, nervous system) plug in without touching the player code.

   Overlay honesty rule: marker positions are APPROXIMATE zones tuned per
   movement framing (clips are full-body, waist-up, seated, and side-lying).
   They orient the viewer; they do not claim clinical precision. */
"use strict";
window.SCDemos = (function () {
  var CLIP_BASE = "/selfcare/shared/clips/";
  var STILL_BASE = "/selfcare/shared/clips/stills/";
  var LS_CHAR = "scd-char"; /* "her" (default) | "him" — global across pages */

  /* ---------- character ---------- */
  function getChar() {
    try {
      var c = localStorage.getItem(LS_CHAR);
      return c === "him" ? "him" : "her";
    } catch (e) { return "her"; }
  }
  /* Returns true when the character actually changed. */
  function setChar(c) {
    c = (c === "him") ? "him" : "her";
    if (c === getChar()) return false;
    try { localStorage.setItem(LS_CHAR, c); } catch (e) {}
    return true;
  }

  /* ---------- movement table ----------
     profile: clip framing used to place overlay markers (stand | crop |
              sit | lie | lieR). nodes: lymphatic node/vessel groups shown.
     pose: still used for reduced-motion and clip placeholders. */
  var MOVES = {
    "neck-roll":    { profile: "crop",  nodes: ["cervical", "supraclavicular"], pose: "stand" },
    "shoulder-roll":{ profile: "stand", nodes: ["cervical", "supraclavicular", "axillary"], pose: "stand" },
    "chest-open":   { profile: "stand", nodes: ["axillary", "thoracic"], pose: "stand" },
    "side-stretch": { profile: "stand", nodes: ["axillary", "thoracic"], pose: "stand" },
    "forward-roll": { profile: "stand", nodes: ["thoracic", "abdominal"], pose: "stand" },
    "trunk-twist":  { profile: "lie",   nodes: ["thoracic", "abdominal", "inguinal"], pose: "lie" },
    "bridge":       { profile: "lieR",  nodes: ["abdominal", "inguinal"], pose: "lie" },
    "knee-chest":   { profile: "lie",   nodes: ["abdominal", "inguinal", "popliteal"], pose: "lie" },
    "leg-floss":    { profile: "lie",   nodes: ["inguinal", "popliteal"], pose: "lie" },
    "belly-breathe":{ profile: "sit",   nodes: ["thoracic", "abdominal"], pose: "sit" },
    "collarbone":   { profile: "crop",  nodes: ["supraclavicular", "cervical"], pose: "stand" },
    "cactus":       { profile: "stand", nodes: ["axillary", "thoracic"], pose: "stand" },
    "cat-cow":      { profile: "sit",   nodes: ["thoracic", "abdominal"], pose: "sit" },
    "neck-tilt":    { profile: "stand", nodes: ["cervical", "supraclavicular"], pose: "stand" },
    "arm-sweep":    { profile: "stand", nodes: ["cervical", "axillary", "thoracic"], pose: "stand" },
    "calf-raise":   { profile: "stand", nodes: ["popliteal", "inguinal"], pose: "stand" },
    "good-morning": { profile: "stand", nodes: ["abdominal", "inguinal"], pose: "stand" },
    "knee-arm":     { profile: "stand", nodes: ["inguinal", "axillary", "popliteal"], pose: "stand" },
    "bounce":       { profile: "stand", nodes: ["cervical", "axillary", "inguinal", "popliteal"], pose: "stand" }
  };

  /* Approximate node zones in overlay units (viewBox 0 0 50 100 matches the
     1:2 portrait clips, so markers scale uniformly with the figure). */
  var PROFILES = {
    stand: {
      cervical: [[21.5, 14], [28.5, 14]],
      supraclavicular: [[20, 24], [30, 24]],
      axillary: [[14, 29], [36, 29]],
      thoracic: "M25,28 C25,36 25,42 25,48",
      abdominal: [[25, 50]],
      inguinal: [[20.5, 56], [29.5, 56]],
      popliteal: [[22, 71], [28, 71]]
    },
    crop: {
      cervical: [[22, 15], [28, 15]],
      supraclavicular: [[20.5, 27], [29.5, 27]],
      axillary: [[14.5, 32], [35.5, 32]],
      thoracic: "M25,30 C25,38 25,44 25,52",
      abdominal: [[25, 55]]
    },
    sit: {
      cervical: [[22, 13], [28, 13]],
      supraclavicular: [[20.5, 24], [29.5, 24]],
      axillary: [[14.5, 29], [35.5, 29]],
      thoracic: "M25,28 C25,34 25,40 25,46",
      abdominal: [[25, 47]],
      inguinal: [[21, 54], [29, 54]]
    },
    lie: {
      cervical: [[8, 58]],
      supraclavicular: [[12, 60]],
      axillary: [[17, 62]],
      thoracic: "M12,60 C20,61 26,61 32,61",
      abdominal: [[24, 60]],
      inguinal: [[29, 58]],
      popliteal: [[36, 50]]
    },
    lieR: {
      cervical: [[42, 58]],
      supraclavicular: [[38, 60]],
      axillary: [[33, 62]],
      thoracic: "M38,60 C30,61 24,61 18,61",
      abdominal: [[26, 60]],
      inguinal: [[21, 58]],
      popliteal: [[14, 50]]
    }
  };

  /* Clips still being generated — render a matching character still instead.
     TODO(clip-retry): replace each entry with its generated mp4 and delete
     the placeholder branch in resolve(); see clips/MAPPING.md. */
  var MISSING = {
    "belly-breathe:her": "her-seated",
    "bridge:her": "her-lying",
    "neck-tilt:him": "him-neutral",
    "calf-raise:him": "him-neutral",
    "leg-floss:him": "him-lying"
  };

  var POSE_STILL = { stand: "neutral", sit: "seated", lie: "lying" };

  function prefersReduced() {
    try {
      return window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { return false; }
  }

  /* Resolve a movement to playable media for the current character.
     {kind:"video",src} | {kind:"still",src,placeholder} */
  function resolve(move) {
    var char = getChar(), key = move + ":" + char;
    if (MISSING[key]) {
      return { kind: "still", src: STILL_BASE + MISSING[key] + ".webp", placeholder: true };
    }
    if (prefersReduced()) {
      var cfg = MOVES[move] || { pose: "stand" };
      return { kind: "still", src: STILL_BASE + char + "-" + (POSE_STILL[cfg.pose] || "neutral") + ".webp", placeholder: false };
    }
    return { kind: "video", src: CLIP_BASE + move + "-" + char + ".mp4", placeholder: false };
  }

  /* ---------- overlay layer system ----------
     Each layer: { id, label, render(move) -> svg inner markup }.
     Future anatomy layers (muscles, skeleton, nervous system) register here
     with the same shape — the player and figure code stay untouched. */
  var LAYERS = {
    lymphatic: {
      id: "lymphatic",
      label: "Lymphatic",
      render: function (move) {
        var cfg = MOVES[move];
        if (!cfg) return "";
        var prof = PROFILES[cfg.profile];
        if (!prof) return "";
        var s = "";
        cfg.nodes.forEach(function (n, ni) {
          if (n === "thoracic") {
            s += '<path class="vessel" d="' + prof.thoracic + '"/>';
            return;
          }
          var pts = prof[n];
          if (!pts) return;
          pts.forEach(function (pt, pi) {
            s += '<circle class="node pulse" style="animation-delay:' +
              (((ni + pi) * 0.45) % 2).toFixed(2) +
              's" cx="' + pt[0] + '" cy="' + pt[1] + '" r="1.5"/>';
          });
        });
        return s;
      }
    }
    /* muscles:  { id:"muscles",  label:"Muscles",  render: function(move){...} },
       skeleton: { id:"skeleton", label:"Skeleton", render: function(move){...} },
       nerves:   { id:"nerves",   label:"Nervous system", render: function(move){...} } */
  };
  var ACTIVE_LAYERS = ["lymphatic"];

  function renderOverlay(move) {
    var out = "";
    ACTIVE_LAYERS.forEach(function (id) {
      var L = LAYERS[id];
      if (L && typeof L.render === "function") {
        out += '<g class="lyr-' + L.id + '">' + L.render(move) + "</g>";
      }
    });
    return out;
  }

  /* ---------- shared styles (injected once) ---------- */
  var stylesDone = false;
  function ensureStyles() {
    if (stylesDone) return;
    stylesDone = true;
    var css =
      ".scdemo{position:relative;max-width:280px;margin:0 auto;border-radius:16px;overflow:hidden;background:#0b1020;border:1px solid #26314d}" +
      ".scdemo video,.scdemo img{display:block;width:100%;aspect-ratio:1/2;object-fit:cover;background:#0b1020}" +
      ".scdemo-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}" +
      ".scdemo .node{fill:#7ef9d2;stroke:#0b1020;stroke-width:.25;opacity:.8}" +
      ".scdemo .vessel{stroke:#7ef9d2;stroke-width:.8;fill:none;opacity:.45;stroke-linecap:round}" +
      ".scdemo .pulse{transform-box:fill-box;transform-origin:center;animation:scd-pulse 2.6s ease-in-out infinite}" +
      "@keyframes scd-pulse{0%,100%{opacity:.45}50%{opacity:.95}}" +
      "@media (prefers-reduced-motion:reduce){.scdemo .pulse{animation:none;opacity:.8}}" +
      ".scdemo-badge{position:absolute;top:8px;left:8px;right:8px;text-align:center;font-size:11px;line-height:1.4;padding:4px 8px;border-radius:999px;background:rgba(11,16,32,.8);color:#cfe3ff;border:1px solid #33415f}" +
      ".scdemo-cap{margin:0;padding:7px 10px;font-size:11px;line-height:1.45;color:#9fb2d8;background:rgba(11,16,32,.94);text-align:center}" +
      ".char-toggle{display:inline-flex;gap:6px;padding:3px;border:1px solid #26314d;border-radius:999px;background:#0f1526}" +
      ".char-toggle button{border:0;border-radius:999px;padding:7px 18px;font-size:13px;background:transparent;color:#9fb2d8;cursor:pointer}" +
      ".char-toggle button[aria-pressed=\"true\"]{background:#2b3c5e;color:#fff}";
    var st = document.createElement("style");
    st.setAttribute("data-scdemos", "1");
    st.textContent = css;
    document.head.appendChild(st);
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Render the full demonstrator figure (media + overlay + caption) into el. */
  function renderFigure(el, move) {
    if (!el) return;
    ensureStyles();
    var res = resolve(move);
    var mediaHtml;
    if (res.kind === "video") {
      mediaHtml = '<video src="' + esc(res.src) +
        '" muted loop playsinline autoplay preload="metadata" disablepictureinpicture' +
        ' aria-label="Movement demonstration video"></video>';
    } else {
      mediaHtml = '<img src="' + esc(res.src) + '" alt="Movement demonstration pose">';
    }
    var badge = res.placeholder
      ? '<span class="scdemo-badge">Preview still — full motion clip coming soon</span>'
      : "";
    var cap = res.placeholder
      ? "Still preview — markers show approximate node areas."
      : "Demonstration · markers show approximate node areas.";
    el.innerHTML =
      '<div class="scdemo' + (res.placeholder ? " is-placeholder" : "") + '">' +
      mediaHtml +
      '<svg class="scdemo-overlay" viewBox="0 0 50 100" preserveAspectRatio="none" aria-hidden="true">' +
      renderOverlay(move) + "</svg>" + badge +
      '<p class="scdemo-cap">' + cap + "</p></div>";
    var v = el.querySelector("video");
    if (v) {
      try { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      catch (e) {}
    }
  }

  /* ---------- character toggle ---------- */
  function refreshToggles(scope) {
    var c = getChar();
    (scope || document).querySelectorAll("[data-char-toggle] button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-char") === c ? "true" : "false");
    });
  }
  /* Fill every [data-char-toggle] slot in scope with a Woman/Man segmented
     control. onSwitch(char) fires after a change (e.g. re-render the player
     figure mid-routine — timers are untouched). */
  function wireCharToggles(scope, onSwitch) {
    ensureStyles();
    scope = scope || document;
    scope.querySelectorAll("[data-char-toggle]").forEach(function (slot) {
      var c = getChar();
      slot.innerHTML =
        '<div class="char-toggle" role="group" aria-label="Demonstrator">' +
        '<button type="button" data-char="her" aria-pressed="' + (c === "her") + '">Woman</button>' +
        '<button type="button" data-char="him" aria-pressed="' + (c === "him") + '">Man</button></div>';
      slot.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (setChar(btn.getAttribute("data-char"))) {
            refreshToggles(scope);
            if (typeof onSwitch === "function") onSwitch(getChar());
          }
        });
      });
    });
  }

  /* ---------- session-resilience lifecycle ----------
     Consumes PR #36's SC.onReturn / SC.onHide / SC.wallElapsed when the shared
     engine provides them; otherwise an equivalent local dispatcher, so these
     pages get wall-clock resilience without merging that branch. */
  function wireLifecycle(onHide, onReturn) {
    var sc = window.SC;
    if (sc && typeof sc.onHide === "function" && typeof sc.onReturn === "function") {
      sc.onHide(onHide);
      sc.onReturn(onReturn);
      return "sc";
    }
    document.addEventListener("visibilitychange", function () {
      try {
        if (document.hidden) { if (onHide) onHide(); }
        else if (onReturn) onReturn();
      } catch (e) {}
    });
    return "local";
  }
  function wallElapsed(startStamp) {
    var sc = window.SC;
    if (sc && typeof sc.wallElapsed === "function") return sc.wallElapsed(startStamp);
    return Date.now() - startStamp;
  }

  return {
    getChar: getChar,
    setChar: setChar,
    moves: MOVES,
    layers: LAYERS,
    activeLayers: ACTIVE_LAYERS,
    resolve: resolve,
    prefersReduced: prefersReduced,
    renderFigure: renderFigure,
    wireCharToggles: wireCharToggles,
    wireLifecycle: wireLifecycle,
    wallElapsed: wallElapsed
  };
})();
