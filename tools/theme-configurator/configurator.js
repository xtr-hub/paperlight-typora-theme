const DEFAULTS = {
  accentColor: '#5b7cfa',
  pageBg: 'none',
  pageBgSize: 'cover',
  pageBgPosition: 'center',
  pageBgRepeat: 'no-repeat',
  pageBgOverlay: 60,
  pageBgX: 50,
  pageBgY: 50,
  pageBgCustom: '',
  pageBgUrl: '',
  watermarkEnabled: true,
  watermarkImage: 'mutou2.gif',
  watermarkCustom: '',
  watermarkUrl: '',
  watermarkAnchor: 'bottom-right',
  watermarkSize: 108,
  watermarkOpacity: 1,
  watermarkRight: 22,
  watermarkBottom: 38,
  fontFace: 'sans',
  displayFont: true,
  fontSize: 16,
  lineHeight: 1.75,
  contentWidth: 840,
  radius: 6,
  shadow: 'soft',
  h1Rule: true,
  h2Border: true,
  focusDim: 65,
};

const PRESETS = {
  quiet: { ...DEFAULTS },
  sakura: {
    ...DEFAULTS,
    accentColor: '#d96c9e',
    watermarkImage: 'mutou2.gif',
    radius: 10,
  },
  mint: {
    ...DEFAULTS,
    accentColor: '#4f9d69',
    watermarkImage: 'mutou.gif',
    radius: 6,
  },
  lavender: {
    ...DEFAULTS,
    accentColor: '#8a6fd1',
    watermarkImage: 'mutou2.gif',
    radius: 10,
    contentWidth: 880,
  },
  mono: {
    ...DEFAULTS,
    accentColor: '#6b7280',
    watermarkEnabled: false,
    radius: 0,
    shadow: 'none',
    h2Border: false,
  },
};

const FONT_STACKS = {
  sans: '"Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", -apple-system, BlinkMacSystemFont, sans-serif',
  serif: '"Source Han Serif SC", "Noto Serif SC", "Songti SC", SimSun, Georgia, serif',
};

const state = { ...DEFAULTS, previewTheme: 'light' };

const $ = (id) => document.getElementById(id);
const preview = $('preview');
let themeDirectory = null;
let previewReady = false;
let updateTimer = null;
let saveTimer = null;
let editRevision = 0;
let saveQueue = Promise.resolve();
let storageWarningShown = false;
const imageLoadGeneration = { pageBg: 0, watermarkImage: 0 };

function warnStorage() {
  if (storageWarningShown) return;
  storageWarningShown = true;
  const warning = document.createElement('p');
  warning.className = 'status error';
  warning.setAttribute('role', 'alert');
  warning.textContent = '浏览器本地存储不可用或空间不足；当前调整仍可使用，刷新前请导出配置。';
  $('status').after(warning);
}

const settingsDb = new Promise((resolve, reject) => {
  if (!window.indexedDB) { reject(new Error('本地存储不可用')); return; }
  const request = window.indexedDB.open('onelight-configurator', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('settings');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error('本地存储被其他页面占用'));
});

function settingsTransaction(mode, operation) {
  return settingsDb.then(db => new Promise((resolve, reject) => {
    const tx = db.transaction('settings', mode);
    const request = operation(tx.objectStore('settings'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('事务中止'));
  }));
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const snapshot = { version: 1, settings: { ...state } };
    saveQueue = saveQueue.catch(() => {}).then(() => settingsTransaction('readwrite', store => store.put(snapshot, 'latest')))
      .catch(() => {
        warnStorage();
      });
  }, 250);
}

function markEdited() { editRevision += 1; scheduleSave(); }

const TEXT_INPUTS = [
  'accentColor', 'pageBg', 'pageBgSize', 'pageBgPosition', 'pageBgRepeat',
  'watermarkImage', 'fontFace', 'shadow',
];
const CHECKBOXES = ['watermarkEnabled', 'displayFont', 'h1Rule', 'h2Border'];
const RANGE_INPUTS = [
  'pageBgX', 'pageBgY', 'pageBgOverlay',
  'watermarkSize', 'watermarkOpacity', 'watermarkRight', 'watermarkBottom',
  'fontSize', 'lineHeight', 'contentWidth', 'radius', 'focusDim',
];
const OUTPUTS = {
  pageBgX: 'pageBgXValue',
  pageBgY: 'pageBgYValue',
  pageBgOverlay: 'pageBgOverlayValue',
  watermarkSize: 'watermarkSizeValue',
  watermarkOpacity: 'watermarkOpacityValue',
  watermarkRight: 'watermarkRightValue',
  watermarkBottom: 'watermarkBottomValue',
  fontSize: 'fontSizeValue',
  lineHeight: 'lineHeightValue',
  contentWidth: 'contentWidthValue',
  radius: 'radiusValue',
  focusDim: 'focusDimValue',
};

