/* Lex Politica — Template Studio
   Canvas-rendered templates: the preview canvas is the export surface,
   so what the client sees is exactly what downloads. */

const FORMATS = {
  square:    { w: 1080, h: 1080, label: "Square" },
  threefour: { w: 1080, h: 1440, label: "3:4" },
  story:     { w: 1080, h: 1920, label: "Story" },
};

const COLORS = {
  echelon: "#000000",
  heritage: "#ffffff",
  placeholder: "#d9d9d9",
  muted: "#767676",
  mutedInverse: "#b3b3b3",
};

const SANS = '"Helvetica Neue Web", "Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = '"Heldane Text Web", Georgia, serif';

/* ---------- asset loading ---------- */

const assets = {};
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* ---------- text helpers (textBaseline: top everywhere) ---------- */

function setFont(ctx, { size, family, italic = false, tracking = 0 }) {
  ctx.font = `${italic ? "italic " : ""}400 ${size}px ${family}`;
  ctx.letterSpacing = tracking ? `${(tracking * size).toFixed(2)}px` : "0px";
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/* Draws wrapped text from a top-left origin; returns the block height. */
function drawBlock(ctx, text, x, yTop, maxWidth, opts) {
  const { size, lineHeight, color, align = "left" } = opts;
  setFont(ctx, opts);
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.textAlign = align;
  const lines = wrapLines(ctx, text, maxWidth);
  lines.forEach((l, i) => ctx.fillText(l, x, yTop + i * lineHeight));
  ctx.textAlign = "left";
  ctx.letterSpacing = "0px";
  return (lines.length - 1) * lineHeight + size * 1.0;
}

function measureBlock(ctx, text, maxWidth, opts) {
  setFont(ctx, opts);
  const lines = wrapLines(ctx, text, maxWidth);
  ctx.letterSpacing = "0px";
  return { lines: lines.length, height: (lines.length - 1) * opts.lineHeight + opts.size };
}

/* ---------- photo helpers ---------- */

let photoSource = null; // grayscale-processed canvas, shared across templates

function processPhoto(img) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const cx = c.getContext("2d");
  cx.drawImage(img, 0, 0);
  const data = cx.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    px[i] = px[i + 1] = px[i + 2] = g;
  }
  cx.putImageData(data, 0, 0);
  return c;
}

/* Cover-crop draw into a rect. */
function drawCover(ctx, source, x, y, w, h) {
  const sw = source.width, sh = source.height;
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale, ch = h / scale;
  const sx = (sw - cw) / 2, sy = (sh - ch) / 2;
  ctx.drawImage(source, sx, sy, cw, ch, x, y, w, h);
}

