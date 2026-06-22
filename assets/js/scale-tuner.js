/*
 * Dev-only layout tuner for the printable sticker gallery.
 *
 * Hidden from normal visitors. Activate by adding ?tune (or #tune) to the URL,
 * e.g. http://localhost:8000/?tune. Per sticker it gives:
 *   - a preview scale slider (shrinks the card image),
 *   - a bottom-box slider (the white .printable-card-body padding),
 *   - a "center" checkbox (center the Download button vs. full width).
 * Then a button copies the resulting values to paste into the manifest. All of
 * it is preview/layout only — it never touches the print masters or PDFs.
 */
(function () {
  'use strict';

  const active = /(^|[?&])tune(=|&|$)/.test(window.location.search) || window.location.hash === '#tune';
  if (!active) return;

  const SCALE_MIN = 0.3, SCALE_MAX = 1, SCALE_STEP = 0.01;
  const BOX_MIN = 0, BOX_MAX = 48, BOX_STEP = 1;
  const BODY_PAD_DEFAULT = 12;

  const state = {};        // id -> { scale, pad, center }
  let stickerList = [];    // preserves order + titles
  let built = false;

  function api() { return window.TrollPrintables; }
  function round2(n) { return Math.round(n * 100) / 100; }

  function injectStyles() {
    const css = document.createElement('style');
    css.textContent = `
      #scale-tuner {
        position: fixed; right: 16px; bottom: 16px; z-index: 99998;
        width: min(380px, calc(100vw - 24px)); max-height: 80vh;
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
      .st-row { padding: 10px 0; border-bottom: 0.5px solid rgba(255,255,255,0.08); }
      .st-row:last-child { border-bottom: 0; }
      .st-row-top { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
      .st-name { font-weight: 600; }
      .st-val { font-family: 'DM Mono', monospace; opacity: 0.85; min-width: 40px; text-align: right; }
      .st-controls { display: flex; align-items: center; gap: 8px; }
      .st-controls input[type=range] { flex: 1; accent-color: #5856d6; min-width: 60px; }
      .st-sub-controls { margin-top: 6px; flex-wrap: wrap; }
      .st-sub { font-size: 11px; opacity: 0.7; min-width: 22px; }
      .st-box-val { min-width: 42px; }
      .st-center { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; opacity: 0.9; white-space: nowrap; cursor: pointer; }
      .st-center input { accent-color: #5856d6; }
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
        width: 100%; height: 120px; resize: vertical;
        font-family: 'DM Mono', monospace; font-size: 11px; line-height: 1.45;
        background: #0c0e15; color: #cfe3ff; border: 0.5px solid rgba(255,255,255,0.14);
        border-radius: 8px; padding: 8px; white-space: pre;
      }
      .st-status { margin-top: 6px; min-height: 14px; font-size: 11px; opacity: 0.8; }
    `;
    document.head.appendChild(css);
  }

  function buildSnippet() {
    const lines = [];
    stickerList.forEach(function (s) {
      const st = state[s.id] || {};
      const parts = [];
      if (round2(st.scale) < 1) parts.push('previewScale ' + round2(st.scale));
      if (Number(st.pad) !== BODY_PAD_DEFAULT) parts.push('bodyPad ' + Number(st.pad));
      if (st.center) parts.push('centerButton true');
      if (parts.length) lines.push('  ' + (s.id + ':').padEnd(22) + parts.join(', '));
    });
    if (!lines.length) return '// all stickers at defaults';
    return '// apply per sticker -> assets/data/stickers.json\n' + lines.join('\n');
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
    stickerList = stickers;
    injectStyles();

    const panel = document.createElement('div');
    panel.id = 'scale-tuner';
    panel.innerHTML =
      '<div class="st-head">' +
        '<span class="st-title">Layout tuner <small>preview only · ?tune</small></span>' +
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
    const resetters = [];

    stickers.forEach(function (s) {
      const initScale = (Number(s.previewScale) > 0 && Number(s.previewScale) <= 1) ? Number(s.previewScale) : 1;
      const initPad = (s.bodyPad != null && isFinite(Number(s.bodyPad))) ? Number(s.bodyPad) : BODY_PAD_DEFAULT;
      const initCenter = !!s.centerButton;
      state[s.id] = { scale: initScale, pad: initPad, center: initCenter };

      const row = document.createElement('div');
      row.className = 'st-row';
      row.innerHTML =
        '<div class="st-row-top"><span class="st-name"></span><span class="st-val st-scale-val"></span></div>' +
        '<div class="st-controls">' +
          '<input type="range" class="st-scale" min="' + SCALE_MIN + '" max="' + SCALE_MAX + '" step="' + SCALE_STEP + '">' +
          '<button class="st-reset st-scale-reset" type="button">1.0</button>' +
        '</div>' +
        '<div class="st-controls st-sub-controls">' +
          '<span class="st-sub">box</span>' +
          '<input type="range" class="st-box" min="' + BOX_MIN + '" max="' + BOX_MAX + '" step="' + BOX_STEP + '">' +
          '<span class="st-val st-box-val"></span>' +
          '<label class="st-center"><input type="checkbox" class="st-center-cb"> center</label>' +
        '</div>';
      row.querySelector('.st-name').textContent = s.title || s.id;

      const range = row.querySelector('.st-scale');
      const scaleVal = row.querySelector('.st-scale-val');
      const box = row.querySelector('.st-box');
      const boxVal = row.querySelector('.st-box-val');
      const cb = row.querySelector('.st-center-cb');
      range.value = initScale; scaleVal.textContent = initScale.toFixed(2);
      box.value = initPad; boxVal.textContent = initPad + 'px';
      cb.checked = initCenter;

      function applyScale(v) { state[s.id].scale = v; scaleVal.textContent = v.toFixed(2); if (helper.setPreviewScale) helper.setPreviewScale(s.id, v); refreshOutput(panel); }
      function applyPad(px) { state[s.id].pad = px; boxVal.textContent = px + 'px'; if (helper.setBodyPad) helper.setBodyPad(s.id, px); refreshOutput(panel); }
      function applyCenter(on) { state[s.id].center = on; if (helper.setCenterButton) helper.setCenterButton(s.id, on); refreshOutput(panel); }

      range.addEventListener('input', function () { applyScale(parseFloat(range.value)); });
      box.addEventListener('input', function () { applyPad(parseInt(box.value, 10)); });
      cb.addEventListener('change', function () { applyCenter(cb.checked); });
      row.querySelector('.st-scale-reset').addEventListener('click', function () { range.value = 1; applyScale(1); });

      resetters.push(function () {
        range.value = 1; applyScale(1);
        box.value = BODY_PAD_DEFAULT; applyPad(BODY_PAD_DEFAULT);
        cb.checked = false; applyCenter(false);
      });

      body.appendChild(row);
    });

    panel.querySelector('.st-collapse').addEventListener('click', function () {
      panel.classList.toggle('is-collapsed');
    });

    panel.querySelector('.st-reset-all').addEventListener('click', function () {
      resetters.forEach(function (fn) { fn(); });
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
  if (document.readyState !== 'loading') {
    setTimeout(build, 0);
  } else {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(build, 0); });
  }
})();
