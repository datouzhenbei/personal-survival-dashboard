/**
 * app.js — 应用入口与事件编排
 * 职责：
 *   1. 从 Storage 读取 profile / savings / settings，构建状态
 *   2. 调用 core（LifeCountdown / SavingsCalculator）取得计算结果
 *   3. 调用 render.js 渲染各模块
 *   4. setInterval 每秒仅刷新倒计时文本节点（不重读 localStorage、不整卡重绘）
 *   5. 编排输入失焦存盘、导入（预览确认）/导出（时间戳文件名）/清空/重置、自定义确认框与 Toast
 * 本文件不含任何展示样式与组件结构，也不重复 core 的计算逻辑。
 */
import { Config, Storage, LifeCountdown, SavingsCalculator } from '../core/index.js';
import {
  renderHero,
  renderLifeSection,
  renderSavingsSection,
  renderSettingsSection,
  renderDataSection,
} from './render.js';
import { confirmDialog, previewDialog, showToast } from './components.js';

const APP_VERSION = Config.APP_VERSION;

/* ---------------- DOM 锚点 ---------------- */

const heroEl = document.getElementById('hero');
const lifeEl = document.getElementById('life-module');
const savingsEl = document.getElementById('savings-module');
const settingsEl = document.getElementById('settings-module');
const statusEl = document.getElementById('save-status');
const dataEl = document.getElementById('data-module');
const importInput = document.getElementById('import-file');

/* ---------------- 应用状态 ---------------- */

const state = {
  profile: null, // { birthDate, gender, lifeExpectancy?, retirementAge? }
  savingsCfg: null, // { savings, monthlyExpense, monthlyIncome, inflationRate }
  settings: null, // { currencySymbol, inflationRate, theme }
};

/** 每次全量渲染后生成的每秒刷新函数列表 */
let tickUpdaters = [];
/** 当前生命倒计时实例（每秒 getStats 用） */
let lifeInstance = null;

function defaultSettings() {
  return {
    currencySymbol: Config.DEFAULTS.currencySymbol,
    inflationRate: Config.DEFAULTS.inflationRate,
    theme: 'dark',
  };
}

/** 从 localStorage 重新读取全部状态 */
function readState() {
  state.profile = Storage.load(Config.KEYS.PROFILE, null);
  state.savingsCfg = Storage.load(Config.KEYS.SAVINGS, null);
  state.settings = { ...defaultSettings(), ...(Storage.load(Config.KEYS.SETTINGS, null) || {}) };
}

/* ---------------- 计算结果（全部委托给 core） ---------------- */

let lifeStats = null;
let lifeError = null;
let savingsResult = null;
let savingsStress = null;
let savingsError = null;
let savingsDisplayVals = { monthlyExpense: 0, monthlyIncome: 0 };

function compute() {
  // 生命倒计时
  lifeStats = null;
  lifeError = null;
  lifeInstance = null;
  if (state.profile && state.profile.birthDate) {
    try {
      lifeInstance = new LifeCountdown({
        birthDate: state.profile.birthDate,
        gender: state.profile.gender,
        lifeExpectancy: numOrUndef(state.profile.lifeExpectancy),
        retirementAge: numOrUndef(state.profile.retirementAge),
      });
      lifeStats = lifeInstance.getStats();
    } catch (e) {
      lifeError = friendlyError(e);
    }
  }

  // 存款测算
  savingsResult = null;
  savingsStress = null;
  savingsError = null;
  savingsDisplayVals = { monthlyExpense: 0, monthlyIncome: 0 };
  if (state.savingsCfg) {
    const c = state.savingsCfg;
    savingsDisplayVals = {
      monthlyExpense: Number(c.monthlyExpense) || 0,
      monthlyIncome: Number(c.monthlyIncome) || 0,
    };
    try {
      const calc = new SavingsCalculator({
        savings: Number(c.savings) || 0,
        monthlyExpense: Number(c.monthlyExpense) || 0,
        monthlyIncome: Number(c.monthlyIncome) || 0,
        inflationRate:
          c.inflationRate ?? state.settings.inflationRate ?? Config.DEFAULTS.inflationRate,
      });
      savingsResult = calc.simulate();
      savingsStress = calc.stressTests();
    } catch (e) {
      savingsError = friendlyError(e);
    }
  }
}