function setStatus(message, isError = false) {
  const el = $('status');
  el.textContent = message;
  el.classList.toggle('error', isError);
}

function syncOutputs() {
  $('watermarkSizeValue').value = state.watermarkSize;
  $('watermarkOpacityValue').value = Math.round(state.watermarkOpacity * 100);
  $('watermarkRightValue').value = state.watermarkRight;
  $('watermarkBottomValue').value = state.watermarkBottom;
  $('fontSizeValue').value = state.fontSize;
  $('lineHeightValue').value = state.lineHeight;
  $('contentWidthValue').value = state.contentWidth;
  $('radiusValue').value = state.radius;
  $('focusDimValue').value = state.focusDim;
}

function syncControls() {
  for (const id of TEXT_INPUTS) $(id).value = state[id];
  for (const id of CHECKBOXES) $(id).checked = Boolean(state[id]);
  for (const id of RANGE_INPUTS) $(id).value = id === 'watermarkOpacity' ? state[id] * 100 : state[id];
  for (const id of ['pageBgUrl', 'watermarkUrl', 'watermarkAnchor']) if ($(id)) $(id).value = state[id];
  for (const id of Object.keys(OUTPUTS)) {
    const out = $(OUTPUTS[id]);
    if (out) out.value = id === 'watermarkOpacity' ? Math.round(state[id] * 100) : state[id];
  }
  for (const button of document.querySelectorAll('.theme-btn')) {
    button.classList.toggle('active', button.dataset.previewTheme === state.previewTheme);
  }
}

function readState() {
  for (const id of TEXT_INPUTS) state[id] = $(id).value;
  for (const id of CHECKBOXES) state[id] = $(id).checked;
  for (const id of RANGE_INPUTS) state[id] = Number($(id).value);
  state.watermarkOpacity = Number($('watermarkOpacity').value) / 100;
  for (const id of ['pageBgUrl', 'watermarkUrl', 'watermarkAnchor']) if ($(id)) state[id] = $(id).value.trim();
  syncOutputs();
  for (const id of ['pageBgX', 'pageBgY', 'pageBgOverlay']) if ($(OUTPUTS[id])) $(OUTPUTS[id]).value = state[id];
}

