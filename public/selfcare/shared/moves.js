/* SCMoves — original animated movement figures for the self-care routines.
   Pure inline SVG + SMIL: no files, no third-party requests, works offline.
   Usage: SCMoves.svg("neck-roll") -> svg string; SCMoves.fill(root) fills [data-move] slots. */
"use strict";
window.SCMoves = (function () {
  var V = "#b39dff", G = "#d9a94a";
  var SW = 'fill="none" stroke="' + V + '" stroke-width="4" stroke-linecap="round"';
  var INF = 'repeatCount="indefinite"';

  function rot(values, cx, cy, dur, extra) {
    return '<animateTransform attributeName="transform" type="rotate" values="' + values +
      '" keyTimes="0;.5;1" dur="' + dur + '" ' + INF + (extra || "") + "/>";
  }
  function spin(from, to, cx, cy, dur, extra) {
    return '<animateTransform attributeName="transform" type="rotate" from="' + from + " " + cx + " " + cy +
      '" to="' + to + " " + cx + " " + cy + '" dur="' + dur + '" ' + INF + (extra || "") + "/>";
  }
  function slide(values, dur, extra) {
    return '<animateTransform attributeName="transform" type="translate" values="' + values +
      '" keyTimes="0;.5;1" dur="' + dur + '" ' + INF + (extra || "") + "/>";
  }

  var M = {
    /* head orbits around the neck — neck rolls */
    "neck-roll":
      '<g ' + SW + '><line x1="60" y1="54" x2="60" y2="98"/><line x1="60" y1="64" x2="40" y2="80"/>' +
      '<line x1="60" y1="64" x2="80" y2="80"/><line x1="60" y1="98" x2="50" y2="114"/><line x1="60" y1="98" x2="70" y2="114"/></g>' +
      '<g>' + spin(0, 360, 60, 46, "4s") + '<circle cx="60" cy="33" r="11" fill="' + V + '"/></g>',

    /* dots orbit the shoulders — shoulder rolls */
    "shoulder-roll":
      '<g ' + SW + '><line x1="60" y1="52" x2="60" y2="98"/><circle cx="60" cy="38" r="11" fill="' + V + '" stroke="none"/>' +
      '<line x1="60" y1="98" x2="50" y2="114"/><line x1="60" y1="98" x2="70" y2="114"/>' +
      '<line x1="44" y1="58" x2="34" y2="82"/><line x1="76" y1="58" x2="86" y2="82"/></g>' +
      '<g>' + spin(0, 360, 44, 58, "2.6s") + '<circle cx="44" cy="50" r="5" fill="' + G + '"/></g>' +
      '<g>' + spin(0, 360, 76, 58, "2.6s") + '<circle cx="76" cy="50" r="5" fill="' + G + '"/></g>',

    /* arms sweep open wide and back — chest openers */
    "chest-open":
      '<g ' + SW + '><line x1="60" y1="52" x2="60" y2="98"/><circle cx="60" cy="38" r="11" fill="' + V + '" stroke="none"/>' +
      '<line x1="60" y1="98" x2="50" y2="114"/><line x1="60" y1="98" x2="70" y2="114"/></g>' +
      '<g>' + rot("20 46 60;-55 46 60;20 46 60", 0, 0, "5s") +
      '<line x1="46" y1="60" x2="56" y2="90" stroke="' + G + '" stroke-width="4" stroke-linecap="round"/></g>' +
      '<g>' + rot("-20 74 60;55 74 60;-20 74 60", 0, 0, "5s") +
      '<line x1="74" y1="60" x2="64" y2="90" stroke="' + G + '" stroke-width="4" stroke-linecap="round"/></g>',

    /* torso leans side to side, arm arcs overhead — ballerina stretch */
    "side-stretch":
      '<g><line x1="60" y1="98" x2="50" y2="114" ' + SW + '/><line x1="60" y1="98" x2="70" y2="114" ' + SW + '/></g>' +
      '<g>' + rot("-14 60 98;14 60 98;-14 60 98", 0, 0, "6s") +
      '<g ' + SW + '><line x1="60" y1="98" x2="60" y2="54"/></g>' +
      '<circle cx="60" cy="41" r="11" fill="' + V + '"/>' +
      '<line x1="64" y1="58" x2="64" y2="22" stroke="' + G + '" stroke-width="4" stroke-linecap="round"/></g>',

    /* torso folds forward and rolls back up — forward body rolls */
    "forward-roll":
      '<g ' + SW + '><line x1="60" y1="88" x2="60" y2="112"/></g>' +
      '<g>' + rot("0 60 88;78 60 88;0 60 88", 0, 0, "6s") +
      '<g ' + SW + '><line x1="60" y1="88" x2="60" y2="50"/><line x1="60" y1="62" x2="60" y2="84"/></g>' +
      '<circle cx="60" cy="38" r="11" fill="' + V + '"/></g>',

    /* arms swing side to side around the spine — trunk rotation / washing machine */
    "trunk-twist":
      '<g ' + SW + '><line x1="60" y1="72" x2="60" y2="112"/><circle cx="60" cy="42" r="11" fill="' + V + '" stroke="none"/>' +
      '<line x1="60" y1="72" x2="50" y2="112"/><line x1="60" y1="72" x2="70" y2="112"/></g>' +
      '<g>' + rot("-32 60 62;32 60 62;-32 60 62", 0, 0, "4s") +
      '<line x1="28" y1="62" x2="92" y2="62" stroke="' + G + '" stroke-width="4" stroke-linecap="round"/></g>',

    /* side view: hips lift into a bridge and lower */
    "bridge":
      '<circle cx="14" cy="86" r="9" fill="' + V + '"/>' +
      '<polyline ' + SW + ' points="22,90 60,90 84,90 104,90">' +
      '<animate attributeName="points" values="22,90 60,90 84,90 104,90;22,86 60,64 84,78 104,90;22,90 60,90 84,90 104,90" ' +
      'keyTimes="0;.5;1" dur="4.5s" ' + INF + '/></polyline>',

    /* lying: knees lift alternately toward the chest */
    "knee-chest":
      '<g ' + SW + '><line x1="18" y1="82" x2="70" y2="82"/><circle cx="12" cy="78" r="8" fill="' + V + '" stroke="none"/></g>' +
      '<g>' + rot("0 70 82;-72 70 82;0 70 82", 0, 0, "4s") +
      '<line x1="70" y1="82" x2="102" y2="82" stroke="' + G + '" stroke-width="4" stroke-linecap="round"/></g>' +
      '<g>' + rot("0 70 82;-72 70 82;0 70 82", 0, 0, "4s", ' begin="-2s"') +
      '<line x1="70" y1="82" x2="102" y2="82" stroke="' + V + '" stroke-width="4" stroke-linecap="round" opacity=".55"/></g>',

    /* seated: lower leg swings up (straighten) and back — hamstring floss */
    "leg-floss":
      '<g ' + SW + '><line x1="52" y1="82" x2="52" y2="46"/><circle cx="52" cy="34" r="10" fill="' + V + '" stroke="none"/>' +
      '<line x1="52" y1="82" x2="84" y2="82"/></g>' +
      '<g>' + rot("0 84 82;-78 84 82;0 84 82", 0, 0, "4s") +
      '<line x1="84" y1="82" x2="84" y2="110" stroke="' + G + '" stroke-width="4" stroke-linecap="round"/></g>',

    /* belly swells and settles — diaphragmatic breathing */
    "belly-breathe":
      '<g ' + SW + '><line x1="60" y1="30" x2="60" y2="52"/><circle cx="60" cy="20" r="10" fill="' + V + '" stroke="none"/>' +
      '<line x1="44" y1="40" x2="76" y2="40"/></g>' +
      '<ellipse cx="60" cy="76" rx="15" ry="13" fill="none" stroke="' + G + '" stroke-width="4">' +
      '<animate attributeName="rx" values="13;23;13" keyTimes="0;.5;1" dur="6s" ' + INF + '/>' +
      '<animate attributeName="ry" values="11;18;11" keyTimes="0;.5;1" dur="6s" ' + INF + '/></ellipse>',

    /* whole body rises onto the toes and settles — calf raises */
    "calf-raise":
      '<line x1="20" y1="112" x2="100" y2="112" stroke="' + V + '" stroke-width="3" stroke-linecap="round" opacity=".5"/>' +
      '<g>' + slide("0 6;0 -8;0 6", "2.4s") +
      '<g ' + SW + '><line x1="60" y1="52" x2="60" y2="94"/><line x1="60" y1="94" x2="52" y2="108"/><line x1="60" y1="94" x2="68" y2="108"/>' +
      '<line x1="60" y1="62" x2="42" y2="78"/><line x1="60" y1="62" x2="78" y2="78"/></g>' +
      '<circle cx="60" cy="40" r="11" fill="' + V + '"/></g>',

    /* hinge forward at the hips and return — good mornings */
    "good-morning":
      '<g ' + SW + '><line x1="60" y1="84" x2="60" y2="112"/></g>' +
      '<g>' + rot("0 60 84;62 60 84;0 60 84", 0, 0, "5s") +
      '<g ' + SW + '><line x1="60" y1="84" x2="60" y2="50"/><line x1="60" y1="60" x2="78" y2="72"/></g>' +
      '<circle cx="60" cy="38" r="11" fill="' + V + '"/></g>',

    /* knee drives up while the opposite arm pulls down */
    "knee-arm":
      '<g ' + SW + '><line x1="60" y1="50" x2="60" y2="86"/><circle cx="60" cy="38" r="11" fill="' + V + '" stroke="none"/>' +
      '<line x1="60" y1="86" x2="52" y2="112"/></g>' +
      '<g>' + rot("0 60 86;-78 60 86;0 60 86", 0, 0, "3s") +
      '<line x1="60" y1="86" x2="60" y2="110" stroke="' + G + '" stroke-width="4" stroke-linecap="round"/></g>' +
      '<g>' + rot("0 60 58;38 60 58;0 60 58", 0, 0, "3s") +
      '<line x1="60" y1="58" x2="80" y2="74" stroke="' + G + '" stroke-width="4" stroke-linecap="round"/></g>',

    /* light whole-body bounce */
    "bounce":
      '<g>' + slide("0 0;0 -8;0 0", "0.9s") +
      '<g ' + SW + '><line x1="60" y1="52" x2="60" y2="94"/><line x1="60" y1="94" x2="50" y2="110"/><line x1="60" y1="94" x2="70" y2="110"/>' +
      '<line x1="60" y1="62" x2="44" y2="76"/><line x1="60" y1="62" x2="76" y2="76"/></g>' +
      '<circle cx="60" cy="40" r="11" fill="' + V + '"/></g>',

    /* fingertips pulse at the collarbone hollows */
    "collarbone":
      '<g ' + SW + '><line x1="60" y1="56" x2="60" y2="100"/><circle cx="60" cy="34" r="12" fill="' + V + '" stroke="none"/>' +
      '<line x1="36" y1="60" x2="84" y2="60"/></g>' +
      '<circle cx="48" cy="62" r="4.5" fill="' + G + '"><animate attributeName="cy" values="60;70;60" keyTimes="0;.5;1" dur="1.6s" ' + INF + '/></circle>' +
      '<circle cx="72" cy="62" r="4.5" fill="' + G + '"><animate attributeName="cy" values="60;70;60" keyTimes="0;.5;1" dur="1.6s" ' + INF + ' begin="-0.8s"/></circle>',

    /* arms in cactus open and close — chest opener */
    "cactus":
      '<g ' + SW + '><line x1="60" y1="54" x2="60" y2="100"/><circle cx="60" cy="40" r="11" fill="' + V + '" stroke="none"/>' +
      '<line x1="60" y1="100" x2="50" y2="114"/><line x1="60" y1="100" x2="70" y2="114"/></g>' +
      '<g>' + rot("0 46 62;-22 46 62;0 46 62", 0, 0, "4.5s") +
      '<g stroke="' + G + '" stroke-width="4" stroke-linecap="round" fill="none"><line x1="46" y1="62" x2="32" y2="70"/><line x1="32" y1="70" x2="32" y2="48"/></g></g>' +
      '<g>' + rot("0 74 62;22 74 62;0 74 62", 0, 0, "4.5s") +
      '<g stroke="' + G + '" stroke-width="4" stroke-linecap="round" fill="none"><line x1="74" y1="62" x2="88" y2="70"/><line x1="88" y1="70" x2="88" y2="48"/></g></g>',

    /* all fours: spine sags and arches — cat-cow */
    "cat-cow":
      '<g ' + SW + '><line x1="34" y1="74" x2="34" y2="106"/><line x1="86" y1="74" x2="86" y2="106"/></g>' +
      '<polyline ' + SW + ' points="30,72 60,68 90,72">' +
      '<animate attributeName="points" values="30,76 60,82 90,76;30,64 60,58 90,64;30,76 60,82 90,76" ' +
      'keyTimes="0;.5;1" dur="6s" ' + INF + '/></polyline>' +
      '<circle cx="20" cy="70" r="9" fill="' + V + '">' +
      '<animate attributeName="cy" values="74;62;74" keyTimes="0;.5;1" dur="6s" ' + INF + '/></circle>',

    /* head tilts ear-to-shoulder, fingertip strokes down the neck — SCM */
    "neck-tilt":
      '<g ' + SW + '><line x1="60" y1="56" x2="60" y2="100"/><line x1="60" y1="64" x2="42" y2="80"/>' +
      '<line x1="60" y1="100" x2="52" y2="114"/><line x1="60" y1="100" x2="68" y2="114"/></g>' +
      '<g>' + rot("-20 60 44;20 60 44;-20 60 44", 0, 0, "6s") +
      '<circle cx="60" cy="32" r="11" fill="' + V + '"/></g>' +
      '<circle cx="74" cy="50" r="4.5" fill="' + G + '">' +
      '<animate attributeName="cy" values="46;74;46" keyTimes="0;.5;1" dur="6s" ' + INF + '/></circle>',

    /* arms sweep up overhead and float back down — breathing with arm sweeps */
    "arm-sweep":
      '<g ' + SW + '><line x1="60" y1="54" x2="60" y2="100"/><circle cx="60" cy="40" r="11" fill="' + V + '" stroke="none"/>' +
      '<line x1="60" y1="100" x2="50" y2="114"/><line x1="60" y1="100" x2="70" y2="114"/></g>' +
      '<g>' + slide("0 16;0 -26;0 16", "7s") +
      '<g stroke="' + G + '" stroke-width="4" stroke-linecap="round"><line x1="46" y1="62" x2="30" y2="78"/><line x1="74" y1="62" x2="90" y2="78"/></g></g>' +
      '<ellipse cx="60" cy="76" rx="14" ry="12" fill="none" stroke="' + V + '" stroke-width="3" opacity=".6">' +
      '<animate attributeName="rx" values="12;20;12" keyTimes="0;.5;1" dur="7s" ' + INF + '/></ellipse>'
  };

  function svg(type) {
    if (!M[type]) return "";
    return '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">' + M[type] + "</svg>";
  }
  function fill(root) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (root || document).querySelectorAll("[data-move]").forEach(function (el) {
      el.innerHTML = svg(el.getAttribute("data-move"));
      if (reduce) {
        var s = el.querySelector("svg");
        if (s && s.pauseAnimations) s.pauseAnimations();
      }
    });
  }
  return { svg: svg, fill: fill, types: Object.keys(M) };
})();