function numOrUndef(v) {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return isFinite(n) ? n : undefined;
}

function friendlyError(e) {
  return e && e.message ? e.message : String(e);
}

/* ---------------- 全量渲染 ---------------- */

function buildCtx() {
  return {
    state,
    // 首屏 Hero 卡 B 需要独立的 savingsCfg 判定（render.js 读 ctx.savingsCfg），
    // 缺失会导致「存款可支撑时长」永远显示占位符「——」。
    savingsCfg: state.savingsCfg,
    lifeStats,
    lifeError,
    result: savingsResult,
    stress: savingsStress,
    savingsError,
    symbol: state.settings.currencySymbol || Config.DEFAULTS.currencySymbol,
    cfgVals: savingsDisplayVals,
    // 备份状态：数据安全卡与提醒条据此渲染（V1.1）
    backupStatus: Storage.backupStatus(),
    actions: {
      onProfileCommit: handleProfileCommit,
      onSavingsCommit: handleSavingsCommit,
      onSettingsCommit: handleSettingsCommit,
      resetSettings: handleResetSettings,
      exportData: exportData,
      importData: () => importInput.click(),
      snoozeBackup: snoozeBackup,
    },
  };
}

function fullRender(focusHint = null) {
  readState();
  compute();
  const ctx = buildCtx();

  tickUpdaters = [];
  const upHero = renderHero(heroEl, ctx);
  const upLife = renderLifeSection(lifeEl, ctx);
  renderSavingsSection(savingsEl, ctx);
  renderDataSection(dataEl, ctx);
  renderSettingsSection(settingsEl, ctx);
  if (upHero) tickUpdaters.push(upHero);
  if (upLife) tickUpdaters.push(upLife);

  updateChrome();
  restoreFocus(focusHint);
}

/** 每秒刷新：只更新倒计时相关文本节点 */
function tick() {
  if (!lifeInstance) return;
  let stats;
  try {
    stats = lifeInstance.getStats();
  } catch {
    return;
  }
  for (const update of tickUpdaters) {
    try {
      update(stats);
    } catch (e) {
      console.warn('[tick] 更新失败', e);
    }
  }
}

/* ---------------- 输入提交与校验 ---------------- */

/**
 * 档案提交
 * @returns {null|{field:string,message:string}}
 */
function handleProfileCommit(values, sourceField, focusHint) {
  const gender = ['male', 'female', 'unspecified'].includes(values.gender)
    ? values.gender
    : 'unspecified';

  // 出生日期
  let birthDate = (values.birthDate || '').trim();
  if (!birthDate) {
    return { field: 'birthDate', message: '请选择出生日期' };
  }
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) {
    return { field: 'birthDate', message: '出生日期格式无效' };
  }
  if (d.getTime() > Date.now()) {
    return { field: 'birthDate', message: '出生日期不能晚于当前时间' };
  }

  // 预期寿命 / 退休年龄（留空 = 默认）
  const le = parseOptionalPositive(values.lifeExpectancy);
  if (le.error) return { field: 'lifeExpectancy', message: le.error };
  const ra = parseOptionalPositive(values.retirementAge);
  if (ra.error) return { field: 'retirementAge', message: ra.error };
  if (le.value !== undefined && le.value > Config.LIMITS.maxLifeExpectancy) {
    return { field: 'lifeExpectancy', message: `预期寿命需在 1-${Config.LIMITS.maxLifeExpectancy} 之间` };
  }
  if (ra.value !== undefined && ra.value > Config.LIMITS.maxLifeExpectancy) {
    return { field: 'retirementAge', message: `退休年龄需在 1-${Config.LIMITS.maxLifeExpectancy} 之间` };
  }

  const next = {
    birthDate,
    gender,
    ...(le.value !== undefined ? { lifeExpectancy: le.value } : {}),
    ...(ra.value !== undefined ? { retirementAge: ra.value } : {}),
  };

  if (shallowEqual(next, state.profile || {})) {
    return null; // 无变化
  }
  try {
    // 用 core 做最终防线校验
    // eslint-disable-next-line no-new
    new LifeCountdown(next);
  } catch (e) {
    return { field: sourceField === 'lifeExpectancy' ? 'lifeExpectancy' : 'birthDate', message: friendlyError(e) };
  }
  Storage.save(Config.KEYS.PROFILE, next);
  Storage.markChanged();
  fullRender(focusHint);
  return null;
}