function imageValue(selection, custom, remote, assetPrefix) {
  if (selection === 'none') return 'none';
  let value;
  if (selection === 'custom') value = custom;
  else if (selection === 'url') {
    try { const parsed = new URL(remote); value = ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : ''; } catch { value = ''; }
  } else {
    const builtins = ['mutou.gif', 'mutou2.gif'];
    value = builtins.includes(selection) ? `${assetPrefix}/${selection}` : '';
  }
  if (!value) return 'none';
  if (selection === 'custom' && !/^data:image\/(png|jpeg|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(value)) return 'none';
  return `url(${JSON.stringify(value).replace(/</g, '\\3c ')})`;
}

function validateImages() {
  for (const [label, selection, custom, remote] of [
    ['背景', state.pageBg, state.pageBgCustom, state.pageBgUrl],
    ['表情包', state.watermarkEnabled ? state.watermarkImage : 'none', state.watermarkCustom, state.watermarkUrl],
  ]) {
    if ((selection === 'custom' || selection === 'url') && imageValue(selection, custom, remote, '../img') === 'none') {
      setStatus(`${label}图片无效：请选择图片，或输入有效的 HTTP / HTTPS 链接。`, true);
      return false;
    }
  }
  return true;
}

function buildVars(theme) {
  const fontStack = FONT_STACKS[state.fontFace] || FONT_STACKS.sans;
  const radius = Number(state.radius);
  const vars = {
    '--accent': state.accentColor,
    '--accent-strong': `color-mix(in srgb, var(--accent) 82%, ${theme === 'dark' ? 'white' : 'black'})`,
    '--accent-soft': 'color-mix(in srgb, var(--accent) 12%, transparent)',
    '--accent-border': 'color-mix(in srgb, var(--accent) 28%, transparent)',
    '--theme-color': 'var(--accent)',
    '--primary-color': 'var(--accent)',
    '--primary-btn-border-color': 'var(--accent)',
    '--active-file-border-color': 'var(--accent)',
    '--font-sans': fontStack,
    '--font-display': state.displayFont ? '"MiaoZi", "喵字果汁体", var(--font-sans)' : 'var(--font-sans)',
    '--content-font-size': `${state.fontSize}px`,
    '--content-line-height': String(state.lineHeight),
    '--content-width': `${state.contentWidth}px`,
    '--radius-xs': `${Math.max(2, radius - 2)}px`,
    '--radius-sm': `${radius}px`,
    '--radius-md': `${radius + 2}px`,
    '--radius-lg': `${radius + 6}px`,
    '--h1-rule-display': state.h1Rule ? 'block' : 'none',
    '--h2-border-style': state.h2Border ? 'solid' : 'none',
    '--focus-dim-color': `color-mix(in srgb, var(--text-color) ${state.focusDim}%, transparent)`,
    '--blur-text-color': `color-mix(in srgb, var(--text-color) ${state.focusDim}%, transparent)`,
    '--selection-bg': 'color-mix(in srgb, var(--accent) 14%, transparent)',
    '--search-hit-bg': 'color-mix(in srgb, var(--accent) 12%, transparent)',
    '--page-bg-image': imageValue(state.pageBg, state.pageBgCustom, state.pageBgUrl, '../img'),
    '--page-bg-size': state.pageBgSize,
    '--page-bg-position': state.pageBgPosition === 'custom' ? `${state.pageBgX}% ${state.pageBgY}%` : state.pageBgPosition,
    '--page-bg-repeat': state.pageBgRepeat,
    '--page-bg-overlay': `${state.pageBgOverlay}%`,
    '--watermark-image': state.watermarkEnabled ? imageValue(state.watermarkImage, state.watermarkCustom, state.watermarkUrl, '../img') : 'none',
    '--watermark-size': `${state.watermarkSize}px`,
    '--watermark-right': state.watermarkAnchor.endsWith('right') ? `${state.watermarkRight}px` : 'auto',
    '--watermark-left': state.watermarkAnchor.endsWith('left') ? `${state.watermarkRight}px` : 'auto',
    '--watermark-bottom': state.watermarkAnchor.startsWith('bottom') ? `${state.watermarkBottom}px` : 'auto',
    '--watermark-top': state.watermarkAnchor.startsWith('top') ? `${state.watermarkBottom}px` : 'auto',
    '--watermark-opacity': String(state.watermarkOpacity),
  };

  if (state.shadow === 'none') {
    vars['--shadow-soft'] = 'none';
    vars['--shadow-menu'] = 'none';
    vars['--shadow-popover'] = 'none';
  } else {
    vars['--shadow-soft'] = theme === 'dark' ? 'none' : '0 1px 2px rgba(31, 35, 40, 0.04)';
    vars['--shadow-menu'] = theme === 'dark' ? '0 6px 20px rgba(0, 0, 0, 0.35)' : '0 6px 20px rgba(31, 35, 40, 0.08)';
    vars['--shadow-popover'] = theme === 'dark' ? '0 8px 30px rgba(0, 0, 0, 0.45)' : '0 8px 30px rgba(31, 35, 40, 0.10)';
  }

  return vars;
}

function cssFor(theme) {
  const vars = buildVars(theme);
  const body = Object.entries(vars)
    .map(([key, value]) => `    ${key}: ${value};`)
    .join('\n');
  return `/* BEGIN OneLight configurator */\nhtml:root:root {\n${body}\n}\n/* END OneLight configurator */\n`;
}

function updatePreview() {
  if (!previewReady) return;
  const vars = buildVars(state.previewTheme);
  preview.contentWindow.postMessage({
    type: 'config',
    theme: state.previewTheme,
    vars,
  }, '*');
}

function schedulePreview() {
  window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(updatePreview, 60);
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  imageLoadGeneration.pageBg += 1;
  imageLoadGeneration.watermarkImage += 1;
  Object.assign(state, preset);
  syncControls();
  updatePreview();
  markEdited();
  setStatus(`已应用预设：${name}`);
}

function copyText(text, message) {
  if (!validateImages()) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => setStatus(message))
      .catch(() => fallbackCopy(text, message));
  } else {
    fallbackCopy(text, message);
  }
}

function fallbackCopy(text, message) {
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    if (!document.execCommand('copy')) throw new Error('copy failed');
    setStatus(message);
  } catch {
    setStatus('复制失败，请手动下载 CSS。', true);
  } finally {
    area.remove();
  }
}

