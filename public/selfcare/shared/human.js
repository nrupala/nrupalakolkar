/* SCHuman — original articulated human demonstrator + lymphatic overlay.
 *
 * Phase 1: front view + face close-up, lymphatic layer only.
 * Original vector art drawn for this project. No third-party assets,
 * no runtime network requests — everything renders on-device.
 *
 * Future anatomy layers (muscles / skeleton / nervous system) plug into
 * LAYERS and the `layers` option on each move config. They are NOT built yet.
 *
 * API mirrors SCMoves so routine pages can adopt it as a drop-in:
 *   SCHuman.svg(moveKey)        -> animated SVG string for the movement
 *   SCHuman.svgStatic(moveKey,t) -> same figure posed at t seconds (debug/preview)
 *   SCHuman.fill(root)          -> fills every [data-hmove] in root
 *   SCHuman.types               -> list of supported movement keys
 */
window.SCHuman = (function () {
"use strict";

/* ------------------------------------------------------------------ */
/* extension seam for future anatomy layers                             */
/* ------------------------------------------------------------------ */
var LAYERS = {
  lymphatic: { build: buildLymphatic } /* future: muscles, skeleton, nerves */
};
var DEFAULT_LAYERS = ["lymphatic"];

/* ------------------------------------------------------------------ */
/* setup                                                                */
/* ------------------------------------------------------------------ */
var uid = 0;
function nid(p) { uid += 1; return p + "-" + uid; }
var PX = ""; /* per-render id prefix, set in render() */
var REDUCE = (typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches) || false;

/* palette — original character: warm skin, teal athletic wear, dark hair */
var SKIN = "#e2ab7d", TEAL = "#2f9e93", TEAL_D = "#1e6a63",
    HAIR = "#26262e", SHOE = "#3b4048",
    NODE = "#7fe6a0", VESSEL = "#63d694", HALO = "#a9f2c4";

/* ------------------------------------------------------------------ */
/* SMIL helpers (omitted entirely under prefers-reduced-motion)          */
/* ------------------------------------------------------------------ */
function rot(keys, cx, cy, dur, extra) {
  if (REDUCE) return "";
  var v = keys.map(function (a) { return a + " " + cx + " " + cy; }).join(";");
  return '<animateTransform attributeName="transform" type="rotate" values="' + v + '"' +
    ' keyTimes="0;.5;1" dur="' + dur + '" repeatCount="indefinite"' +
    (extra ? " " + extra : "") + "/>";
}
function slide(keys, dur, extra) {
  if (REDUCE) return "";
  return '<animateTransform attributeName="transform" type="translate" values="' + keys.join(";") + '"' +
    ' keyTimes="0;.5;1" dur="' + dur + '" repeatCount="indefinite"' +
    (extra ? " " + extra : "") + "/>";
}
function pulseR(from, to, dur, extra) {
  if (REDUCE) return "";
  return '<animate attributeName="r" values="' + from + ";" + to + ";" + from + '"' +
    ' keyTimes="0;.5;1" dur="' + dur + '" repeatCount="indefinite"' +
    (extra ? " " + extra : "") + "/>" +
    '<animate attributeName="opacity" values=".85;0;.85" keyTimes="0;.5;1" dur="' + dur +
    '" repeatCount="indefinite"' + (extra ? " " + extra : "") + "/>";
}
function flow(path, dur, extra) {
  if (REDUCE) return "";
  return '<circle r="2.6" fill="#e6fff0" opacity=".9"><animateMotion dur="' + dur +
    '" repeatCount="indefinite" path="' + path + '"' + (extra ? " " + extra : "") + "/></circle>";
}

/* ------------------------------------------------------------------ */
/* shared defs (gradient ids are per-instance)                          */
/* ------------------------------------------------------------------ */
function defs(gS, gT, gP, gH, gN) {
  return "<defs>" +
    '<linearGradient id="' + gS + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#eec49b"/><stop offset="1" stop-color="#d2966a"/></linearGradient>' +
    '<linearGradient id="' + gT + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#3cab9f"/><stop offset="1" stop-color="#22746c"/></linearGradient>' +
    '<linearGradient id="' + gP + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#37a094"/><stop offset="1" stop-color="#1e6a63"/></linearGradient>' +
    '<linearGradient id="' + gH + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#3c3c46"/><stop offset="1" stop-color="#1e1e26"/></linearGradient>' +
    '<radialGradient id="' + gN + '" cx=".5" cy=".4" r=".7">' +
    '<stop offset="0" stop-color="#c4f7d8"/><stop offset="1" stop-color="#5fd68f"/></radialGradient>' +
    "</defs>";
}

/* ------------------------------------------------------------------ */
/* joint wrapper: animated (SMIL) or statically posed                   */
/* ------------------------------------------------------------------ */
function joint(id, pivot, anim, inner, poseAngle) {
  var t = (poseAngle === undefined || poseAngle === null) ? "" :
    ' transform="rotate(' + poseAngle.toFixed(1) + " " + pivot[0] + " " + pivot[1] + ')"';
  return '<g id="' + id + PX + '"' + t + ">" + anim + inner + "</g>";
}

/* ------------------------------------------------------------------ */
/* FRONT VIEW — articulated figure, neutral pose, viewBox 0 0 200 340    */
/* ------------------------------------------------------------------ */
function frontFigure(gS, gT, gP, gH, cfg, pose) {
  function J(name, pivot, keys, inner, phase) {
    var anim = keys ? rot(keys, pivot[0], pivot[1], cfg.dur,
      phase ? 'begin="' + phase + '"' : "") : "";
    var ang = pose ? poseAngle(cfg, name, pose.t) : null;
    return joint("j-" + name, pivot, anim, inner, ang);
  }
  var skin = "url(#" + gS + ")", top = "url(#" + gT + ")",
      pants = "url(#" + gP + ")", hair = "url(#" + gH + ")";

  /* head + face */
  var headInner =
    '<ellipse cx="100" cy="28" rx="18" ry="14" fill="' + hair + '"/>' +
    '<ellipse cx="100" cy="37" rx="16" ry="20" fill="' + skin + '"/>' +
    '<ellipse cx="84" cy="39" rx="3" ry="4.5" fill="' + skin + '"/>' +
    '<ellipse cx="116" cy="39" rx="3" ry="4.5" fill="' + skin + '"/>' +
    '<path d="M82,36 C82,20 90,12 100,12 C110,12 118,20 118,36 C114,26 110,24 100,24 C90,24 86,26 82,36 Z" fill="' + hair + '"/>' +
    '<path d="M90,32 l7,1 M103,33 l7,-1" stroke="#5a4632" stroke-width="1.2" opacity=".6" fill="none"/>' +
    '<path d="M91,37 q3.5,2.5 7,0 M102,37 q3.5,2.5 7,0" stroke="#4a3826" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M100,38 q-1.5,5 -3,7 q2,1.5 4,1" stroke="#b57e52" stroke-width="1.2" fill="none" opacity=".7" stroke-linecap="round"/>' +
    '<path d="M95,50 q5,3 10,0" stroke="#a06a4a" stroke-width="1.4" fill="none" opacity=".8" stroke-linecap="round"/>';
  var head = J("head", [100, 58], cfg.joints.head, headInner, cfg.phase && cfg.phase.head);

  /* arms — lymph vessel segments ride inside the joints so they follow the limb */
  function arm(side) { /* side: -1 left, +1 right */
    var sx = side < 0 ? 74 : 126, nm = side < 0 ? "L" : "R";
    var shK = side < 0 ? cfg.joints.shL : cfg.joints.shR;
    var elK = side < 0 ? cfg.joints.elL : cfg.joints.elR;
    var ph = cfg.phase || {};
    var vv = function (d) {
      return '<path class="lymphv" d="' + d + '" stroke="' + VESSEL +
        '" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>';
    };
    var handInner =
      '<ellipse cx="' + sx + '" cy="170" rx="6.5" ry="9" fill="' + skin + '"/>';
    var foreInner =
      '<circle cx="' + sx + '" cy="126" r="8" fill="' + top + '"/>' +
      vv("M" + sx + ",130 L" + sx + ",158") +
      '<path d="M' + (sx - 7) + ',128 L' + (sx + 7) + ',128 L' + (sx + 4) + ',162 Q' + sx + ',165 ' + (sx - 4) + ',162 Z" fill="' + top + '"/>' +
      handInner;
    var fore = J("el" + nm, [sx, 126], elK, foreInner, side < 0 ? ph.elL : ph.elR);
    var upperInner =
      '<circle cx="' + sx + '" cy="78" r="10.5" fill="' + top + '"/>' +
      vv("M" + sx + ",88 L" + sx + ",120") +
      '<path d="M' + (sx - 9) + ',80 L' + (sx + 9) + ',80 L' + (sx + 6) + ',124 Q' + sx + ',128 ' + (sx - 6) + ',124 Z" fill="' + top + '"/>' +
      fore;
    return J("sh" + nm, [sx, 78], shK, upperInner, side < 0 ? ph.shL : ph.shR);
  }

  /* torso (carries head + arms so leans move everything above the hips) */
  var torsoInner =
    '<path d="M92,48 L108,48 L106,68 L94,68 Z" fill="' + skin + '"/>' +
    '<path d="M64,80 C66,70 74,66 84,66 L116,66 C126,66 134,70 136,80 L132,132 C130,148 126,158 120,166 L80,166 C74,158 70,148 68,132 Z" fill="' + top + '"/>' +
    '<ellipse cx="100" cy="100" rx="20" ry="30" fill="#ffffff" opacity=".08"/>' +
    '<rect x="68" y="150" width="64" height="8" fill="' + TEAL_D + '" opacity=".55"/>' +
    head + arm(-1) + arm(1);
  var torso = J("torso", [100, 166], cfg.joints.torso, torsoInner, cfg.phase && cfg.phase.torso);

  /* legs — lymph vessel segments ride inside the joints so they follow the limb */
  function leg(side) {
    var hx = side < 0 ? 88 : 112, nm = side < 0 ? "L" : "R";
    var hipK = side < 0 ? cfg.joints.hipL : cfg.joints.hipR;
    var kneeK = side < 0 ? cfg.joints.kneeL : cfg.joints.kneeR;
    var ph = cfg.phase || {};
    var vv = function (d) {
      return '<path class="lymphv" d="' + d + '" stroke="' + VESSEL +
        '" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>';
    };
    var shinInner =
      '<circle cx="' + hx + '" cy="240" r="8.5" fill="' + pants + '"/>' +
      vv("M" + hx + ",244 L" + hx + ",288") +
      '<path d="M' + (hx - 8) + ',242 L' + (hx + 8) + ',242 L' + (hx + 4) + ',294 Q' + hx + ',297 ' + (hx - 4) + ',294 Z" fill="' + pants + '"/>' +
      '<path d="M' + (hx - 9) + ',294 L' + (hx + 9) + ',294 L' + (hx + 11) + ',308 Q' + hx + ',313 ' + (hx - 11) + ',308 Z" fill="' + SHOE + '"/>' +
      '<rect x="' + (hx - 11) + '" y="306" width="22" height="3" rx="1.5" fill="#22262c"/>';
    var shin = J("knee" + nm, [hx, 240], kneeK, shinInner, side < 0 ? ph.kneeL : ph.kneeR);
    var thighInner =
      '<circle cx="' + hx + '" cy="170" r="11" fill="' + pants + '"/>' +
      vv("M" + hx + ",178 L" + hx + ",234") +
      '<path d="M' + (hx - 11) + ',172 L' + (hx + 11) + ',172 L' + (hx + 7) + ',238 Q' + hx + ',242 ' + (hx - 7) + ',238 Z" fill="' + pants + '"/>' +
      shin;
    return J("hip" + nm, [hx, 170], hipK, thighInner, side < 0 ? ph.hipL : ph.hipR);
  }

  var bodyAnim = cfg.body ? slide(cfg.body, cfg.dur, "") : "";
  var bodyPose = (pose && cfg.body) ?
    ' transform="translate(' + poseBody(cfg, pose.t).join(" ") + ')"' : "";
  return '<g id="body' + PX + '"' + bodyPose + ">" + bodyAnim +
    '<path d="M70,150 L130,150 L126,178 L74,178 Z" fill="' + pants + '"/>' +
    leg(-1) + leg(1) + torso +
    "</g>";
}

/* ------------------------------------------------------------------ */
/* FACE VIEW — close-up for sinus steps, viewBox 0 0 200 210             */
/* ------------------------------------------------------------------ */
function faceFigure(gS, gT, gH, gN, cfg, pose) {
  var skin = "url(#" + gS + ")", top = "url(#" + gT + ")",
      hair = "url(#" + gH + ")", node = "url(#" + gN + ")";
  var tilt = cfg.joints && cfg.joints.headF ?
    rot(cfg.joints.headF, 100, 110, cfg.dur, "") : "";
  var tiltPose = (pose && cfg.joints && cfg.joints.headF) ?
    ' transform="rotate(' + poseAngle(cfg, "headF", pose.t).toFixed(1) + ' 100 110)"' : "";

  var tapRings = "";
  if (cfg.tapping && !REDUCE) {
    [[74, 166], [126, 166]].forEach(function (p, i) {
      tapRings += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="none" stroke="' + HALO +
        '" stroke-width="2.5">' + pulseR(5, 12, "1.2s", i ? 'begin="-.6s"' : "") + "</circle>";
    });
  }
  var tapDots = [[74, 166], [126, 166]].map(function (p) {
    return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="' + node + '"/>';
  }).join("");

  var headInner =
    '<ellipse cx="100" cy="44" rx="40" ry="26" fill="' + hair + '"/>' +
    '<ellipse cx="100" cy="66" rx="37" ry="46" fill="' + skin + '"/>' +
    '<ellipse cx="63" cy="68" rx="4" ry="7" fill="' + skin + '"/>' +
    '<ellipse cx="137" cy="68" rx="4" ry="7" fill="' + skin + '"/>' +
    '<path d="M60,64 C60,32 76,20 100,20 C124,20 140,32 140,64 C134,46 128,40 122,42 C124,52 122,60 118,66 C114,50 108,44 100,44 C92,44 86,50 82,66 C78,60 76,52 78,42 C72,40 66,46 60,64 Z" fill="' + hair + '"/>' +
    '<path d="M78,58 l12,2 M110,60 l12,-2" stroke="#4a3a28" stroke-width="2" opacity=".55" fill="none" stroke-linecap="round"/>' +
    '<path d="M80,66 q6,4 12,0 M108,66 q6,4 12,0" stroke="#3d2f20" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M100,66 q-3,10 -6,15 q4,3 8,2" stroke="#b57e52" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/>' +
    '<path d="M90,96 q10,5 20,0" stroke="#a06a4a" stroke-width="2" fill="none" opacity=".85" stroke-linecap="round"/>';
  var head = '<g id="j-headF' + PX + '"' + tiltPose + ">" + tilt + headInner + "</g>";

  var cerv = [[88, 116], [112, 116], [86, 130], [114, 130]].map(function (p) {
    return nodeDot(p[0], p[1], 3, node, ("cerv" + p[0]) , cfg);
  }).join("");

  return head +
    '<path d="M88,112 L112,112 L110,162 L90,162 Z" fill="' + skin + '"/>' +
    '<path d="M70,58 C76,90 82,120 88,150 M130,58 C124,90 118,120 112,150" stroke="#b57e52" stroke-width="2" opacity=".3" fill="none"/>' +
    cerv +
    '<path d="M38,210 C46,176 64,162 100,160 C136,162 154,176 162,210 Z" fill="' + top + '"/>' +
    '<path d="M72,172 L94,167 M106,167 L128,172" stroke="#1e6a63" stroke-width="1.5" opacity=".5" fill="none"/>' +
    tapDots + tapRings;
}

/* ------------------------------------------------------------------ */
/* LYMPHATIC overlay — front view                                        */
/* ------------------------------------------------------------------ */
var VESSELS = {
  thoracic: "M100,152 C100,124 97,102 93,86 C91,78 89,73 87,70",
  ductR:    "M100,152 C103,132 107,112 111,94 C113,85 114,77 115,71",
  neckL:    "M91,44 C89,54 87,62 85,69",
  neckR:    "M109,44 C111,54 113,62 115,69"
  /* limb vessels are drawn inside the arm/leg joint groups so they follow */
};
var NODES = [
  ["cervL", 90, 50, 3], ["cervR", 110, 50, 3],
  ["scL", 84, 70, 3.5], ["scR", 116, 70, 3.5],
  ["axL", 68, 90, 4], ["axR", 132, 90, 4],
  ["abd1", 93, 134, 3], ["abd2", 107, 134, 3], ["abd3", 100, 146, 3],
  ["ingL", 86, 180, 4], ["ingR", 114, 180, 4],
  ["popL", 79, 240, 3], ["popR", 121, 240, 3]
];
function nodeDot(x, y, r, nodeFill, id, cfg) {
  var hot = cfg.nodes && cfg.nodes.indexOf(id) !== -1;
  var halo = hot && !REDUCE ?
    '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 2) + '" fill="none" stroke="' + HALO +
    '" stroke-width="2">' + pulseR(r + 2, r + 7, "2s", "") + "</circle>" : "";
  return halo + '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + nodeFill +
    '" stroke="#3f9e63" stroke-width="1"/>';
}
function buildLymphatic(gN, cfg /*, pose */) {
  var nodeFill = "url(#" + gN + ")";
  var paths = Object.keys(VESSELS).map(function (k) {
    return '<path d="' + VESSELS[k] + '" stroke="' + VESSEL +
      '" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>';
  }).join("");
  var dots = NODES.map(function (n) {
    return nodeDot(n[1], n[2], n[3], nodeFill, n[0], cfg);
  }).join("");
  var flows = REDUCE ? "" :
    flow(VESSELS.thoracic, "4.5s", "") +
    flow(VESSELS.neckL, "3.5s", 'begin="-1.2s"');
  return '<g id="lymphatic' + PX + '" opacity=".95">' + paths + flows + dots + "</g>";
}

/* ------------------------------------------------------------------ */
/* pose math (for svgStatic previews)                                   */
/* ------------------------------------------------------------------ */
function durSecs(cfg) { return parseFloat(cfg.dur) || 4; }
function poseAngle(cfg, name, t) {
  var keys = cfg.joints[name];
  if (!keys) return 0;
  var d = durSecs(cfg), off = 0;
  if (cfg.phase && cfg.phase[name]) off = parseFloat(cfg.phase[name]) || 0;
  var u = (((t + off) % d) + d) % d / d; /* 0..1 */
  var k = keys;
  if (u < 0.5) { var f = u / 0.5; return k[0] + (k[1] - k[0]) * f; }
  var f2 = (u - 0.5) / 0.5; return k[1] + (k[2] - k[1]) * f2;
}
function poseBody(cfg, t) {
  if (!cfg.body) return [0, 0];
  var d = durSecs(cfg), u = (((t % d) + d) % d) / d;
  function pt(s) { var p = s.split(" "); return [parseFloat(p[0]), parseFloat(p[1])]; }
  var a = pt(cfg.body[0]), b = pt(cfg.body[1]), c = pt(cfg.body[2]), p;
  if (u < 0.5) { var f = u / 0.5; p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
  else { var g = (u - 0.5) / 0.5; p = [b[0] + (c[0] - b[0]) * g, b[1] + (c[1] - b[1]) * g]; }
  return p;
}

/* ------------------------------------------------------------------ */
/* move configs — Phase 1 sample set                                    */
/* ------------------------------------------------------------------ */
var MOVES = {
  "arm-sweep": {
    label: "Deep 360 Breathing with Arm Sweeps", view: "front", dur: "8s",
    joints: {
      head: [-6, 6, -6], torso: [-3, 3, -3],
      shL: [-8, 135, -8], shR: [8, -135, 8],
      elL: [5, 22, 5], elR: [-5, -22, -5]
    },
    nodes: ["axL", "axR", "scL", "scR", "cervL", "cervR"]
  },
  "knee-arm": {
    label: "Knee Lifts with Opposite Arm Pull-Down", view: "front", dur: "4s",
    joints: {
      head: [-4, 4, -4],
      hipL: [0, 70, 0], kneeL: [5, -55, 5],
      hipR: [0, -70, 0], kneeR: [5, 55, 5],
      shL: [120, 20, 120], shR: [-120, -20, -120],
      elL: [25, 45, 25], elR: [-25, -45, -25]
    },
    phase: { hipR: "-2s", kneeR: "-2s", shL: "-2s", elL: "-2s" },
    body: ["0 0", "0 7", "0 0"],
    nodes: ["ingL", "ingR", "axL", "axR", "popL", "popR"]
  },
  "collarbone": {
    label: "The Collarbone Pump", view: "face", dur: "6s",
    joints: { headF: [-4, 4, -4] },
    tapping: true,
    nodes: ["cerv88", "cerv112", "cerv86", "cerv114"]
  }
};

/* ------------------------------------------------------------------ */
/* render                                                               */
/* ------------------------------------------------------------------ */
function render(key, t) {
  var cfg = MOVES[key];
  if (!cfg) return "";
  var gS = nid("gS"), gT = nid("gT"), gP = nid("gP"), gH = nid("gH"), gN = nid("gN");
  PX = "-i" + uid;
  var pose = (t === undefined || t === null) ? null : { t: t };
  var vb = cfg.view === "face" ? "0 0 200 210" : "0 0 200 340";
  var inner = cfg.view === "face" ?
    faceFigure(gS, gT, gH, gN, cfg, pose) :
    frontFigure(gS, gT, gP, gH, cfg, pose);
  var layers = "";
  (cfg.layers || DEFAULT_LAYERS).forEach(function (l) {
    if (LAYERS[l] && cfg.view === "front") layers += LAYERS[l].build(gN, cfg, pose);
  });
  /* overlay goes inside the body group so it follows whole-body motion */
  if (layers && cfg.view === "front") inner = inner.replace(/<\/g>\s*$/, layers + "</g>");
  return '<svg viewBox="' + vb + '" role="img" aria-label="' + cfg.label +
    ' demonstration" xmlns="http://www.w3.org/2000/svg">' +
    defs(gS, gT, gP, gH, gN) + inner + "</svg>";
}

function fill(root) {
  (root || (typeof document !== "undefined" ? document : null)) &&
  root.querySelectorAll("[data-hmove]").forEach(function (el) {
    el.innerHTML = render(el.getAttribute("data-hmove"));
    if (REDUCE) { var s = el.querySelector("svg"); if (s && s.pauseAnimations) s.pauseAnimations(); }
  });
}

return {
  svg: function (key) { return render(key); },
  svgStatic: function (key, t) { return render(key, t); },
  fill: fill,
  types: Object.keys(MOVES),
  _poseAngle: poseAngle /* exposed for tests */
};
})();
