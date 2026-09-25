/**
 * config.js — 全局默认配置与常量
 * 仅作为初始默认值，所有数值均可由用户在设置面板中覆盖。
 * 不含任何金融投资建议。
 */
export const Config = {
  // localStorage 键名前缀，避免与其他应用冲突
  STORAGE_PREFIX: 'psd_',
  // 数据 schema 版本，便于未来迁移
  STORAGE_VERSION: 1,

  KEYS: {
    PROFILE: 'psd_profile',     // 个人档案：出生日期、性别、退休年龄
    LIFE: 'psd_life',           // 生命预期自定义值（可选覆盖）
    SAVINGS: 'psd_savings',    // 存款与收支参数
    SETTINGS: 'psd_settings',  // 偏好：货币、通胀默认值、主题等
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
    '本看板仅为「剩余生命时间」与「存款可支撑时长」的本地计算工具，' +
    '不提供任何金融、投资、医疗或寿命预测建议。' +
    '所有数据仅保存在你的浏览器本地，不上传任何服务器。',

  LIFE_EXPECTANCY_NOTE:
    '默认值参考公开口径（中国 2021 人均预期寿命 ≈ 78.2 岁），仅供参考，可在设置中调整。',
};
