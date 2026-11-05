/*
 * LUNETTE hero - ONE continuous camera shot, built in code.
 *
 * Why it reads as a single video instead of five pictures:
 *  1. Objects never cross-dissolve. They enter/exit the frame by whip-pan
 *     (sideways) or tilt (vertical), like a real camera move.
 *  2. Motion blur is derived from each layer's real velocity, along the
 *     direction of travel (SVG feGaussianBlur with an anisotropic std-dev).
 *  3. A persistent virtual camera (slow push-in, breathing, hand-held drift)
 *     is applied to every layer, so the whole frame moves together.
 *  4. Film grain, vignette, bokeh, a light sweep and background parallax
 *     tie all frames to one lens and one light.
 *
 * Every layer is a pure function of time t (seconds) -> fully scrubbable.
 * Optional: drop public/static/video/hero.mp4 and the hero plays that real
 * video instead (chapters stay in sync with the video's current time).
 */
(function () {
  "use strict";
  var hero = document.getElementById("top");
  if (!hero) return;
  var CH = JSON.parse(hero.dataset.chapters), L = 16.8;
  var VIDEO = hero.dataset.video === "1", vid = document.getElementById("hvid");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tiny keyframe engine: each property has its own track ---------- */
  var ez = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  function P(k) {
    return function (t) {
      var n = k.length;
      if (t <= k[0][0]) return k[0][1];
      if (t >= k[n - 1][0]) return k[n - 1][1];
      for (var i = 0; i < n - 1; i++) if (t < k[i + 1][0]) {
        var a = k[i], b = k[i + 1]; return a[1] + (b[1] - a[1]) * ez((t - a[0]) / (b[0] - a[0]));
      }
    };
  }
  var C = function (v) { return function () { return v; }; };

  /* x,y in % of stage width; s scale; ry deg (3D turn); r deg roll; op opacity; bl focus-blur px */
  var T = {
    wire: { // 0-3: hero shot. 3.0-3.9: whip-pan LEFT out. 15.7-16.8: whip-pan in from the RIGHT (loop seam)
      x: P([[0, 0], [2.9, 0], [3.9, -48], [15.7, 48], [16.8, 0]]),
      op: P([[0, 1], [3.3, 1], [3.9, 0], [15.8, 0], [16.3, 1]]),
      s: P([[0, 1], [2.9, 1.03], [3.9, 1.05], [15.7, 1.05], [16.8, 1]]), y: C(0), ry: C(0), r: C(0), bl: P([[0, 0], [15.7, 0], [16.8, 0]])
    },
    shell: { // enters from the right during the whip, pushes in, then turns away on its Y axis
      x: P([[0, 50], [3.0, 50], [4.2, 0], [6.6, -1.5], [7.6, -4], [16.8, -4]]),
      op: P([[0, 0], [3.0, 0], [3.4, 1], [7.1, 1], [7.6, 0], [16.8, 0]]),
      s: P([[0, .96], [3.0, .96], [4.2, 1], [6.6, 1.14], [7.6, 1.08], [16.8, 1.08]]),
      ry: P([[0, 0], [6.9, 0], [7.6, -36], [16.8, -36]]),
      bl: P([[0, 5], [3.0, 5], [4.2, 0], [7.0, 0], [7.6, 3], [16.8, 3]]), y: P([[0, 5], [3.0, 5], [4.2, 0], [16.8, 0]]), r: C(0)
    },
    turn: { // swings in from the other side of the turn, then tilts UP out of frame as the camera tilts down
      x: C(3), y: P([[0, 0], [9.8, 0], [11.0, -48], [16.8, -48]]),
      op: P([[0, 0], [7.0, 0], [7.5, 1], [10.2, 1], [10.8, 0], [16.8, 0]]),
      s: P([[0, 1], [7.0, 1], [8.3, 1.04], [9.8, 1.04], [11.0, 1], [16.8, 1]]),
      ry: P([[0, 38], [7.0, 38], [8.3, 0], [16.8, 0]]),
      bl: P([[0, 3], [7.0, 3], [7.8, 0], [9.8, 0], [10.6, 3], [16.8, 3]]), r: C(0)
    },
    open: { // rises into frame from below (camera tilt), settles, then whip-pans LEFT out
      x: P([[0, 0], [12.8, 0], [13.8, -48], [16.8, -48]]),
      y: P([[0, 48], [10.0, 48], [11.4, 0], [16.8, 0]]),
      op: P([[0, 0], [10.0, 0], [10.4, 1], [13.3, 1], [13.8, 0], [16.8, 0]]),
      s: P([[0, .94], [10.0, .94], [11.4, 1], [12.8, 1.03], [16.8, 1.03]]),
      bl: P([[0, 4], [10.0, 4], [11.4, 0], [12.8, 0], [13.6, 3], [16.8, 3]]), ry: C(0), r: C(0)
    },
    closed: { // whip-pans in from the right, holds, whip-pans LEFT as the loop restarts
      x: P([[0, 48], [13.0, 48], [14.2, 0], [15.6, 0], [16.8, -48]]),
      op: P([[0, 0], [13.0, 0], [13.4, 1], [15.8, 1], [16.4, 0], [16.8, 0]]),
      s: P([[0, .96], [13.0, .96], [14.2, 1], [15.6, 1.02], [16.8, 1.02]]),
      bl: P([[0, 4], [13.0, 4], [14.2, 0], [15.6, 0], [16.6, 3], [16.8, 3]]), y: C(0), ry: C(0), r: C(0)
    }
  };
  var PH = { wire: 0, shell: 1.3, turn: 2.1, open: .6, closed: 3.2 };                 // idle float phase
  var SWEEP = P([[0, -130], [3.3, -130], [4.6, 130], [6.9, -130], [8.2, 130], [10.6, -130], [11.9, 130], [13.3, -130], [14.6, 130], [16.8, 130]]);
  var BGX = P([[0, 0], [3.0, 0], [4.1, -4], [6.0, -2], [12.9, -2], [14.2, -6], [15.8, -4], [16.8, 0]]);   // background parallax follows the pans
  var BGY = P([[0, 0], [9.9, 0], [11.2, 3], [13.0, 1], [16.8, 0]]);

  /* ---------- DOM ---------- */
  var stage = document.getElementById("stage"), sweep = document.getElementById("sweep");
  var l1 = document.getElementById("l1"), l2 = document.getElementById("l2");
  var layers = {}, W = stage.clientWidth;
  if (!VIDEO) {
    var defs = document.getElementById("mbdefs"), NS = "http://www.w3.org/2000/svg";
    Array.prototype.forEach.call(stage.querySelectorAll(".layer"), function (el) {
      var k = el.className.split(" ")[1];
      el.style.width = el.dataset.w + "%";
      var f = document.createElementNS(NS, "filter"); f.setAttribute("id", "mb-" + k);
      f.setAttribute("x", "-25%"); f.setAttribute("y", "-25%"); f.setAttribute("width", "150%"); f.setAttribute("height", "150%");
      var g = document.createElementNS(NS, "feGaussianBlur"); g.setAttribute("stdDeviation", "0 0"); f.appendChild(g); defs.appendChild(f);
      layers[k] = { el: el, g: g };
    });
  }
  window.addEventListener("resize", function () { W = stage.clientWidth; sizeDust(); });
  var mx = 0, my = 0, tx = 0, ty = 0;
  hero.addEventListener("pointermove", function (e) { var r = hero.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; }, { passive: true });

  /* ---------- virtual camera: push-in + breathing + hand-held drift ---------- */
  function camera(t) {
    var a = t / L * Math.PI * 2;
    return {
      s: 1.03 - .03 * Math.cos(a),
      x: Math.sin(a) * .9 + Math.sin(t * 1.7) * .18,
      y: Math.sin(a + 1) * .5 + Math.sin(t * 1.3 + 2) * .14,
      r: Math.sin(t * .7) * .12
    };
  }
  var vel = function (f, t) { return (f(t + .02) - f(t - .02)) / .04; };   // % of stage width per second

  /* ---------- chapters / copy ---------- */
  var eb = document.getElementById("eb"), hl = document.getElementById("hl"), hp = document.getElementById("hp"), cur = 0, chBtns = [], bars = [];
  function paint(c) {
    hl.textContent = "";
    c.lines.forEach(function (l) { var a = document.createElement("span"), b = document.createElement("span"); a.className = "ln"; b.textContent = l; a.appendChild(b); hl.appendChild(a); });
    eb.textContent = c.tag; hp.textContent = c.body;
  }
  function setCh(i) {
    if (i === cur) return; cur = i;
    chBtns.forEach(function (b, k) { b.setAttribute("aria-current", k === i); });
    hl.classList.add("out"); eb.classList.add("fade"); hp.classList.add("fade");
    setTimeout(function () {
      paint(CH[cur]); hl.classList.remove("out"); hl.classList.add("pre"); void hl.offsetWidth; hl.classList.remove("pre");
      eb.classList.remove("fade"); hp.classList.remove("fade");
    }, 360);
  }
  var wrap = document.getElementById("chaps");
  CH.forEach(function (c, i) {
    var b = document.createElement("button"); b.className = "chap"; b.setAttribute("aria-label", "Chapter " + (i + 1) + ": " + c.nav);
    var bar = document.createElement("span"), fill = document.createElement("i"); bar.className = "bar"; bar.appendChild(fill);
    var t = document.createElement("span"), n = document.createElement("b"); t.className = "t"; n.textContent = "0" + (i + 1); t.appendChild(n); t.appendChild(document.createTextNode(c.nav));
    b.appendChild(bar); b.appendChild(t); b.addEventListener("click", function () { seek(c.t + .05); });
    wrap.appendChild(b); chBtns.push(b); bars.push(fill);
  });
  chBtns[0].setAttribute("aria-current", "true");

  /* ---------- render: pure function of t ---------- */
  var clock = { t: 0, playing: true, intro: true, last: 0, visible: true };
  function render(t) {
    var cam = camera(t), rev = clock.intro ? Math.min(1, t / 2.3) : 1;
    if (!VIDEO) {
      for (var k in layers) {
        var D = T[k], ly = layers[k], el = ly.el;
        var op = D.op(t);
        if (op < .004) { el.style.opacity = 0; continue; }
        var x = D.x(t), y = D.y(t) + Math.sin(t * 1.1 + PH[k]) * .5, s = D.s(t) * cam.s;
        var vx = vel(D.x, t) / 100 * W, vy = vel(D.y, t) / 100 * W;                // px / second
        var sx = Math.min(30, Math.abs(vx) * .011), sy = Math.min(30, Math.abs(vy) * .011);
        var d = k === "wire" ? 1 : 1.2;
        var px = (x + cam.x * 3) / 100 * W + mx * 14 * d, py = (y + cam.y * 3) / 100 * W + my * 8 * d;
        el.style.opacity = op;
        el.style.transform = "translate(-50%,-50%) translate3d(" + px.toFixed(1) + "px," + py.toFixed(1) + "px,0) perspective(1100px) rotateY(" + (D.ry(t) - mx * 6 * d).toFixed(2) + "deg) rotate(" + (D.r(t) + cam.r).toFixed(2) + "deg) scale(" + s.toFixed(4) + ")";
        var bl = D.bl(t), f = [];
        if (bl > .15) f.push("blur(" + bl.toFixed(1) + "px)");
        if (sx > .3 || sy > .3) { ly.g.setAttribute("stdDeviation", sx.toFixed(1) + " " + sy.toFixed(1)); f.push("url(#mb-" + k + ")"); }
        el.style.filter = f.length ? f.join(" ") : "none";
      }
      layers.wire.el.style.setProperty("--r", (rev * 1.18).toFixed(3));
      sweep.style.transform = "translateX(" + SWEEP(t).toFixed(1) + "%)";
    }
    var a = Math.sin(t / L * Math.PI * 2);
    l1.style.transform = "translate(" + (a * 2.2 + BGX(t) * .8).toFixed(2) + "%," + (BGY(t) * .6).toFixed(2) + "%)";
    l2.style.transform = "translate(" + (-a * 3 + BGX(t) * 1.6).toFixed(2) + "%," + (BGY(t) * 1.2).toFixed(2) + "%)";
    var ci = 0; for (var i = 0; i < CH.length; i++) if (t >= CH[i].t) ci = i;
    setCh(ci);
    var end = ci < CH.length - 1 ? CH[ci + 1].t : L;
    for (var j = 0; j < bars.length; j++) bars[j].style.transform = "scaleX(" + (j < ci ? 1 : j === ci ? ((t - CH[ci].t) / (end - CH[ci].t)).toFixed(3) : 0) + ")";
  }
  function seek(t) {
    clock.t = t % L; clock.intro = false;
    if (VIDEO && vid.duration) vid.currentTime = clock.t * vid.duration / L;
    render(clock.t);
  }
  function frame(now) {
    var dt = Math.min(.05, (now - clock.last) / 1000); clock.last = now;
    mx += (tx - mx) * .06; my += (ty - my) * .06;
    if (VIDEO && vid && vid.duration) clock.t = vid.currentTime / vid.duration * L;
    else if (clock.playing && clock.visible) { clock.t += dt; if (clock.t >= L) { clock.t -= L; clock.intro = false; } }
    if (clock.visible) render(clock.t);
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(function (e) {
    clock.visible = e[0].isIntersecting;
    if (VIDEO && vid) { if (clock.visible && clock.playing) vid.play(); else vid.pause(); }
  }).observe(hero);
  var pp = document.getElementById("pp"), ppi = document.getElementById("ppi");
  function setPlay(p) {
    clock.playing = p; pp.setAttribute("aria-label", p ? "Pause animation" : "Play animation");
    ppi.innerHTML = p ? '<path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z"/>' : '<path d="M4 2l10 6-10 6z"/>';
    if (VIDEO && vid) { if (p) vid.play(); else vid.pause(); }
  }
  pp.addEventListener("click", function () { setPlay(!clock.playing); });
  window.__seek = seek;   // handy for debugging / screenshots

  /* ---------- bokeh + dust (depth cue) ---------- */
  var cv = document.getElementById("dust"), cx = cv.getContext("2d"), PT = [];
  function sizeDust() { cv.width = cv.clientWidth; cv.height = cv.clientHeight; }
  sizeDust();
  for (var i = 0; i < 40; i++) PT.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + .4, s: Math.random() * .00006 + .00002, a: Math.random() * .35 + .1, p: Math.random() * 6, b: 0 });
  for (var j = 0; j < 9; j++) PT.push({ x: Math.random(), y: Math.random(), r: 26 + Math.random() * 54, s: Math.random() * .00003 + .00001, a: .05 + Math.random() * .07, p: Math.random() * 6, b: 1 });
  function dust(now) {
    if (clock.visible && !reduce) {
      cx.clearRect(0, 0, cv.width, cv.height);
      PT.forEach(function (q) {
        q.y -= q.s * 16; q.x += Math.sin(now / 3000 + q.p) * .00025; if (q.y < -.1) { q.y = 1.1; q.x = Math.random(); }
        var X = q.x * cv.width, Y = q.y * cv.height;
        if (q.b) { var g = cx.createRadialGradient(X, Y, 0, X, Y, q.r); g.addColorStop(0, "rgba(255,248,235," + q.a + ")"); g.addColorStop(1, "rgba(255,248,235,0)"); cx.fillStyle = g; cx.globalAlpha = 1; cx.fillRect(X - q.r, Y - q.r, q.r * 2, q.r * 2); }
        else { cx.globalAlpha = q.a; cx.fillStyle = "#FFF8EE"; cx.beginPath(); cx.arc(X, Y, q.r, 0, 6.283); cx.fill(); }
      });
    }
    requestAnimationFrame(dust);
  }
  requestAnimationFrame(dust);

  if (reduce) { setPlay(false); clock.intro = false; seek(5); } else render(0);
  requestAnimationFrame(function (n) { clock.last = n; frame(n); });
})();
