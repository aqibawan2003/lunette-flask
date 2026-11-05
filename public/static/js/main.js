/* LUNETTE storefront - site-wide behaviour (no framework, CSP-safe, no inline JS). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "$" + (Math.round(n * 100) / 100).toLocaleString("en-US"); };
  var FREE_SHIP = 75;
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };

  /* ---------- toast ---------- */
  var toastEl = $("#toast"), toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* ---------- header, scroll-spy, back to top ---------- */
  var hdr = $("#hdr"), totop = $("#totop");
  function onScroll() {
    hdr.classList.toggle("scrolled", window.scrollY > 30);
    totop.hidden = window.scrollY < 900;
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  totop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  var links = $$(".nav a"), spy = [];
  links.forEach(function (a) {
    var id = (a.getAttribute("href").split("#")[1] || ""), el = id && document.getElementById(id);
    if (el) spy.push({ a: a, el: el });
  });
  if (spy.length && "IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        spy.forEach(function (s) { s.a.removeAttribute("aria-current"); if (s.el === e.target) s.a.setAttribute("aria-current", "true"); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    spy.forEach(function (s) { so.observe(s.el); });
  }

  /* ---------- modal system (menu, cart, wishlist, search): focus trap + Esc ---------- */
  var scrim = $("#scrim"), openEl = null, lastFocus = null;
  function openModal(el, withScrim) {
    if (openEl) closeModal();
    lastFocus = document.activeElement; openEl = el; el.hidden = false;
    if (withScrim !== false) scrim.hidden = false;
    document.body.classList.add("lock");
    var f = $("[data-autofocus], input, button, a", el); if (f) setTimeout(function () { f.focus(); }, 30);
  }
  function closeModal() {
    if (!openEl) return;
    openEl.hidden = true; scrim.hidden = true; openEl = null;
    document.body.classList.remove("lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  scrim.addEventListener("click", closeModal);
  document.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
    if (e.key === "Tab" && openEl) {
      var f = $$("a[href],button:not([disabled]),input", openEl).filter(function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  $("#open-menu").addEventListener("click", function () { openModal($("#mnav"), false); });
  $("#open-cart").addEventListener("click", function () { renderCart(); openModal($("#cart")); });
  $("#open-wish").addEventListener("click", function () { renderWish(); openModal($("#wish")); });
  $("#open-search").addEventListener("click", function () { openModal($("#search"), false); $("#q").focus(); });

  /* ---------- cart ---------- */
  function cart() { return store.get("lunette.cart"); }
  function saveCart(c) { store.set("lunette.cart", c); updateCounts(); }
  function addToCart(item) {
    var c = cart(), f = c.filter(function (x) { return x.id === item.id; })[0];
    if (f) f.qty += 1; else c.push({ id: item.id, name: item.name, price: +item.price, img: item.img, qty: 1 });
    saveCart(c); toast(item.name + " added to bag");
  }
  function productFrom(el) {
    var c = el.closest("[data-id]"); if (!c) return null;
    return { id: c.dataset.id, name: c.dataset.name, price: c.dataset.price, img: c.dataset.img };
  }
  function updateCounts() {
    var n = cart().reduce(function (s, x) { return s + x.qty; }, 0), b = $("#cart-count");
    b.textContent = n; b.hidden = !n;
    $("#open-cart").setAttribute("aria-label", "Open bag, " + n + (n === 1 ? " item" : " items"));
    var w = store.get("lunette.wish"), wb = $("#wish-count"); wb.textContent = w.length; wb.hidden = !w.length;
    $$("[data-wish]").forEach(function (b2) {
      var p = productFrom(b2); b2.setAttribute("aria-pressed", !!(p && w.indexOf(p.id) > -1));
    });
  }
  function lineEl(x, mode) {
    var li = document.createElement("li"); li.className = "line";
    var th = document.createElement("div"); th.className = "th"; var im = document.createElement("img"); im.src = x.img; im.alt = ""; th.appendChild(im);
    var mid = document.createElement("div"), h = document.createElement("h3"), pr = document.createElement("p");
    h.textContent = x.name; pr.className = "pr"; pr.textContent = money(x.price); mid.appendChild(h); mid.appendChild(pr);
    var end = document.createElement("div");
    if (mode === "cart") {
      var q = document.createElement("div"); q.className = "qty";
      var m = document.createElement("button"); m.setAttribute("aria-label", "Decrease quantity of " + x.name); m.dataset.act = "dec"; m.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5 12h14"/></svg>';
      var s = document.createElement("span"); s.textContent = x.qty; s.setAttribute("aria-live", "polite");
      var p = document.createElement("button"); p.setAttribute("aria-label", "Increase quantity of " + x.name); p.dataset.act = "inc"; p.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
      q.appendChild(m); q.appendChild(s); q.appendChild(p); mid.appendChild(q);
    }
    var rm = document.createElement("button"); rm.className = "rm"; rm.textContent = mode === "cart" ? "Remove" : "Remove"; rm.dataset.act = "rm"; rm.setAttribute("aria-label", "Remove " + x.name);
    end.appendChild(rm);
    li.dataset.id = x.id; li.appendChild(th); li.appendChild(mid); li.appendChild(end); return li;
  }
  function renderCart() {
    var c = cart(), ul = $("#lines"); ul.textContent = "";
    c.forEach(function (x) { ul.appendChild(lineEl(x, "cart")); });
    $("#cart-empty").hidden = c.length > 0;
    var sub = c.reduce(function (s, x) { return s + x.price * x.qty; }, 0);
    $("#subtotal").textContent = money(sub);
    var left = FREE_SHIP - sub;
    $("#ship-text").textContent = !c.length ? "Free shipping on orders over " + money(FREE_SHIP) : left > 0 ? "You are " + money(left) + " away from free shipping" : "You have unlocked free shipping";
    $("#ship-fill").style.width = Math.min(100, sub / FREE_SHIP * 100) + "%";
    $("#checkout").disabled = !c.length;
  }
  $("#lines").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var id = b.closest("li").dataset.id, c = cart(), it = c.filter(function (x) { return x.id === id; })[0]; if (!it) return;
    if (b.dataset.act === "inc") it.qty += 1;
    if (b.dataset.act === "dec") it.qty = Math.max(0, it.qty - 1);
    if (b.dataset.act === "rm") it.qty = 0;
    saveCart(c.filter(function (x) { return x.qty > 0; })); renderCart();
  });
  $("#checkout").addEventListener("click", function () { toast("Demo store: checkout is not connected yet."); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-add]"); if (a) { var p = productFrom(a); if (p) addToCart(p); }
    var w = e.target.closest("[data-wish]");
    if (w) {
      var pr = productFrom(w); if (!pr) return;
      var list = store.get("lunette.wish"), i = list.indexOf(pr.id);
      if (i > -1) { list.splice(i, 1); toast("Removed from wishlist"); } else { list.push(pr.id); toast("Saved to wishlist"); }
      store.set("lunette.wish", list); updateCounts();
    }
  });
  function renderWish() {
    var ul = $("#wish-lines"), ids = store.get("lunette.wish"); ul.textContent = "";
    var cards = {}; $$("#grid .card").forEach(function (c) { cards[c.dataset.id] = c; });
    ids.forEach(function (id) { var c = cards[id]; if (c) ul.appendChild(lineEl({ id: id, name: c.dataset.name, price: c.dataset.price, img: c.dataset.img }, "wish")); });
    $("#wish-empty").hidden = ul.children.length > 0;
  }
  $("#wish-lines").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act='rm']"); if (!b) return;
    var id = b.closest("li").dataset.id; store.set("lunette.wish", store.get("lunette.wish").filter(function (x) { return x !== id; }));
    updateCounts(); renderWish();
  });
  updateCounts();

  /* ---------- product filter tabs ---------- */
  $$(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      $$(".tab").forEach(function (x) { x.setAttribute("aria-pressed", x === t); });
      var f = t.dataset.filter;
      $$("#grid .card").forEach(function (c) { c.hidden = !(f === "all" || c.dataset.cat === f); });
    });
  });

  /* ---------- live search (server API, rendered with textContent = XSS-safe) ---------- */
  var q = $("#q"), res = $("#results"), st;
  function search() {
    fetch("/api/products?q=" + encodeURIComponent(q.value.trim()))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        res.textContent = "";
        if (!d.products.length) { var n = document.createElement("li"); n.className = "none"; n.textContent = "No results for “" + q.value + "”."; res.appendChild(n); return; }
        d.products.forEach(function (p) {
          var li = document.createElement("li"), a = document.createElement("a"); a.href = "/product/" + p.id;
          var th = document.createElement("div"); th.className = "th"; var im = document.createElement("img"); im.src = "/static/" + p.image; im.alt = ""; th.appendChild(im);
          var mid = document.createElement("div"), h = document.createElement("strong"), s = document.createElement("div");
          h.textContent = p.name; s.textContent = p.tagline; s.style.color = "var(--muted)"; s.style.fontSize = "14px"; mid.appendChild(h); mid.appendChild(s);
          var pr = document.createElement("span"); pr.textContent = money(p.price);
          a.appendChild(th); a.appendChild(mid); a.appendChild(pr); li.appendChild(a); res.appendChild(li);
        });
      }).catch(function () { res.textContent = ""; });
  }
  q.addEventListener("input", function () { clearTimeout(st); st = setTimeout(search, 180); });
  $("#open-search").addEventListener("click", search);

  /* ---------- reveal on scroll + count-up ---------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: .05, rootMargin: "0px 0px -4% 0px" });
    $$(".rv").forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + "ms"; io.observe(el); });
  } else { $$(".rv").forEach(function (el) { el.classList.add("in"); }); }
  var stats = $("#stats");
  if (stats && "IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; co.unobserve(e.target);
        $$("b", e.target).forEach(function (b) {
          var n = +b.dataset.n, s = b.dataset.s || "", t0 = performance.now();
          (function f(t) { var p = Math.min(1, (t - t0) / 1400); b.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))) + s; if (p < 1 && !reduce) requestAnimationFrame(f); else b.textContent = n + s; })(t0);
        });
      });
    }, { threshold: .5 });
    co.observe(stats);
  }

  /* ---------- newsletter (POST /api/newsletter, inline errors) ---------- */
  var nl = $("#nl");
  nl.addEventListener("submit", function (e) {
    e.preventDefault();
    var i = $("#em"), r = $("#emerr"), btn = $(".nl-btn", nl);
    r.style.color = ""; btn.disabled = true;
    fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: i.value }) })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
      .then(function (o) { i.setAttribute("aria-invalid", !o.ok); r.textContent = o.ok ? o.d.message : o.d.error; r.style.color = o.ok ? "#9BD6A8" : ""; if (o.ok) i.value = ""; })
      .catch(function () { i.setAttribute("aria-invalid", "true"); r.textContent = "Network error. Please try again."; })
      .then(function () { btn.disabled = false; });
  });
})();
