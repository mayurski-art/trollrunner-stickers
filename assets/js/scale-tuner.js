/*
 * Dev-only preview-scale tuner for the printable sticker gallery.
 *
 * Hidden from normal visitors. Activate by adding ?tune (or #tune) to the URL,
 * e.g. http://localhost:8000/?tune. Gives a slider per sticker that resizes the
 * card preview in real time, then a button to copy the resulting "previewScale"
 * values to paste back into assets/data/stickers.json. Preview only — it never
 * touches the print masters or generated PDFs.
 */
(function () {
  'use strict';

  const active = /(^|[?&])tune(=|&|$)/.test(window.location.search) || window.location.hash === '#tune';
  if (!active) return;

  const STEP = 0.01;
  const MIN = 0.3;
  const MAX = 1;
  const state = {}; // id -> current scale
  let bodyPad = 12; // px, bottom white box padding (global)
  const BODY_PAD_DEFAULT = 12;
  let built = false;

  function api() { return window.TrollPrintables; }

  function round2(n) { return Math.round(n * 100) / 100; }

  function injectStyles() {
    const css = document.createElement('style');
    css.textContent = `
      #scale-tuner {
        position: fixed; right: 16px; bottom: 16px; z-index: 99998;
        width: min(360px, calc(100vw - 24px)); max-height: 78vh;
        display: flex; flex-direction: column;
        background: rgba(20, 22, 30, 0.96); color: #fff;
        border: 0.5px solid rgba(255,255,255,0.18); border-radius: 16px;
        box-shadow: 0 18px 44px rgba(0,0,0,0.5);
        font-family: 'DM Sans', system-ui, sans-serif; font-size: 13px;
        backdrop-filter: blur(6px);
      }
      #scale-tuner.is-collapsed { width: auto; }
      #scale-tuner.is-collapsed .st-body, #scale-tuner.is-collapsed .st-foot { display: none; }
      .st-head {
        display: flex; align-items: center; justify-content: space-between;
        gap: 10px; padding: 12px 14px; border-bottom: 0.5px solid rgba(255,255,255,0.12);
      }
      .st-title { font-weight: 700; letter-spacing: 0.02em; }
      .st-title small { display: block; font-weight: 400; opacity: 0.6; font-size: 11px; }
      .st-head button {
        border: 0.5px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.08);
        color: #fff; border-radius: 8px; padding: 5px 9px; font-size: 12px; cursor: pointer;
      }
      #scale-tuner.is-collapsed .st-collapse::after { content: '+'; }
      .st-collapse::after { content: '–'; }
      .st-body { padding: 8px 14px; overflow-y: auto; }
      .st-row { padding: 9px 0; border-bottom: 0.5px solid rgba(255,255,255,0.08); }
      .st-row:last-child { border-bottom: 0; }
      .st-global {
        background: rgba(88,86,214,0.16); border: 0.5px solid rgba(120,118,255,0.35);
        border-radius: 9px; padding: 9px 10px; margin-bottom: 6px;
      }
      .st-row-top { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
      .st-name { font-weight: 600; }
      .st-val { font-family: 'DM Mono', monospace; opacity: 0.85; min-width: 38px; text-align: right; }
      .st-controls { display: flex; align-items: center; gap: 8px; }
      .st-controls input[type=range] { flex: 1; accent-color: #5856d6; }
      .st-reset {
        border: 0.5px solid rgba(255,255,255,0.2); background: transparent; color: #fff;
        border-radius: 7px; padding: 3px 7px; font-size: 11px; cursor: pointer; opacity: 0.8;
      }
      .st-foot { padding: 12px 14px; border-top: 0.5px solid rgba(255,255,255,0.12); }
      .st-foot-btns { display: flex; gap: 8px; margin-bottom: 8px; }
      .st-foot-btns button {
        flex: 1; border: none; border-radius: 9px; padding: 9px; font-size: 12px; font-weight: 700;
        cursor: pointer; color: #fff;
      }
      .st-copy { background: linear-gradient(135deg, #007aff, #5856d6); }
      .st-reset-all { background: rgba(255,255,255,0.12); }
      .st-out {
        width: 100%; height: 96px; resize: vertical;
        font-family: 'DM Mono', monospace; font-size: 11px; line-height: 1.45;
        background: #0c0e15; color: #cfe3ff; border: 0.5px solid rgba(255,255,255,0.14);
        border-radius: 8px; padding: 8px; white-space: pre;
      }
      .st-status { margin-top: 6px; min-height: 14px; font-size: 11px; opacity: 0.8; }
    `;
    document.head.appendChild(css);
  }

  function buildSnippet() {
    const obj = {};
    Object.keys(state).forEach(function (id) {
      const v = round2(state[id]);
      if (v < 1) obj[id] = v;
    });
    const lines = Object.keys(obj).map(function (id) {
      return '  "' + id + '": ' + obj[id];
    });
    const scalePart = lines.length
      ? '// previewScale -> assets/data/stickers.json\n{\n' + lines.join(',\n') + '\n}'
      : '// previewScale: all stickers at 1.0 (remove the field)';
    const boxPart = '// bottom box -> index.html .printable-card-body\npadding: ' + bodyPad + 'px;'
      + (bodyPad === BODY_PAD_DEFAULT ? '   /* current default */' : '');
    return scalePart + '\n\n' + boxPart;
  }

  function refreshOutput(panel) {
    panel.querySelector('.st-out').value = buildSnippet();
  }

  function build() {
    if (built) return;
    const helper = api();
    const stickers = helper && helper.getStickers ? helper.getStickers() : [];
    if (!stickers.length) return;
    built = true;
    injectStyles();

    const panel = document.createElement('div');
    panel.id = 'scale-tuner';
    panel.innerHTML =
      '<div class="st-head">' +
        '<span class="st-title">Scale tuner <small>preview only · ?tune</small></span>' +
        '<button class="st-collapse" type="button" aria-label="Collapse"></button>' +
      '</div>' +
      '<div class="st-body"></div>' +
      '<div class="st-foot">' +
        '<div class="st-foot-btns">' +
          '<button class="st-copy" type="button">Copy values</button>' +
          '<button class="st-reset-all" type="button">Reset all</button>' +
        '</div>' +
        '<textarea class="st-out" readonly></textarea>' +
        '<div class="st-status" role="status" aria-live="polite"></div>' +
      '</div>';

    const body = panel.querySelector('.st-body');

    // Global: size of the bottom white box (.printable-card-body padding).
    const sampleBody = document.querySelector('.printable-card-body');
    if (sampleBody && window.getComputedStyle) {
      const cur = parseFloat(window.getComputedStyle(sampleBody).paddingTop);
      if (cur >= 0) bodyPad = Math.round(cur);
    }
    const globalRow = document.createElement('div');
    globalRow.className = 'st-row st-global';
    globalRow.innerHTML =
      '<div class="st-row-top"><span class="st-name">Bottom box</span><span class="st-val st-body-val">' + bodyPad + 'px</span></div>' +
      '<div class="st-controls">' +
        '<input type="range" class="st-body-range" min="0" max="48" step="1" value="' + bodyPad + '">' +
        '<button class="st-reset st-body-reset" type="button">' + BODY_PAD_DEFAULT + '</button>' +
      '</div>';
    const bodyRange = globalRow.querySelector('.st-body-range');
    const bodyValEl = globalRow.querySelector('.st-body-val');
    function applyBodyPad(px) {
      bodyPad = px;
      bodyValEl.textContent = px + 'px';
      document.documentElement.style.setProperty('--printable-body-pad', px + 'px');
      refreshOutput(panel);
    }
    bodyRange.addEventListener('input', function () { applyBodyPad(parseInt(bodyRange.value, 10)); });
    globalRow.querySelector('.st-body-reset').addEventListener('click', function () { bodyRange.value = BODY_PAD_DEFAULT; applyBodyPad(BODY_PAD_DEFAULT); });
    body.appendChild(globalRow);

    stickers.forEach(function (s) {
      const initial = (Number(s.previewScale) > 0 && Number(s.previewScale) <= 1) ? Number(s.previewScale) : 1;
      state[s.id] = initial;
      const row = document.createElement('div');
      row.className = 'st-row';
      row.innerHTML =
        '<div class="st-row-top"><span class="st-name"></span><span class="st-val">' + initial.toFixed(2) + '</span></div>' +
        '<div class="st-controls">' +
          '<input type="range" min="' + MIN + '" max="' + MAX + '" step="' + STEP + '" value="' + initial + '">' +
          '<button class="st-reset" type="button">1.0</button>' +
        '</div>';
      row.querySelector('.st-name').textContent = s.title || s.id;
      const range = row.querySelector('input');
      const val = row.querySelector('.st-val');
      function apply(v) {
        state[s.id] = v;
        val.textContent = v.toFixed(2);
        if (helper.setPreviewScale) helper.setPreviewScale(s.id, v);
        refreshOutput(panel);
      }
      range.addEventListener('input', function () { apply(parseFloat(range.value)); });
      row.querySelector('.st-reset').addEventListener('click', function () { range.value = 1; apply(1); });
      body.appendChild(row);
    });

    panel.querySelector('.st-collapse').addEventListener('click', function () {
      panel.classList.toggle('is-collapsed');
    });

    panel.querySelector('.st-reset-all').addEventListener('click', function () {
      panel.querySelectorAll('.st-row:not(.st-global) input[type=range]').forEach(function (range) {
        range.value = 1;
        range.dispatchEvent(new Event('input'));
      });
      bodyRange.value = BODY_PAD_DEFAULT;
      applyBodyPad(BODY_PAD_DEFAULT);
    });

    panel.querySelector('.st-copy').addEventListener('click', function () {
      const text = buildSnippet();
      const status = panel.querySelector('.st-status');
      const done = function (ok) { status.textContent = ok ? 'Copied to clipboard ✅' : 'Copy failed — select the box and copy manually'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(panel, done); });
      } else {
        fallbackCopy(panel, done);
      }
    });

    document.body.appendChild(panel);
    refreshOutput(panel);
  }

  function fallbackCopy(panel, done) {
    const out = panel.querySelector('.st-out');
    out.focus();
    out.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    done(ok);
  }

  document.addEventListener('printables:rendered', build);
  // In case the gallery rendered before this listener attached.
  if (document.readyState !== 'loading') {
    setTimeout(build, 0);
  } else {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(build, 0); });
  }
})();
