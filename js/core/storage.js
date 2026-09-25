/**
 * storage.js — localStorage 封装层
 * 职责：读写、版本管理、导出（带格式信封）、导入（带校验与逐字段回退）、备份状态、清空。
 * 所有记录带版本号与时间戳，便于未来 schema 迁移。
 *
 * V1.1 新增：
 *   - buildExport() / exportFileName()：导出带 psdExport 信封与时间戳文件名
 *   - parseImport()：纯解析 + 校验，返回结构化结果，**不写任何数据**
 *   - applyImport()：白名单写入，失败自动回滚
 *   - backupStatus() / markExported() / markChanged() / snooze()：备份提醒
 */
import { Config } from './config.js';

/* ---------------- 内部工具 ---------------- */

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * 逐字段校验并清洗单个数据项（对应决策 D3）
 * @returns {{ok:true, value:object} | {ok:false, reason:string}}
 */
function sanitizeItem(name, value, rule, warnings) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, reason: `「${name}」不是对象结构，已忽略该数据项` };
  }

  // 结构宽松型（IMPORT_SCHEMA 为 null）：只做对象检查
  if (!rule) return { ok: true, value };

  const out = {};
  for (const [field, spec] of Object.entries(rule)) {
    const v = value[field];
    const label = `${name}.${field}`;

    // 缺失
    if (v === undefined || v === null || v === '') {
      if (spec.required) {
        return { ok: false, reason: `「${name}」缺少必填项 ${field}，已忽略该数据项` };
      }
      continue;
    }

    if (spec.type === 'date') {
      const s = String(v).trim();
      const d = new Date(s);
      if (isNaN(d.getTime())) {
        if (spec.required) return { ok: false, reason: `「${label}」日期格式无效，已忽略该数据项` };
        warnings.push(`「${label}」日期格式无效，已忽略该字段`);
        continue;
      }
      if (d.getTime() > Date.now()) {
        if (spec.required) return { ok: false, reason: `「${label}」日期晚于当前时间，已忽略该数据项` };
        warnings.push(`「${label}」日期晚于当前时间，已忽略该字段`);
        continue;
      }
      out[field] = s;
      continue;
    }

    if (spec.type === 'enum') {
      if (spec.values.includes(v)) {
        out[field] = v;
      } else {
        warnings.push(
          `「${label}」取值 ${JSON.stringify(v)} 不在允许范围，已回退为 ${JSON.stringify(spec.fallback)}`,
        );
        if ('fallback' in spec) out[field] = spec.fallback;
      }
      continue;
    }

    if (spec.type === 'number') {
      const n = Number(v);
      if (!isFinite(n)) {
        warnings.push(`「${label}」不是有效数字，已回退为 ${JSON.stringify(spec.fallback)}`);
        if ('fallback' in spec) out[field] = spec.fallback;
        continue;
      }
      if (n < spec.min || n > spec.max) {
        warnings.push(
          `「${label}」数值 ${n} 超出允许范围（${spec.min}–${spec.max}），已回退为 ${JSON.stringify(spec.fallback)}`,
        );
        if ('fallback' in spec) out[field] = spec.fallback;
        continue;
      }
      out[field] = n;
      continue;
    }

    if (spec.type === 'string') {
      const s = String(v);
      const tooShort = s.length < (spec.minLen ?? 0);
      const tooLong = s.length > (spec.maxLen ?? Infinity);
      if (tooShort || tooLong) {
        warnings.push(`「${label}」长度不合法，已回退为默认值`);
        if ('fallback' in spec) out[field] = spec.fallback;
        continue;
      }
      out[field] = s;
      continue;
    }

    out[field] = v;
  }
  return { ok: true, value: out };
}

/* ---------------- Storage ---------------- */

