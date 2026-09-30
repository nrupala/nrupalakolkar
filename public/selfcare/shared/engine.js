/* Self-care shared session engine — same-origin, zero third-party requests.
   Chimes, screen wake lock, live tone/binaural drone (Web Audio), practice log (localStorage). */
"use strict";
window.SC = (function () {
  var LS_LOG = "selfcare-log-v1";

  /* ---------- audio context (created on user gesture) ---------- */
  var actx = null;
  function ac() {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function blip(freq, delay, dur, vol, type) {
    try {
      var c = ac(), o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      var t = c.currentTime + (delay || 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.1);
    } catch (e) {}
  }
  function chime() { blip(660, 0, 0.5, 0.16); blip(880, 0.14, 0.8, 0.13); }
  function bell() { blip(528, 0, 2.8, 0.18); blip(1056, 0, 2.2, 0.05); }
  function tick() { blip(440, 0, 0.12, 0.08); }

  /* ---------- screen wake lock ---------- */
  var wl = null;
  function lock() {
    if ("wakeLock" in navigator) {
      try {
        navigator.wakeLock.request("screen").then(function (w) { wl = w; }).catch(function () {});
      } catch (e) {}
    }
  }
  function unlock() {
    if (wl) { try { wl.release().catch(function () {}); } catch (e) {} wl = null; }
  }

  /* ---------- practice log (localStorage, on-device only) ---------- */
  function read() {
    try { return JSON.parse(localStorage.getItem(LS_LOG)) || []; }
    catch (e) { return []; }
  }
  function write(a) {
    try { localStorage.setItem(LS_LOG, JSON.stringify(a)); } catch (e) {}
  }
  function saveSession(s) {
    var a = read();
    s.ts = s.ts || Date.now();
    s.id = "s" + s.ts + Math.floor(Math.random() * 10000);
    a.push(s); write(a);
    return s.id;
  }
  function updateNote(id, note) {
    var a = read();
    for (var i = 0; i < a.length; i++) {
      if (a[i].id === id) { a[i].note = note; break; }
    }
    write(a);
  }
  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function stats() {
    var a = read(), minutes = 0, days = {};
    a.forEach(function (s) { minutes += (s.minutes || 0); days[dayKey(s.ts)] = 1; });
    var dayList = Object.keys(days).sort();
    var streak = 0, cursor = new Date();
    var fmt = function (d) {
      return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    };
    if (days[fmt(cursor)] || days[fmt(new Date(cursor.getTime() - 864e5))]) {
      if (!days[fmt(cursor)]) cursor = new Date(cursor.getTime() - 864e5);
      while (days[fmt(cursor)]) { streak++; cursor = new Date(cursor.getTime() - 864e5); }
    }
    return { sessions: a.length, minutes: Math.round(minutes), days: dayList.length, streak: streak };
  }

  /* ---------- live drone: pure tone or binaural beats ---------- */
  var drone = null;
  function startDrone(opts) {
    stopDrone(0);
    var c = ac();
    var g = c.createGain();
    g.gain.value = 0.0001;
    var t = c.currentTime, fadeIn = (opts.fadeIn == null ? 8 : opts.fadeIn);
    g.gain.linearRampToValueAtTime(Math.max(0.001, opts.volume || 0.15), t + fadeIn);
    var nodes = [g];
    if (opts.kind === "binaural") {
      var merger = c.createChannelMerger(2);
      var oL = c.createOscillator(), oR = c.createOscillator();
      var gL = c.createGain(), gR = c.createGain();
      oL.type = "sine"; oR.type = "sine";
      oL.frequency.value = opts.carrier;
      oR.frequency.value = opts.carrier + opts.beat;
      gL.gain.value = 0.5; gR.gain.value = 0.5;
      oL.connect(gL); gL.connect(merger, 0, 0);
      oR.connect(gR); gR.connect(merger, 0, 1);
      merger.connect(g);
      oL.start(); oR.start();
      nodes.push(oL, oR, gL, gR, merger);
    } else {
      var o = c.createOscillator();
      o.type = "sine"; o.frequency.value = opts.freq;
      o.connect(g); o.start();
      nodes.push(o);
    }
    g.connect(c.destination);
    drone = { ctx: c, nodes: nodes, gain: g };
  }
  function stopDrone(fadeSec) {
    if (!drone) return;
    var d = drone; drone = null;
    try {
      var t = d.ctx.currentTime, f = (fadeSec == null ? 6 : fadeSec);
      d.gain.gain.cancelScheduledValues(t);
      d.gain.gain.setValueAtTime(Math.max(0.0001, d.gain.gain.value), t);
      d.gain.gain.linearRampToValueAtTime(0.0001, t + f);
      setTimeout(function () {
        d.nodes.forEach(function (n) { try { if (n.stop) n.stop(); else n.disconnect(); } catch (e) {} });
      }, (f + 0.4) * 1000);
    } catch (e) {}
  }
  function droneVolume(v) {
    if (drone) drone.gain.gain.setTargetAtTime(Math.max(0.001, v), drone.ctx.currentTime, 0.4);
  }
  function droneOn() { return !!drone; }

  /* ---------- helpers ---------- */
  function fmtClock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + ("0" + s).slice(-2);
  }

  return {
    chime: chime, bell: bell, tick: tick,
    lock: lock, unlock: unlock,
    logRead: read, logSave: saveSession, logNote: updateNote, logStats: stats, dayKey: dayKey,
    droneStart: startDrone, droneStop: stopDrone, droneVolume: droneVolume, droneOn: droneOn,
    fmtClock: fmtClock
  };
})();
