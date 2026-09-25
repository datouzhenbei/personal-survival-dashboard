/**
 * storage.js — localStorage 封装层
 * 职责：读写、版本管理、导入导出、清空。
 * 所有记录带版本号与时间戳，便于未来 schema 迁移。
 */
import { Config } from './config.js';

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

  /** 清空本应用所有键（不影响其他应用） */
  clearAll() {
    Object.values(Config.KEYS).forEach((k) => this.remove(k));
    return true;
  },

  /** 导出全部数据为可序列化对象 */
  exportAll() {
    const out = {};
    Object.entries(Config.KEYS).forEach(([name, key]) => {
      out[name] = this._read(key, null);
    });
    return {
      app: 'personal-survival-dashboard',
      version: Config.STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      data: out,
    };
  },

  /** 导出 JSON 字符串（供下载备份） */
  exportJSON() {
    return JSON.stringify(this.exportAll(), null, 2);
  },

  /**
   * 从对象或 JSON 字符串导入数据
   * @param {string|object} json
   * @returns {boolean} 是否成功
   */
  importAll(json) {
    try {
      const obj = typeof json === 'string' ? JSON.parse(json) : json;
      const data = (obj && obj.data) || obj;
      if (!data || typeof data !== 'object') return false;
      Object.entries(data).forEach(([name, value]) => {
        const key = Config.KEYS[name];
        if (key && value !== null && value !== undefined) {
          this._write(key, value);
        }
      });
      return true;
    } catch (e) {
      console.error('[Storage] 导入失败', e);
      return false;
    }
  },

  /** 是否存在任一已保存数据 */
  hasData() {
    return Object.values(Config.KEYS).some((k) => localStorage.getItem(k) !== null);
  },
};