function drawPhotoArea(ctx, x, y, w, h, isExport, hint) {
  if (photoSource) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    drawCover(ctx, photoSource, x, y, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = COLORS.placeholder;
    ctx.fillRect(x, y, w, h);
    if (!isExport) {
      setFont(ctx, { size: 28, family: SERIF, italic: true });
      ctx.fillStyle = COLORS.muted;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(hint || "Replace photo", x + w / 2, y + h / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
    }
  }
}

function drawGriffin(ctx, variant, x, y, w) {
  const img = variant === "white" ? assets.griffinWhite : assets.griffinBlack;
  const h = w * (1038.7 / 1080);
  ctx.drawImage(img, x, y, w, h);
  return h;
}

function drawLockup(ctx, variant, x, y, w) {
  const img = variant === "white" ? assets.lockupWhite : assets.lockupBlack;
  const h = w * (155.5 / 1080);
  ctx.drawImage(img, x, y, w, h);
  return h;
}

/* ---------- templates ---------- */

const TEMPLATES = [
  {
    id: "statement",
    name: "01 Statement",
    hasPhoto: false,
    fields: [
      { key: "kicker", label: "Kicker", max: 30, value: "Firm Announcement" },
      { key: "headline", label: "Headline", max: 90, multiline: true,
        value: "Decisions begin here. Our new Washington, D.C. office is now open." },
    ],
    render(ctx, W, H, s, isExport) {
      const M = 96;
      ctx.fillStyle = COLORS.echelon;
      ctx.fillRect(0, 0, W, H);

      drawBlock(ctx, s.kicker, M, M, W - M * 2,
        { size: 26, lineHeight: 34, family: SERIF, color: COLORS.heritage, tracking: 0.01 });

      const headOpts = { size: 72, lineHeight: 72 * 1.15, family: SERIF, color: COLORS.heritage };
      const m = measureBlock(ctx, s.headline, 820, headOpts);
      drawBlock(ctx, s.headline, M, (H - m.height) / 2, 820, headOpts);

      setFont(ctx, { size: 24, family: SERIF });
      ctx.fillStyle = COLORS.mutedInverse;
      ctx.textBaseline = "bottom";
      ctx.fillText("lexpolitica.com", M, H - M + 24);
      ctx.textBaseline = "top";
      const gw = 72, gh = gw * (1038.7 / 1080);
      drawGriffin(ctx, "white", W - M - gw, H - M + 24 - gh, gw);
    },
  },
  {
    id: "editorial",
    name: "02 Editorial",
    hasPhoto: true,
    photoHint: "Replace photo — black & white, high contrast",
    fields: [
      { key: "headline", label: "Headline", max: 80, multiline: true,
        value: "Navigate beyond now. Representing ambitious & high-profile changemakers." },
      { key: "body1", label: "Body — left column", max: 180, multiline: true,
        value: "Lex Politica operates where others simply don't. Trusted by leaders whose names you recognize—and many you don't—we engage in critical matters of policy, regulation, and politics." },
      { key: "body2", label: "Body — right column", max: 180, multiline: true,
        value: "Our clients know that meaningful outcomes require strategy, not spectacle; our success is measured only by theirs." },
    ],
    render(ctx, W, H, s, isExport) {
      const M = 72;
      ctx.fillStyle = COLORS.heritage;
      ctx.fillRect(0, 0, W, H);

      setFont(ctx, { size: 40, family: SERIF });
      ctx.fillStyle = COLORS.echelon;
      ctx.textBaseline = "top";
      ctx.fillText("Lex Politica", M, M);
      setFont(ctx, { size: 24, family: SERIF });
      ctx.textAlign = "right";
      ctx.fillText("lexpolitica.com", W - M, M + 16);
      ctx.textAlign = "left";

      const ruleY = M + 50 + 18;
      ctx.fillStyle = COLORS.echelon;
      ctx.fillRect(M, ruleY, W - M * 2, 3);

      let y = ruleY + 3 + 40;
      const hH = drawBlock(ctx, s.headline, M, y, W - M * 2,
        { size: 76, lineHeight: 76 * 1.1, family: SANS, color: COLORS.echelon, tracking: -0.02 });
      y += hH + 44;

      const gap = 48;
      const colW = (W - M * 2 - gap) / 2;
      const bodyOpts = { size: 28, lineHeight: 28 * 1.35, family: SERIF, color: COLORS.echelon };
      const h1 = drawBlock(ctx, s.body1, M, y, colW, bodyOpts);
      const h2 = drawBlock(ctx, s.body2, M + colW + gap, y, colW, bodyOpts);
      const gTop = y + h2 + 24;
      const gh = drawGriffin(ctx, "black", M + colW + gap, gTop, 60);

      const photoTop = Math.max(y + h1, gTop + gh) + 44;
      drawPhotoArea(ctx, M, photoTop, W - M * 2, H - M - photoTop, isExport, this.photoHint);
    },
  },
  {
    id: "portrait",
    name: "03 Portrait",
    hasPhoto: true,
    photoHint: "Replace photo — black & white portrait",
    fields: [
      { key: "kicker", label: "Kicker", max: 36, value: "Welcoming Our New Partner" },
      { key: "name", label: "Name", max: 24, value: "Jenny Kim" },
      { key: "detail", label: "Detail line", max: 60,
        value: "Partner, Political Law — Washington, D.C." },
    ],
    render(ctx, W, H, s, isExport) {
      const M = 72;
      const story = H >= 1920;
      const bandH = story ? 680 : 480;
      ctx.fillStyle = COLORS.heritage;
      ctx.fillRect(0, 0, W, H);
      drawPhotoArea(ctx, 0, 0, W, H - bandH, isExport, this.photoHint);

      let y = H - bandH + (story ? 80 : 64);
      y += drawBlock(ctx, s.kicker, M, y, W - M * 2,
        { size: 26, lineHeight: 34, family: SERIF, color: COLORS.echelon, tracking: 0.01 });
      y += story ? 32 : 28;
      y += drawBlock(ctx, s.name, M, y, W - M * 2,
        { size: story ? 96 : 84, lineHeight: (story ? 96 : 84) * 1.08, family: SANS, color: COLORS.echelon, tracking: -0.02 });
      y += story ? 20 : 16;
      drawBlock(ctx, s.detail, M, y, W - M * 2,
        { size: 32, lineHeight: 32 * 1.35, family: SERIF, color: COLORS.echelon });

      const footBottom = H - 56;
      const lockupW = 264, lockupH = lockupW * (155.5 / 1080);
      const ruleY = footBottom - lockupH - 28;
      ctx.fillStyle = COLORS.echelon;
      ctx.fillRect(M, ruleY, W - M * 2, 1);
      drawLockup(ctx, "black", M, footBottom - lockupH, lockupW);
      setFont(ctx, { size: 24, family: SERIF });
      ctx.fillStyle = COLORS.muted;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("lexpolitica.com", W - M, footBottom - 4);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
    },
  },
  {
    id: "fullbleed",
    name: "04 Full-Bleed",
    hasPhoto: true,
    photoHint: "Replace photo — full-bleed, black & white",
    fields: [
      { key: "kicker", label: "Kicker", max: 20, value: "Event" },
      { key: "headline", label: "Headline", max: 70, multiline: true,
        value: "Join us at the National Policy Forum, October 14." },
    ],
    render(ctx, W, H, s, isExport) {
      const M = 72;
      drawPhotoArea(ctx, 0, 0, W, H, isExport, this.photoHint);

      const headOpts = { size: 56, lineHeight: 56 * 1.12, family: SANS, color: COLORS.heritage, tracking: -0.02 };
      const hm = measureBlock(ctx, s.headline, 760, headOpts);
      const bandH = 56 + 34 + 16 + hm.height + 56;
      const bandTop = H - bandH;
      ctx.fillStyle = COLORS.echelon;
      ctx.fillRect(0, bandTop, W, bandH);

      let y = bandTop + 56;
      y += drawBlock(ctx, s.kicker, M, y, W - M * 2,
        { size: 26, lineHeight: 34, family: SERIF, color: COLORS.mutedInverse, tracking: 0.01 });
      y += 16;
      drawBlock(ctx, s.headline, M, y, 760, headOpts);

      const gw = 64, gh = gw * (1038.7 / 1080);
      drawGriffin(ctx, "white", W - M - gw, H - 56 - gh, gw);
    },
  },
  {
    id: "diagonal",
    name: "05 News Diagonal",
    hasPhoto: true,
    photoHint: "Replace photo",
    fields: [
      { key: "headline", label: "Headline", max: 90, multiline: true,
        value: "Lex Politica secures landmark ruling in federal campaign finance case." },
    ],
    render(ctx, W, H, s, isExport) {
      ctx.fillStyle = COLORS.heritage;
      ctx.fillRect(0, 0, W, H);

      const panelW = 560;
      const x0 = W - panelW;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(W, 0);
      ctx.lineTo(W, H);
      ctx.lineTo(x0 + panelW * 0.42, H);
      ctx.closePath();
      ctx.clip();
      if (photoSource) {
        drawCover(ctx, photoSource, x0, 0, panelW, H);
      } else {
        ctx.fillStyle = COLORS.placeholder;
        ctx.fillRect(x0, 0, panelW, H);
        if (!isExport) {
          setFont(ctx, { size: 28, family: SERIF, italic: true });
          ctx.fillStyle = COLORS.muted;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("Replace photo", x0 + panelW / 2 + 60, H * 0.5);
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
        }
      }
      ctx.restore();

      const colX = 72;
      const colW = 600 - 144;
      const headOpts = { size: 48, lineHeight: 48 * 1.18, family: SANS, color: COLORS.echelon, tracking: -0.02 };
      const hm = measureBlock(ctx, s.headline, colW, headOpts);
      const accent = 52, accentH = accent * (1038.7 / 1080);
      const blockH = accentH + 36 + hm.height + 36 + 24;
      let y = (H - blockH) / 2;
      drawGriffin(ctx, "black", colX, y, accent);
      y += accentH + 36;
      y += drawBlock(ctx, s.headline, colX, y, colW, headOpts);
      y += 36;
      setFont(ctx, { size: 24, family: SERIF });
      ctx.fillStyle = COLORS.muted;
      ctx.fillText("lexpolitica.com", colX, y);

      const gw = 420, gh = gw * (1038.7 / 1080);
      drawGriffin(ctx, "white", W - gw + 90, H - gh + 70, gw);
    },
  },
];

/* ---------- state ---------- */

const state = {
  template: "portrait",
  format: "square",
  zoom: null, // null = fit to stage; otherwise a scale factor of actual pixels
  values: {}, // per-template field values
};
for (const t of TEMPLATES) {
  state.values[t.id] = {};
  for (const f of t.fields) state.values[t.id][f.key] = f.value;
}

function currentTemplate() {
  return TEMPLATES.find((t) => t.id === state.template);
}

/* ---------- rendering ---------- */

const previewCanvas = document.getElementById("preview");

function renderPreview() {
  const { w, h } = FORMATS[state.format];
  if (previewCanvas.width !== w) previewCanvas.width = w;
  if (previewCanvas.height !== h) previewCanvas.height = h;
  const ctx = previewCanvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  const t = currentTemplate();
  t.render(ctx, w, h, state.values[t.id], false);
  layoutPreview();
}

/* ---------- zoom ---------- */

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 2;

function fitScale() {
  const scroll = document.getElementById("stage-scroll");
  const { w, h } = FORMATS[state.format];
  const availW = scroll.clientWidth - 80;
  const availH = scroll.clientHeight - 80;
  return Math.min(1, availW / w, availH / h);
}

function currentScale() {
  return state.zoom ?? fitScale();
}

function layoutPreview() {
  const { w } = FORMATS[state.format];
  const scale = currentScale();
  previewCanvas.style.width = `${Math.round(w * scale)}px`;
  document.getElementById("zoom-level").textContent = `${Math.round(scale * 100)}%`;
  document.getElementById("zoom-fit").classList.toggle("active", state.zoom === null);
}

function setupZoom() {
  const step = (dir) => {
    const next = currentScale() * (dir > 0 ? 1.25 : 0.8);
    state.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    layoutPreview();
  };
  document.getElementById("zoom-in").addEventListener("click", () => step(1));
  document.getElementById("zoom-out").addEventListener("click", () => step(-1));
  document.getElementById("zoom-fit").addEventListener("click", () => {
    state.zoom = null;
    layoutPreview();
  });
}

function renderThumb(t, canvas) {
  const w = 216, h = 216;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(w / 1080, h / 1080);
  t.render(ctx, 1080, 1080, state.values[t.id], true);
  ctx.restore();
}

function renderThumbs() {
  document.querySelectorAll(".template-item").forEach((el) => {
    const t = TEMPLATES.find((x) => x.id === el.dataset.template);
    renderThumb(t, el.querySelector("canvas"));
  });
}

/* ---------- UI construction ---------- */

function buildRail() {
  const list = document.getElementById("template-list");
  list.innerHTML = "";
  for (const t of TEMPLATES) {
    const item = document.createElement("div");
    item.className = "template-item" + (t.id === state.template ? " selected" : "");
    item.dataset.template = t.id;
    const thumb = document.createElement("canvas");
    thumb.className = "thumb";
    const cap = document.createElement("div");
    cap.className = "thumb-caption";
    cap.textContent = t.name;
    item.append(thumb, cap);
    item.addEventListener("click", () => {
      state.template = t.id;
      document.querySelectorAll(".template-item").forEach((el) =>
        el.classList.toggle("selected", el.dataset.template === t.id));
      buildFields();
      renderPreview();
    });
    list.appendChild(item);
    renderThumb(t, thumb);
  }
}

function buildFields() {
  const t = currentTemplate();
  const wrap = document.getElementById("fields");
  wrap.innerHTML = "";
  for (const f of t.fields) {
    const field = document.createElement("div");
    field.className = "field";
    const label = document.createElement("span");
    label.className = "field-label";
    label.textContent = f.label;
    const input = document.createElement(f.multiline ? "textarea" : "input");
    if (!f.multiline) input.type = "text";
    input.maxLength = f.max;
    input.value = state.values[t.id][f.key];
    const count = document.createElement("span");
    count.className = "char-count";
    count.textContent = `${input.value.length}/${f.max}`;
    input.addEventListener("input", () => {
      state.values[t.id][f.key] = input.value;
      count.textContent = `${input.value.length}/${f.max}`;
      renderPreview();
      renderThumbs();
    });
    field.append(label, input, count);
    wrap.appendChild(field);
  }
  document.getElementById("photo-field").style.display = t.hasPhoto ? "" : "none";
}

function buildFormatPicker() {
  const picker = document.getElementById("format-picker");
  picker.querySelectorAll(".format-option").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.format === state.format);
    btn.addEventListener("click", () => {
      state.format = btn.dataset.format;
      picker.querySelectorAll(".format-option").forEach((b) =>
        b.classList.toggle("selected", b === btn));
      renderPreview();
    });
  });
}