/**
 * 存款参数提交
 * @returns {null|{field:string,message:string}}
 */
function handleSavingsCommit(raw, focusHint) {
  const parsed = {};
  const fieldMap = {
    savings: 'savings',
    monthlyExpense: 'monthlyExpense',
    monthlyIncome: 'monthlyIncome',
  };
  for (const [key, field] of Object.entries(fieldMap)) {
    const str = (raw[key] ?? '').trim();
    if (str === '') {
      parsed[key] = 0;
      continue;
    }
    const n = Number(str);
    if (!isFinite(n)) return { field, message: '请输入有效数字' };
    if (n < 0) return { field, message: '数值不能为负' };
    parsed[key] = n;
  }

  // 通胀率：留空取设置默认
  const infStr = (raw.inflationRate ?? '').trim();
  let inflationRate;
  if (infStr === '') {
    inflationRate = state.settings.inflationRate ?? Config.DEFAULTS.inflationRate;
  } else {
    inflationRate = Number(infStr);
    if (!isFinite(inflationRate)) return { field: 'inflationRate', message: '请输入有效数字' };
    if (inflationRate < 0 || inflationRate > 100) {
      return { field: 'inflationRate', message: '通胀率需在 0-100 之间' };
    }
  }

  const next = { ...parsed, inflationRate };

  // 首次使用：三项金额全为 0 时不建立配置（等用户填入有效数据）
  if (!state.savingsCfg && parsed.savings === 0 && parsed.monthlyExpense === 0 && parsed.monthlyIncome === 0) {
    return null;
  }
  if (shallowEqual(next, state.savingsCfg || {})) return null;

  try {
    // eslint-disable-next-line no-new
    new SavingsCalculator(next);
  } catch (e) {
    return { field: 'savings', message: friendlyError(e) };
  }
  Storage.save(Config.KEYS.SAVINGS, next);
  Storage.markChanged();
  fullRender(focusHint);
  return null;
}

/**
 * 偏好设置提交
 * @returns {null|{field:string,message:string}}
 */
function handleSettingsCommit(raw, focusHint) {
  const symbol = (raw.currencySymbol ?? '').trim();
  if (!symbol) return { field: 'currencySymbol', message: '货币符号不能为空' };
  if (symbol.length > 3) return { field: 'currencySymbol', message: '货币符号最多 3 个字符' };

  const infStr = (raw.inflationRate ?? '').trim();
  let inflationRate = Config.DEFAULTS.inflationRate;
  if (infStr !== '') {
    inflationRate = Number(infStr);
    if (!isFinite(inflationRate)) return { field: 'inflationRate', message: '请输入有效数字' };
    if (inflationRate < 0 || inflationRate > 100) {
      return { field: 'inflationRate', message: '通胀率需在 0-100 之间' };
    }
  }

  const next = { ...(state.settings || defaultSettings()), currencySymbol: symbol, inflationRate, theme: 'dark' };
  if (shallowEqual(next, state.settings || {})) return null;
  Storage.save(Config.KEYS.SETTINGS, next);
  Storage.markChanged();
  fullRender(focusHint);
  return null;
}

async function handleResetSettings() {
  const ok = await confirmDialog({
    title: '重置偏好为默认？',
    message: '货币符号与默认通胀率将恢复为默认值（¥ 与 2.5%）。个人档案与存款数据不受影响。',
    confirmText: '重置',
    danger: false,
  });
  if (!ok) return;
  Storage.save(Config.KEYS.SETTINGS, defaultSettings());
  Storage.markChanged();
  fullRender();
  showToast('偏好已重置为默认', 'success');
}

function parseOptionalPositive(str) {
  const s = (str ?? '').trim();
  if (s === '') return { value: undefined };
  const n = Number(s);
  if (!isFinite(n)) return { error: '请输入有效数字' };
  if (n <= 0) return { error: '需为大于 0 的数字' };
  return { value: n };
}

function shallowEqual(a, b) {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => String(a[k]) === String(b[k]));
}

/* ---------------- 导入 / 导出 / 清空 ---------------- */

