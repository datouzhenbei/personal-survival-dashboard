/**
 * index.js — 核心模块统一入口
 * UI 层（由 Trae 生成）通过此文件引入所需 API：
 *
 *   import { Config, Storage, LifeCountdown, SavingsCalculator } from './js/core/index.js';
 *
 * 完整数据契约见 UI-REQUIREMENTS.md「与核心 JS 的数据绑定契约」一节。
 */
export { Config } from './config.js';
export { Storage } from './storage.js';
export { LifeCountdown } from './life.js';
export { SavingsCalculator } from './savings.js';
