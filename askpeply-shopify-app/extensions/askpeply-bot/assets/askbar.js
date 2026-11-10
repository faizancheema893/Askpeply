/* AskPeply ask bar — storefront script (theme app extension).
   Closed: a pill that types rotating example questions.
   Open: suggested questions + input (mic, send).
   Questions go to /apps/askpeply/chat (Shopify App Proxy → AskPeply app). */
(function () {
  "use strict";

  var DEFAULTS = {
    botName: "AskPeply",
    placeholder: "Ask anything…",
    typingLines: "What purity is this batch?\nCan I see the COA?\nHow should I store it?",
    note: "",
    iconMode: "all",
    showMic: true,
    suggested: [],
    fallbackAnswer: "I can help with our products, COAs, shipping, storage and store policies.",
    offlineAnswer: "I can't reach the assistant right now. Please try again in a moment, or contact our support team."
  };

  function trim(s) { return String(s == null ? "" : s).trim(); }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function isRtl(text) {
    var rtl = (String(text).match(/[֐-ࣿיִ-﷿ﹰ-﻿]/g) || []).length;
    var ltr = (String(text).match(/[A-Za-zÀ-ɏ]/g) || []).length;
    return rtl > 0 && rtl >= ltr;
  }
  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }

  /* Small, safe markdown: **bold**, *italic*, [link](https://… or /path), "- " lists, paragraphs. */
  function inline(s) {
    s = esc(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, function (m, text, url) {
      var ext = /^https?:/.test(url) ? ' target="_blank" rel="noopener"' : "";
      return '<a href="' + url + '"' + ext + ">" + text + "</a>";
    });
    return s;
  }
  function markdown(text) {
    var out = [], para = [], list = null;
    function flushPara() { if (para.length) { out.push("<p>" + para.map(inline).join("<br>") + "</p>"); para = []; } }
    function flushList() {
      if (list) { out.push("<ul>" + list.map(function (i) { return "<li>" + inline(i) + "</li>"; }).join("") + "</ul>"); list = null; }
    }
    String(text).split(/\r?\n/).forEach(function (line) {
      var t = line.trim();
      if (!t) { flushPara(); flushList(); return; }
      var heading = t.match(/^#{1,4}\s+(.*)$/);
      if (heading) t = "**" + heading[1] + "**";
      var item = t.match(/^(?:[-•]|\*(?!\*)|\d+[.)])\s+(.*)$/);
      if (item) { flushPara(); (list = list || []).push(item[1]); return; }
      flushList(); para.push(t);
    });
    flushPara(); flushList();
    return out.join("");
  }

  function storage(key, value) {
    try {
      if (value === undefined) return window.sessionStorage.getItem(key);
      if (value === null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, value);
    } catch (e) { /* storage blocked */ }
    return null;
  }

  function init(root) {
    if (!root || root.__apb) return;
    root.__apb = true;

    var cfg = {};
    try { cfg = JSON.parse(root.querySelector("[data-apb-config]").textContent) || {}; } catch (e) { cfg = {}; }
    for (var k in DEFAULTS) if (cfg[k] === undefined || cfg[k] === null || cfg[k] === "") cfg[k] = DEFAULTS[k];
    var suggested = Array.isArray(cfg.suggested) ? cfg.suggested.filter(function (s) { return s && trim(s.question); }) : [];

    var dock = root.querySelector(".apb-dock");
    var form = root.querySelector(".apb-bar");
    var input = root.querySelector(".apb-input");
    var ghost = root.querySelector(".apb-ghost-text");
    var sendBtn = root.querySelector(".apb-send");
    var micBtn = root.querySelector(".apb-mic");
    var feed = root.querySelector(".apb-feed");
    var chipsBox = root.querySelector(".apb-chips");
    var note = root.querySelector(".apb-note");

    var placeholder = trim(cfg.placeholder) || "Ask anything…";
    var avatar = (trim(cfg.botName) || "A").charAt(0).toUpperCase();
    var endpoint = root.getAttribute("data-endpoint") || "/apps/askpeply/chat";
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var touch = window.matchMedia && window.matchMedia("(hover: none)").matches;
    var convKey = "askpeply:conversation";

    if (note) { if (trim(cfg.note)) note.textContent = cfg.note; else note.parentNode.removeChild(note); }

    /* suggested question chips */
    suggested.slice(0, 4).forEach(function (s, i) {
      var b = el("button", "apb-chip");
      b.type = "button";
      b.style.setProperty("--i", i);
      b.textContent = s.question;
      b.addEventListener("click", function () { ask(s.question, trim(s.answer) ? s : null); });
      chipsBox.appendChild(b);
    });

    var history = [];
    var isOpen = false;
    var busy = false;

    /* ---------------- typewriter (closed state) */
    var lines = String(cfg.typingLines || "").split(/\r?\n/).map(trim).filter(Boolean);
    if (!lines.length) lines = [placeholder];
    var lineIndex = 0, charIndex = 0, deleting = false, timer = null;

    function tick() {
      clearTimeout(timer);
      if (isOpen) return;
      var line = lines[lineIndex];
      if (reduceMotion) {
        ghost.textContent = line;
        lineIndex = (lineIndex + 1) % lines.length;
        timer = setTimeout(tick, 3200);
        return;
      }
      if (!deleting) {
        charIndex++;
        ghost.textContent = line.slice(0, charIndex);
        if (charIndex >= line.length) { deleting = true; timer = setTimeout(tick, 2000); return; }
        timer = setTimeout(tick, 35 + Math.random() * 45);
      } else {
        charIndex--;
        ghost.textContent = line.slice(0, charIndex);
        if (charIndex <= 0) { deleting = false; lineIndex = (lineIndex + 1) % lines.length; timer = setTimeout(tick, 400); return; }
        timer = setTimeout(tick, 18);
      }
    }

    /* ---------------- open / close */
    function open() {
      if (isOpen) return;
      isOpen = true;
      clearTimeout(timer);
      setMini(false);
      root.classList.add("is-open");
      input.placeholder = placeholder;
      refresh();
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      stopMic();
      root.classList.remove("is-open");
      input.placeholder = "";
      input.blur();
      charIndex = 0; deleting = false;
      anchorY = scrollTop();
      setTimeout(function () { anchorY = scrollTop(); }, 450);
      tick();
    }

    /* after scrolling, the bar turns into a round chat icon (configurable) */
    var iconQuery = { phones: "(max-width: 640px)", tablets: "(max-width: 1024px)", all: "all", off: "not all" }[cfg.iconMode] || "all";
    var iconMedia = window.matchMedia ? window.matchMedia(iconQuery) : null;
    var mini = false;
    function scrollTop() { return window.pageYOffset || document.documentElement.scrollTop || 0; }
    var anchorY = scrollTop();
    function setMini(state) { mini = state; root.classList.toggle("is-mini", state); }
    function onScroll() {
      if (!iconMedia || !iconMedia.matches) { if (mini) setMini(false); return; }
      if (isOpen || mini) return;
      if (Math.abs(scrollTop() - anchorY) > 10) setMini(true);
    }
    var scrollQueued = false;
    window.addEventListener("scroll", function () {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(function () { scrollQueued = false; onScroll(); });
    }, { passive: true });
    window.addEventListener("resize", onScroll);

    function refresh() {
      var hasText = !!trim(input.value);
      root.classList.toggle("has-value", !!input.value);
      sendBtn.classList.toggle("is-ready", hasText);
    }
    function setBusy(state) {
      busy = state;
      sendBtn.disabled = state;
      root.classList.toggle("is-busy", state);
    }

    /* ---------------- messages */
    function scrollFeed() { feed.scrollTop = feed.scrollHeight; }
    function addUser(text) {
      var wrap = el("div", "ap-chat-msg user");
      var bubble = el("div", "ap-msg-bubble ap-user-bubble");
      bubble.textContent = text;
      if (isRtl(text)) bubble.setAttribute("dir", "rtl");
      wrap.appendChild(bubble);
      feed.appendChild(wrap);
      scrollFeed();
    }
    function addBot(html, extraClass) {
      var wrap = el("div", "ap-chat-msg bot");
      var av = el("div", "ap-msg-avatar");
      av.textContent = avatar;
      var bubble = el("div", "ap-msg-bubble ap-bot-bubble" + (extraClass ? " " + extraClass : ""));
      bubble.innerHTML = html;
      if (isRtl(bubble.textContent)) bubble.setAttribute("dir", "rtl");
      wrap.appendChild(av);
      wrap.appendChild(bubble);
      feed.appendChild(wrap);
      scrollFeed();
      return wrap;
    }
    function matchAnswer(text) {
      var q = text.toLowerCase();
      for (var i = 0; i < suggested.length; i++) {
        if (!trim(suggested[i].answer)) continue;
        var words = String(suggested[i].keywords || "").split(",").map(trim).filter(Boolean);
        for (var k = 0; k < words.length; k++) {
          if (q.indexOf(words[k].toLowerCase()) !== -1) return suggested[i].answer;
        }
      }
      return null;
    }

    function post(body) {
      body.conversationId = storage(convKey) || null;
      body.pageUrl = window.location.pathname;
      return fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin"
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (data && data.conversationId) storage(convKey, data.conversationId);
          if (!res.ok) { var err = new Error(data.error || "request_failed"); err.data = data; throw err; }
          return data;
        });
      });
    }

    function ask(text, written) {
      text = trim(text);
      if (!text || busy) return;
      open();
      root.classList.add("has-chat");
      input.value = "";
      refresh();
      addUser(text);
      history.push({ role: "user", content: text });
      setBusy(true);
      var thinking = addBot('<span class="ap-tdot"></span><span class="ap-tdot"></span><span class="ap-tdot"></span>', "ap-thinking-bubble");

      function finish(plain) {
        thinking.remove();
        addBot(markdown(plain));
        history.push({ role: "assistant", content: plain });
        setBusy(false);
        if (isOpen && !touch) input.focus();
      }

      if (written) {
        setTimeout(function () { finish(written.answer); }, 550);
        post({ type: "log", question: text, answer: written.answer }).catch(function () {});
        return;
      }

      var controller = window.AbortController ? new AbortController() : null;
      var timeout = setTimeout(function () { if (controller) controller.abort(); }, 40000);
      post({ messages: history.slice(-12) })
        .then(function (data) {
          clearTimeout(timeout);
          finish(data.reply || matchAnswer(text) || cfg.fallbackAnswer);
        })
        .catch(function (e) {
          clearTimeout(timeout);
          finish((e && e.data && e.data.reply) || matchAnswer(text) || cfg.offlineAnswer);
        });
    }

    /* ---------------- voice input */
    var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognizer = null, listening = false;
    function startMic() {
      try {
        recognizer = new Recognition();
        recognizer.lang = document.documentElement.lang || "en-US";
        recognizer.interimResults = true;
        recognizer.continuous = false;
        var base = input.value ? input.value.replace(/\s*$/, " ") : "";
        recognizer.onresult = function (event) {
          var said = "";
          for (var i = 0; i < event.results.length; i++) said += event.results[i][0].transcript;
          input.value = base + said;
          refresh();
        };
        recognizer.onend = recognizer.onerror = function () {
          listening = false;
          root.classList.remove("is-listening");
          if (isOpen) input.focus();
        };
        recognizer.start();
        listening = true;
        root.classList.add("is-listening");
      } catch (e) {
        listening = false;
        root.classList.remove("is-listening");
      }
    }
    function stopMic() { if (recognizer && listening) { try { recognizer.stop(); } catch (e) {} } }

    if (micBtn) {
      if (!Recognition || cfg.showMic === false) micBtn.parentNode.removeChild(micBtn);
      else micBtn.addEventListener("click", function () { if (listening) stopMic(); else startMic(); });
    }

    /* ---------------- events */
    root.querySelector(".apb-mini").addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setMini(false);
      anchorY = scrollTop();
      root.classList.add("is-pop");
      setTimeout(function () { root.classList.remove("is-pop"); }, 450);
      charIndex = 0; deleting = false;
      tick();
    });
    input.addEventListener("focus", open);
    input.addEventListener("input", refresh);
    form.addEventListener("click", function () { if (!isOpen) { open(); input.focus(); } });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!isOpen) { open(); input.focus(); return; }
      ask(input.value);
    });
    root.querySelector(".apb-close").addEventListener("click", close);
    root.querySelector(".apb-reset").addEventListener("click", function () {
      history = [];
      feed.innerHTML = "";
      storage(convKey, null);
      root.classList.remove("has-chat");
      input.focus();
    });
    document.addEventListener("pointerdown", function (e) {
      if (isOpen && !dock.contains(e.target) && !(e.target.closest && e.target.closest("[data-ap-ask],[data-ap-open]"))) close();
    });
    root.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    /* public API: lets page buttons open the bot or ask a question */
    window.AskPeply = {
      open: function () { open(); input.focus(); },
      ask: function (q) { ask(q); }
    };

    tick();
  }

  function boot() { Array.prototype.forEach.call(document.querySelectorAll("[data-askbar]"), init); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  document.addEventListener("shopify:section:load", boot);
})();