function exportData() {
  try {
    if (Storage.countItems() === 0) {
      showToast('还没有可备份的数据', 'info');
      return;
    }
    const json = Storage.exportJSON();
    const fileName = Storage.exportFileName();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // 记录本次导出时间 —— 备份提醒据此判断是否已备份
    Storage.markExported();
    fullRender();
    showToast(`已导出备份 ${fileName}`, 'success');
  } catch (e) {
    console.error(e);
    showToast('导出失败', 'error');
  }
}

/** 备份提醒「稍后再说」：静默 24 小时后不再提示 */
function snoozeBackup() {
  Storage.snoozeBackupReminder();
  fullRender();
  showToast('已推迟提醒', 'info');
}

/**
 * 导入流程（G2 必校验 + G3 预览确认）：
 *   读取 → 解析校验（此步绝不写数据）→ 预览确认 → 白名单写入 → 刷新
 */
function importDataFromFile(file) {
  const reader = new FileReader();
  reader.onerror = () => showToast('导入失败：无法读取文件', 'error');
  reader.onload = async () => {
    const parsed = Storage.parseImport(String(reader.result || ''));

    if (!parsed.ok) {
      showToast(`导入失败：${(parsed.errors && parsed.errors[0]) || '文件格式不正确'}`, 'error');
      return;
    }

    // 判断每一项是「新增」还是「覆盖」
    const items = Object.keys(parsed.data).map((name) => ({
      name,
      action: Storage.load(Config.KEYS[name], null) === null ? 'add' : 'overwrite',
    }));

    const confirmed = await previewDialog({
      fileName: file.name,
      meta: parsed.meta,
      items,
      warnings: parsed.warnings,
      ignoredFields: parsed.ignoredFields,
    });
    if (!confirmed) {
      showToast('已取消导入', 'info');
      return;
    }

    const res = Storage.applyImport(parsed.data);
    if (!res.ok) {
      showToast(`导入失败：${res.error || '写入出错，已保持原数据'}`, 'error');
      return;
    }

    Storage.markChanged();
    fullRender();
    showToast(`导入成功，已写入 ${res.written.length} 项数据`, 'success');
  };
  reader.readAsText(file);
}

async function clearAllData() {
  const ok = await confirmDialog({
    title: '清空全部数据？',
    message: '将删除本设备上所有档案、存款测算与偏好设置，且无法恢复。建议先导出 JSON 备份。',
    confirmText: '全部清空',
    danger: true,
  });
  if (!ok) return;
  Storage.clearAll();
  Storage.markChanged();
  fullRender();
  showToast('全部数据已清空', 'success');
}

/* ---------------- 页头/页脚等静态外壳更新 ---------------- */

function updateChrome() {
  const hasData = Storage.hasData();
  statusEl.classList.toggle('is-saved', hasData);
  statusEl.querySelector('.save-status__text').textContent = hasData ? '已保存到本机' : '尚未保存';
  statusEl.querySelector('.dot').setAttribute('aria-label', hasData ? '已保存' : '未保存');
}

function initChrome() {
  // 页脚：免责声明必须取 Config 全文
  document.getElementById('footer-disclaimer').textContent = Config.DISCLAIMER;
  document.getElementById('app-version').textContent = APP_VERSION;

  // 页脚仓库链接：地址写在 index.html 的 href 上（合并阶段已配置），不再拦截点击。

  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import').addEventListener('click', () => importInput.click());
  document.getElementById('btn-clear').addEventListener('click', clearAllData);

  importInput.addEventListener('change', () => {
    const file = importInput.files && importInput.files[0];
    if (file) importDataFromFile(file);
    importInput.value = '';
  });
}

/** 渲染后恢复键盘焦点（id 或 chip:value） */
function restoreFocus(hint) {
  if (!hint) return;
  let target = null;
  if (hint.startsWith('chip:')) {
    target = document.querySelector(`.chip[data-value="${CSS.escape(hint.slice(5))}"]`);
  } else {
    target = document.getElementById(hint);
  }
  if (target && typeof target.focus === 'function') {
    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }
  }
}

/* ---------------- 启动 ---------------- */

function init() {
  initChrome();
  readState();
  fullRender();
  setInterval(tick, 1000);
}

init();