function downloadFile(name, content, type = 'text/css;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function chooseThemeDirectory() {
  if (!('showDirectoryPicker' in window)) {
    setStatus('当前环境不支持选择目录，请下载 CSS 并手动放入 Typora 主题目录。', true);
    return;
  }
  try {
    themeDirectory = await window.showDirectoryPicker({ mode: 'readwrite' });
    if ($('themeDirectoryStatus')) $('themeDirectoryStatus').textContent = `已选择：${themeDirectory.name}`;
    setStatus('已选择主题目录，点击保存即可写入配置。');
  } catch (error) {
    if (error?.name === 'AbortError') setStatus('已取消选择目录。');
    else setStatus(`选择目录失败：${error?.message || error}`, true);
  }
}

function mergeGenerated(existing, generated) {
  const start = '/* BEGIN OneLight configurator */';
  const end = '/* END OneLight configurator */';
  const first = existing.indexOf(start);
  const last = existing.indexOf(end);
  if (first === -1 && last === -1) return existing + (existing && !existing.endsWith('\n') ? '\n' : '') + generated;
  if (first < 0 || last < first || existing.indexOf(start, first + start.length) !== -1 || existing.indexOf(end, last + end.length) !== -1) {
    throw new Error('现有 CSS 中的配置标记不完整或重复，未修改文件。');
  }
  return existing.slice(0, first) + generated.trimEnd() + existing.slice(last + end.length);
}

async function saveToTypora() {
  if (!validateImages()) return;
  if (!themeDirectory) await chooseThemeDirectory();
  if (!themeDirectory) return;
  const files = [['onelight.user.css', cssFor('light')], ['onelight-dark.user.css', cssFor('dark')]];
  const prepared = [];
  const written = [];
  try {
    for (const [name, generated] of files) {
      let handle, original = null;
      try { handle = await themeDirectory.getFileHandle(name); original = await (await handle.getFile()).text(); }
      catch (error) { if (error.name !== 'NotFoundError') throw error; }
      prepared.push({ name, handle, original, updated: mergeGenerated(original ?? '', generated) });
    }
    for (const file of prepared) {
      file.handle ||= await themeDirectory.getFileHandle(file.name, { create: true });
      written.push(file);
      const writer = await file.handle.createWritable();
      await writer.write(file.updated);
      await writer.close();
    }
    setStatus('已保存浅色和深色配置，原有其他 CSS 已保留。重启 Typora 或切换主题后生效。');
  } catch (error) {
    let rollbackFailed = false;
    for (const file of written.reverse()) {
      try {
        if (file.original === null) await themeDirectory.removeEntry(file.name);
        else { const writer = await file.handle.createWritable(); await writer.write(file.original); await writer.close(); }
      } catch { rollbackFailed = true; }
    }
    setStatus(`保存失败：${error.message || error}。${rollbackFailed ? '自动恢复未完全成功，请检查主题目录中的两个 user CSS。' : '已尝试恢复原文件。'}`, true);
  }
}

