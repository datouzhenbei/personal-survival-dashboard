/**
 * config.js — 全局默认配置与常量
 * 仅作为初始默认值，所有数值均可由用户在设置面板中覆盖。
 * 不含任何金融投资建议。
 */
export const Config = {
  // localStorage 键名前缀，避免与其他应用冲突
  STORAGE_PREFIX: 'psd_',
  // 数据 schema 版本，便于未来迁移（备份文件中的 schemaVersion 即此值）
  STORAGE_VERSION: 1,
  // 应用版本，仅用于页脚显示与备份文件溯源
  APP_VERSION: 'v1.2.1',

  KEYS: {
    PROFILE: 'psd_profile',     // 个人档案：出生日期、性别、退休年龄
    LIFE: 'psd_life',           // 生命预期自定义值（可选覆盖）
    SAVINGS: 'psd_savings',     // 存款与收支参数
    SETTINGS: 'psd_settings',   // 偏好：货币、通胀默认值、主题等
    // 备份元信息：最后导出时间、最后数据变更时间、免打扰截止时间。
    // 属于应用自身的状态，不算“用户数据”，因此不参与计数与导出。
    EXPORT_META: 'psd_export_meta',
  },

  /** 用户数据字段白名单：导出、计数、导入写入都只认这些（EXPORT_META 除外） */
  DATA_FIELD_NAMES: ['PROFILE', 'LIFE', 'SAVINGS', 'SETTINGS'],

  /** 导入导出相关常量 */
  EXPORT: {
    FORMAT_VERSION: 1,          // 备份信封格式版本
    MAX_IMPORT_BYTES: 5 * 1024 * 1024, // 超过则提示“文件异常偏大”
    BACKUP_REMIND_DAYS: 14,     // 距上次导出超过该天数即提醒（D2）
    SNOOZE_HOURS: 24,           // 点「稍后再说」后的静默时长
  },

  /**
   * 导入时的字段级校验规则（对应决策 D3：越界逐字段警告 + 回退默认值）
   * - required: 缺失/无效时整项忽略
   * - fallback: 提供则回退到该值，不提供则丢弃该字段（由 core 走默认）
   * - 规则为 null 表示结构宽松，仅要求是对象
   */
  IMPORT_SCHEMA: {
    PROFILE: {
      birthDate: { type: 'date', required: true },
      gender: {
        type: 'enum',
        values: ['male', 'female', 'unspecified'],
        fallback: 'unspecified',
      },
      lifeExpectancy: { type: 'number', min: 1, max: 150 },
      retirementAge: { type: 'number', min: 1, max: 150 },
    },
    LIFE: null,
    SAVINGS: {
      savings: { type: 'number', min: 0, max: 1e12, fallback: 0 },
      monthlyExpense: { type: 'number', min: 0, max: 1e12, fallback: 0 },
      monthlyIncome: { type: 'number', min: 0, max: 1e12, fallback: 0 },
      inflationRate: { type: 'number', min: 0, max: 1000, fallback: 2.5 },
    },
    SETTINGS: {
      currencySymbol: { type: 'string', minLen: 1, maxLen: 3, fallback: '¥' },
      inflationRate: { type: 'number', min: 0, max: 1000, fallback: 2.5 },
      theme: { type: 'enum', values: ['dark'], fallback: 'dark' },
    },
  },

  DEFAULTS: {
    // 预期寿命（年）。参考公开口径（中国 2021 ≈ 78.2 岁，男略低、女略高），
    // 仅作初始默认，用户可在设置中调整。非医疗建议。
    lifeExpectancy: {
      male: 75,
      female: 81,
      unspecified: 78,
    },
    // 法定退休年龄默认参考（中国现行口径，男 60/63、女 50/55，按场景取近似）
    retirementAge: {
      male: 63,
      female: 55,
      unspecified: 60,
    },
    // 默认年化通胀率（%），仅作计算默认值，非预测
    inflationRate: 2.5,
    currency: 'CNY',
    currencySymbol: '¥',
    locale: 'zh-CN',
  },

  // 计算上限，防止极端输入导致死循环
  LIMITS: {
    maxLifeExpectancy: 150,
    maxSimMonths: 1200, // 100 年
    maxSavings: 1e12,
  },

  DISCLAIMER:
    '本工具只把「还能活多久」与「钱还能撑多久」两组数字做本地换算，' +
    '不提供任何金融、投资、医疗或寿命预测建议。' +
    '所有数据仅保存在你的浏览器本地，不上传任何服务器。',

  LIFE_EXPECTANCY_NOTE:
    '默认值参考公开口径（中国 2021 人均预期寿命 ≈ 78.2 岁），仅供参考，可在设置中调整。',
};