/* ---------- photo upload ---------- */

function setupPhoto() {
  const dropzone = document.getElementById("dropzone");
  const input = document.getElementById("photo-input");
  const hint = document.getElementById("dropzone-hint");
  const clearBtn = document.getElementById("photo-clear");

  function accept(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    loadImage(url).then((img) => {
      photoSource = processPhoto(img);
      URL.revokeObjectURL(url);
      dropzone.classList.add("has-photo");
      hint.textContent = `${file.name} — converted to b&w`;
      clearBtn.hidden = false;
      renderPreview();
      renderThumbs();
    });
  }

  dropzone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => accept(input.files[0]));
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    accept(e.dataTransfer.files[0]);
  });
  clearBtn.addEventListener("click", () => {
    photoSource = null;
    input.value = "";
    dropzone.classList.remove("has-photo");
    hint.innerHTML = "Drop a photo or browse — converts to b&amp;w";
    clearBtn.hidden = true;
    renderPreview();
    renderThumbs();
  });
}

/* ---------- export ---------- */

function exportImage(type) {
  const { w, h } = FORMATS[state.format];
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  const t = currentTemplate();
  t.render(ctx, w, h, state.values[t.id], true);
  const ext = type === "image/jpeg" ? "jpg" : "png";
  out.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lex-politica-${t.id}-${w}x${h}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, type, type === "image/jpeg" ? 0.92 : undefined);
}

/* ---------- init ---------- */

async function init() {
  const [griffinBlack, griffinWhite, lockupBlack, lockupWhite] = await Promise.all([
    loadImage("assets/griffin-black.svg"),
    loadImage("assets/griffin-white.svg"),
    loadImage("assets/lockup-black.svg"),
    loadImage("assets/lockup-white.svg"),
  ]);
  Object.assign(assets, { griffinBlack, griffinWhite, lockupBlack, lockupWhite });

  await Promise.all([
    document.fonts.load('400 72px "Heldane Text Web"'),
    document.fonts.load('italic 400 28px "Heldane Text Web"'),
    document.fonts.load('400 76px "Helvetica Neue Web"'),
  ]).catch(() => {});
  await document.fonts.ready;

  buildRail();
  buildFields();
  buildFormatPicker();
  setupPhoto();
  setupZoom();
  renderPreview();

  document.getElementById("export-png").addEventListener("click", () => exportImage("image/png"));
  document.getElementById("export-jpeg").addEventListener("click", () => exportImage("image/jpeg"));
  window.addEventListener("resize", layoutPreview);
}

init();