export const Storage = {
  /**
   * 内部读取：解析带版本号的记录，失败回退默认值
   */
  _read(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      const parsed = JSON.parse(raw);
      // 带版本号的记录结构：{ __v, __t, data }
      if (parsed && typeof parsed === 'object' && parsed.__v !== undefined && 'data' in parsed) {
        return parsed.data;
      }
      // 兼容旧版裸数据
      return parsed;
    } catch (e) {
      console.warn('[Storage] 读取失败', key, e);
      return defaultValue;
    }
  },

  /**
   * 内部写入：包装为版本记录
   */
  _write(key, data) {
    try {
      const record = { __v: Config.STORAGE_VERSION, __t: Date.now(), data };
      localStorage.setItem(key, JSON.stringify(record));
      return true;
    } catch (e) {
      console.error('[Storage] 写入失败', key, e);
      return false;
    }
  },

  /** 保存单个键 */
  save(key, data) {
    return this._write(key, data);
  },

  /** 读取单个键，缺失时返回 defaultValue */
  load(key, defaultValue) {
    return this._read(key, defaultValue);
  },

  /** 删除单个键 */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  /** 清空本应用所有键（含备份元信息，不影响其他应用） */
  clearAll() {
    Object.values(Config.KEYS).forEach((k) => this.remove(k));
    return true;
  },

  /** 是否存在任一已保存的用户数据（不含备份元信息） */
  hasData() {
    return Config.DATA_FIELD_NAMES.some(
      (name) => localStorage.getItem(Config.KEYS[name]) !== null,
    );
  },

  /** 已保存的数据项数量（0–4） */
  countItems() {
    return Config.DATA_FIELD_NAMES.filter(
      (name) => localStorage.getItem(Config.KEYS[name]) !== null,
    ).length;
  },

  /** 逐项读取用户数据（跳过空值） */
  collectData() {
    const data = {};
    Config.DATA_FIELD_NAMES.forEach((name) => {
      const v = this._read(Config.KEYS[name], null);
      if (v !== null && v !== undefined) data[name] = v;
    });
    return data;
  },

  /* ==================== 导出 ==================== */

  /**
   * 构建导出信封（G1：文件自带格式标记 / schema 版本 / 导出时间）
   */
  buildExport(now = new Date()) {
    const data = this.collectData();
    return {
      psdExport: true,
      formatVersion: Config.EXPORT.FORMAT_VERSION,
      appVersion: Config.APP_VERSION,
      schemaVersion: Config.STORAGE_VERSION,
      exportedAt: now.toISOString(),
      itemCount: Object.keys(data).length,
      data,
    };
  },

  /** 导出 JSON 字符串（供下载备份） */
  exportJSON() {
    return JSON.stringify(this.buildExport(), null, 2);
  },

  /**
   * 导出文件名：psd-backup-YYYYMMDD-HHmmss.json（本地时间）
   * 带秒级时间戳 → 连续导出不会互相覆盖（G1）
   */
  exportFileName(now = new Date()) {
    const stamp =
      `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}` +
      `-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
    return `psd-backup-${stamp}.json`;
  },

  /* ==================== 导入 ==================== */

  /**
   * 解析并校验备份内容 —— **纯函数，绝不写入任何数据**（G2 / G3 前置）
   * @param {string|object} raw 文件文本或对象
   * @returns {{
   *   ok: boolean,
   *   isLegacy: boolean,
   *   meta: {formatVersion:number|null, appVersion:string|null, schemaVersion:number|null, exportedAt:string|null} | null,
   *   data: object|null,
   *   warnings: string[],
   *   errors: string[],
   *   ignoredFields: string[]
   * }}
   */
  parseImport(raw) {
    const warnings = [];
    const errors = [];
    const ignoredFields = [];

    // 体积检查（仅针对字符串输入）
    if (typeof raw === 'string' && raw.length > Config.EXPORT.MAX_IMPORT_BYTES) {
      warnings.push('文件体积异常偏大，可能不是本应用的备份');
    }

    let obj;
    try {
      obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return { ok: false, isLegacy: false, meta: null, data: null, warnings, errors: ['文件不是有效的 JSON，无法解析'], ignoredFields };
    }

    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return { ok: false, isLegacy: false, meta: null, data: null, warnings, errors: ['备份内容不是对象结构'], ignoredFields };
    }

    let payload = null;
    let isLegacy = false;
    let meta = null;

    if (obj.psdExport === true) {
      // —— 新格式（V1.1 信封） ——
      const sv = Number(obj.schemaVersion);
      meta = {
        formatVersion: obj.formatVersion ?? null,
        appVersion: obj.appVersion ?? null,
        schemaVersion: isFinite(sv) ? sv : null,
        exportedAt: obj.exportedAt ?? null,
      };
      if (meta.schemaVersion === null) {
        warnings.push('备份缺少 schemaVersion，已按当前版本尝试导入');
      } else if (meta.schemaVersion > Config.STORAGE_VERSION) {
        // 决策 D1：尽力导入 —— 不拒绝，但明确告知
        warnings.push(
          `此备份由更新版本生成（schema v${meta.schemaVersion} > 当前 v${Config.STORAGE_VERSION}），已尽力导入；未能识别的数据会被忽略`,
        );
      }
      payload = obj.data;
    } else if (obj.__v !== undefined && 'data' in obj) {
      // —— 兼容：单条内部记录被存成文件 ——
      isLegacy = true;
      meta = {
        formatVersion: 0,
        appVersion: null,
        schemaVersion: Number(obj.__v) || 1,
        exportedAt: obj.__t ? new Date(obj.__t).toISOString() : null,
      };
      payload = obj.data;
      warnings.push('已识别为 V1 旧版备份（内部记录结构）');
    } else if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      // —— 兼容：V1.0 的 exportAll 结构 { app, version, exportedAt, data } ——
      isLegacy = true;
      meta = {
        formatVersion: 0,
        appVersion: obj.app ?? null,
        schemaVersion: Number(obj.version) || 1,
        exportedAt: obj.exportedAt ?? null,
      };
      payload = obj.data;
      warnings.push('已识别为 V1 旧版备份（无格式标记）');
    } else {
      return {
        ok: false, isLegacy: false, meta: null, data: null, warnings,
        errors: ['这不是本应用的备份文件（缺少格式标记）'],
        ignoredFields,
      };
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { ok: false, isLegacy, meta, data: null, warnings, errors: ['备份内容为空或结构异常'], ignoredFields };
    }

    // —— 白名单 + 逐字段校验（D1 关键约束：未知字段绝不写入） ——
    const data = {};
    let validCount = 0;

    for (const [name, value] of Object.entries(payload)) {
      if (!Config.DATA_FIELD_NAMES.includes(name)) {
        ignoredFields.push(name);
        continue;
      }
      const rule = Config.IMPORT_SCHEMA[name];
      const res = sanitizeItem(name, value, rule, warnings);
      if (res.ok) {
        data[name] = res.value;
        validCount += 1;
      } else {
        warnings.push(res.reason);
      }
    }

    if (validCount === 0) {
      return {
        ok: false, isLegacy, meta, data: null, warnings,
        errors: ['备份中没有任何可识别的数据项'],
        ignoredFields,
      };
    }

    return { ok: true, isLegacy, meta, data, warnings, errors: [], ignoredFields };
  },

  /**
   * 将解析结果写入 localStorage —— 白名单覆盖式，失败自动回滚
   * 说明：只覆盖备份文件中出现的字段；文件中没有的字段保持不动，避免误删。
   * @param {object} data parseImport 返回的 data
   * @returns {{ok:boolean, written:string[], error?:string}}
   */
  applyImport(data) {
    if (!data || typeof data !== 'object') return { ok: false, written: [], error: '无有效数据' };

    // 先暂存现有值，便于失败回滚
    const backup = {};
    Config.DATA_FIELD_NAMES.forEach((name) => {
      backup[name] = localStorage.getItem(Config.KEYS[name]);
    });

    const written = [];
    try {
      Config.DATA_FIELD_NAMES.forEach((name) => {
        if (data[name] !== undefined) {
          if (!this._write(Config.KEYS[name], data[name])) {
            throw new Error(`写入 ${name} 失败（可能是存储空间不足）`);
          }
          written.push(name);
        }
      });
      return { ok: true, written };
    } catch (e) {
      // 回滚
      Config.DATA_FIELD_NAMES.forEach((name) => {
        try {
          if (backup[name] === null) localStorage.removeItem(Config.KEYS[name]);
          else localStorage.setItem(Config.KEYS[name], backup[name]);
        } catch {
          /* 回滚尽力而为 */
        }
      });
      return { ok: false, written: [], error: e && e.message ? e.message : String(e) };
    }
  },

  /**
   * 旧接口（保留向后兼容）：直接导入
   * @param {string|object} json
   * @returns {boolean}
   */
  importAll(json) {
    const parsed = this.parseImport(json);
    if (!parsed.ok) return false;
    return this.applyImport(parsed.data).ok;
  },

  /* ==================== 备份元信息与提醒（G4 / G5） ==================== */

  getMeta() {
    const m = this._read(Config.KEYS.EXPORT_META, null);
    return m && typeof m === 'object' ? m : {};
  },

  _setMeta(patch) {
    const next = { ...this.getMeta(), ...patch };
    this._write(Config.KEYS.EXPORT_META, next);
    return next;
  },

  /** 记录一次成功导出 */
  markExported(at = Date.now()) {
    return this._setMeta({ lastExportAt: at });
  },

  /** 记录一次数据变更（用于判断“有改动未备份”） */
  markChanged(at = Date.now()) {
    return this._setMeta({ dataChangedAt: at });
  },

  /** 「稍后再说」：静默 N 小时 */
  snoozeBackupReminder(hours = Config.EXPORT.SNOOZE_HOURS, at = Date.now()) {
    return this._setMeta({ snoozeUntil: at + hours * 3600 * 1000 });
  },

  /**
   * 备份状态（供 UI 渲染数据安全卡片与提示条）
   * @param {number} [now]
   */
  backupStatus(now = Date.now()) {
    const meta = this.getMeta();
    const itemCount = this.countItems();
    const lastExportAt = meta.lastExportAt || null;
    const dataChangedAt = meta.dataChangedAt || null;
    const snoozeUntil = meta.snoozeUntil || 0;
    const daysSinceExport =
      lastExportAt !== null ? Math.floor((now - lastExportAt) / 86400000) : null;

    let shouldRemind = false;
    let reason = 'none';
    let message = '';

    if (itemCount > 0) {
      if (lastExportAt === null) {
        shouldRemind = true;
        reason = 'never';
        message = '还没有导出过备份 —— 建议现在导出一份，避免清缓存后数据丢失。';
      } else if (dataChangedAt !== null && dataChangedAt > lastExportAt) {
        shouldRemind = true;
        reason = 'changed';
        message = '有数据改动尚未备份，建议导出一份新的。';
      } else if (daysSinceExport !== null && daysSinceExport >= Config.EXPORT.BACKUP_REMIND_DAYS) {
        shouldRemind = true;
        reason = 'stale';
        message = `距上次备份已 ${daysSinceExport} 天，建议导出新的备份。`;
      }
    }

    // 免打扰窗口
    if (shouldRemind && snoozeUntil > now) shouldRemind = false;

    return {
      itemCount,
      lastExportAt,
      dataChangedAt,
      daysSinceExport,
      snoozeUntil,
      shouldRemind,
      reason,
      message,
    };
  },
};
