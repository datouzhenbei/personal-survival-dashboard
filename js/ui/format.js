/**
 * format.js — 本地化格式化工具
 * 职责：货币、日期、数字、倒计时时钟等纯展示层格式化。
 * 不包含任何业务计算（所有数值均由 js/core 计算后传入）。
 */

/** 两位补零 */
export function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * 日期格式化为 YYYY-MM-DD
 * @param {Date|null|undefined} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * 货币格式化：¥1,234,567（四舍五入到元，千分位）
 * @param {number} value
 * @param {string} [symbol='¥']
 */
export function formatMoney(value, symbol = '¥') {
  const n = Number(value);
  if (!isFinite(n)) return `${symbol}—`;
  return `${symbol}${Math.round(n).toLocaleString('zh-CN')}`;
}

/** 整数千分位：1,234 */
export function formatInt(value) {
  const n = Number(value);
  if (!isFinite(n)) return '—';
  return Math.round(n).toLocaleString('zh-CN');
}

/** 百分比（保留 1 位小数，整数时不带小数） */
export function formatPercent(value, digits = 1) {
  const n = Number(value);
  if (!isFinite(n)) return '—';
  return `${n.toFixed(digits).replace(/\.0+$/, '')}%`;
}

/** 秒数分解 -> HH:MM:SS */
export function formatClock(hours, minutes, seconds) {
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

/**
 * 可支撑月数展示
 * @param {number} months 可能为 Infinity
 * @param {number} [capMonths] 模拟上限（达到上限视为「N 年以上」）
 * @returns {{ text: string, tone: 'accent'|'success'|'muted' }}
 */
export function formatMonthsLeft(months, capMonths = 1200) {
  if (months === Infinity || !isFinite(months)) {
    return { text: '可持续', tone: 'success' };
  }
  if (months >= capMonths) {
    return { text: `${Math.floor(capMonths / 12)} 年以上`, tone: 'muted' };
  }
  return { text: formatInt(months), tone: 'accent' };
}

/**
 * 日期时间：YYYY-MM-DD HH:mm（备份导出时间展示用）
 * @param {Date|string|number|null|undefined} input
 */
export function formatDateTime(input) {
  if (!input) return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '—';
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * 「距今多少天」文案
 * @param {number|null} days
 * @param {string} [fallback='从未']
 */
export function formatDaysAgo(days, fallback = '从未') {
  if (days === null || days === undefined || !isFinite(days)) return fallback;
  if (days <= 0) return '今天';
  return `${days} 天前`;
}