function parseSettings(data) {
  if (data.version !== 1 || !data.settings || typeof data.settings !== 'object') throw Error('不支持的配置格式');
  const next = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in data.settings)) continue;
    const value = data.settings[key];
    if (typeof value !== typeof DEFAULTS[key]) throw Error(`参数无效：${key}`);
    if (TEXT_INPUTS.includes(key) && key !== 'accentColor' && !Array.from($(key).options || []).some(option => option.value === value)) throw Error(`参数无效：${key}`);
    if (key === 'accentColor' && !/^#[\da-f]{6}$/i.test(value)) throw Error('颜色格式无效');
    if (RANGE_INPUTS.includes(key)) {
      const el = $(key), number = key === 'watermarkOpacity' ? value * 100 : value;
      if (!Number.isFinite(number) || number < Number(el.min) || number > Number(el.max)) throw Error(`参数超出范围：${key}`);
    }
    if (key.endsWith('Custom') && value && (value.length > Math.ceil(8 * 1024 * 1024 / 3) * 4 + 64 || !/^data:image\/(png|jpeg|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(value))) throw Error('图片格式无效或超过 8 MB');
    if (key === 'watermarkAnchor' && !['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(value)) throw Error('位置无效');
    next[key] = value;
  }
  return next;
}

function bindEvents() {
  for (const id of ['pageBg', 'watermarkImage']) $(id).addEventListener('change', () => { imageLoadGeneration[id] += 1; });
  document.querySelector('.controls').addEventListener('input', event => {
    if (event.target.id !== 'importConfig') markEdited();
  });
  document.querySelector('.controls').addEventListener('change', event => {
    if (event.target.id !== 'importConfig') markEdited();
  });
  for (const id of TEXT_INPUTS) {
    $(id).addEventListener('input', () => {
      readState();
      schedulePreview();
    });
  }
  for (const id of CHECKBOXES) {
    $(id).addEventListener('change', () => {
      readState();
      schedulePreview();
    });
  }
  for (const id of RANGE_INPUTS) {
    $(id).addEventListener('input', () => {
      readState();
      schedulePreview();
    });
  }

  for (const id of ['pageBgUrl', 'watermarkUrl', 'watermarkAnchor']) {
    $(id)?.addEventListener('input', () => {
      if (id === 'pageBgUrl' && $(id).value.trim()) { imageLoadGeneration.pageBg += 1; $('pageBg').value = 'url'; }
      if (id === 'watermarkUrl' && $(id).value.trim()) { imageLoadGeneration.watermarkImage += 1; $('watermarkImage').value = 'url'; }
      readState(); schedulePreview();
    });
    $(id)?.addEventListener('change', () => { readState(); schedulePreview(); });
  }
  for (const [inputId, selectId, stateKey] of [
    ['pageBgFile', 'pageBg', 'pageBgCustom'], ['watermarkFile', 'watermarkImage', 'watermarkCustom'],
  ]) {
    $(inputId)?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const generation = ++imageLoadGeneration[selectId];
      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'].includes(file.type) || file.size > 8 * 1024 * 1024) {
        setStatus('请选择不超过 8 MB 的 PNG、JPEG、GIF、WebP 或 AVIF 图片。', true);
        event.target.value = '';
        return;
      }
      try {
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file);
        });
        if (generation !== imageLoadGeneration[selectId]) return;
        state[stateKey] = data;
        $(selectId).value = 'custom';
        readState();
        updatePreview();
        markEdited();
        setStatus(`已载入图片：${file.name}。图片会包含在导出的配置中。`);
      } catch (error) { setStatus(`读取图片失败：${error.message || error}`, true); }
    });
  }

  $('chooseThemeDirectory')?.addEventListener('click', chooseThemeDirectory);
  $('exportConfig')?.addEventListener('click', () => {
    downloadFile('onelight-settings.json', JSON.stringify({ version: 1, settings: { ...state, previewTheme: undefined } }, null, 2), 'application/json;charset=utf-8');
    setStatus('已下载配置文件，包含自定义图片。');
  });
  $('importConfig')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 24 * 1024 * 1024) throw Error('配置文件过大');
      const data = JSON.parse(await file.text());
      const next = parseSettings(data);
      imageLoadGeneration.pageBg += 1; imageLoadGeneration.watermarkImage += 1;
      Object.assign(state, next); syncControls(); updatePreview(); markEdited(); setStatus('配置已导入。');
    } catch (error) { setStatus(`导入失败：${error.message || error}`, true); }
    finally { event.target.value = ''; }
  });

  for (const button of document.querySelectorAll('.theme-btn')) {
    button.addEventListener('click', () => {
      state.previewTheme = button.dataset.previewTheme;
      for (const other of document.querySelectorAll('.theme-btn')) {
        other.classList.toggle('active', other === button);
      }
      updatePreview();
      markEdited();
    });
  }

  for (const button of document.querySelectorAll('.preset')) {
    button.addEventListener('click', () => applyPreset(button.dataset.preset));
  }

  $('copyLight').addEventListener('click', () => copyText(cssFor('light'), '已复制浅色 CSS。'));
  $('copyDark').addEventListener('click', () => copyText(cssFor('dark'), '已复制深色 CSS。'));
  $('downloadBoth').addEventListener('click', () => {
    if (!validateImages()) return;
    downloadFile('onelight.user.css', cssFor('light'));
    downloadFile('onelight-dark.user.css', cssFor('dark'));
    setStatus('已下载两个 CSS 文件。');
  });
  $('saveTheme').addEventListener('click', saveToTypora);
}

preview.addEventListener('load', () => {
  previewReady = true;
  updatePreview();
});

window.addEventListener('message', (event) => {
  if (event.source === preview.contentWindow && event.data?.type === 'preview-ready') {
    previewReady = true;
    updatePreview();
  }
});

bindEvents();
syncControls();
setStatus('选择预设或调整参数，右侧会实时预览。');

const initialRevision = editRevision;
settingsTransaction('readonly', store => store.get('latest')).then(saved => {
  if (!saved || editRevision !== initialRevision) return;
  const restored = parseSettings(saved);
  Object.assign(state, restored);
  if (['light', 'dark'].includes(saved.settings.previewTheme)) state.previewTheme = saved.settings.previewTheme;
  syncControls();
  updatePreview();
  setStatus('已恢复上次的设置。主题文件夹需要重新选择。');
}).catch(() => {
  warnStorage();
});
