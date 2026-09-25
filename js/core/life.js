/**
 * life.js — 生命倒计时计算引擎
 * 输入：出生日期、性别（决定默认预期寿命）、可选自定义预期寿命/退休年龄
 * 输出：已活 / 剩余时间、百分比、下次生日、退休日等
 * 不做寿命预测，仅按用户给定的预期寿命做线性时间换算。
 */
import { Config } from './config.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365.25 * DAY_MS;

export class LifeCountdown {
  /**
   * @param {object} opts
   * @param {string|Date} opts.birthDate  出生日期（必填）
   * @param {string} [opts.gender]        'male' | 'female' | 'unspecified'
   * @param {number} [opts.lifeExpectancy] 自定义预期寿命（年），未给则按性别默认
   * @param {number} [opts.retirementAge]  自定义退休年龄（年），未给则按性别默认
   */
  constructor(opts) {
    if (!opts || !opts.birthDate) {
      throw new Error('LifeCountdown: birthDate 必填');
    }
    this.birthDate =
      opts.birthDate instanceof Date ? opts.birthDate : new Date(opts.birthDate);
    this.gender = ['male', 'female', 'unspecified'].includes(opts.gender)
      ? opts.gender
      : 'unspecified';
    this.lifeExpectancy =
      typeof opts.lifeExpectancy === 'number' && opts.lifeExpectancy > 0
        ? opts.lifeExpectancy
        : Config.DEFAULTS.lifeExpectancy[this.gender];
    this.retirementAge =
      typeof opts.retirementAge === 'number' && opts.retirementAge > 0
        ? opts.retirementAge
        : Config.DEFAULTS.retirementAge[this.gender];
    this._validate();
  }

  _validate() {
    if (!(this.birthDate instanceof Date) || isNaN(this.birthDate.getTime())) {
      throw new Error('birthDate 无效');
    }
    if (this.birthDate > new Date()) {
      throw new Error('出生日期不能晚于当前时间');
    }
    if (this.lifeExpectancy <= 0 || this.lifeExpectancy > Config.LIMITS.maxLifeExpectancy) {
      throw new Error(`lifeExpectancy 取值异常（应为 0-${Config.LIMITS.maxLifeExpectancy}）`);
    }
  }

  /** 当前年龄（小数，按 365.25 天/年） */
  ageDecimal(now = new Date()) {
    return (now.getTime() - this.birthDate.getTime()) / YEAR_MS;
  }

  /** 整数年龄 */
  age(now = new Date()) {
    return Math.floor(this.ageDecimal(now));
  }

  /**
   * 核心统计
   * @param {Date} [now]
   */
  getStats(now = new Date()) {
    const birthMs = this.birthDate.getTime();
    const nowMs = now.getTime();
    const endMs = birthMs + this.lifeExpectancy * YEAR_MS;
    const totalSpan = endMs - birthMs;
    const lived = nowMs - birthMs;
    const remaining = endMs - nowMs;
    const isOver = remaining <= 0;

    return {
      birthDate: this.birthDate,
      endDate: new Date(endMs),
      age: this.age(now),
      ageDecimal: this.ageDecimal(now),
      lifeExpectancy: this.lifeExpectancy,
      retirementAge: this.retirementAge,
      totalSpanMs: totalSpan,
      livedMs: Math.max(0, lived),
      remainingMs: remaining, // 可为负
      isOver,
      percentLived: Math.min(100, Math.max(0, (lived / totalSpan) * 100)),
      percentRemaining: Math.max(0, (remaining / totalSpan) * 100),
      breakdown: this._breakdown(Math.abs(remaining)),
      nextBirthday: this._nextBirthday(now),
      daysUntilNextBirthday: Math.max(
        0,
        Math.ceil((this._nextBirthday(now).getTime() - nowMs) / DAY_MS)
      ),
      retirementDate: this._retirementDate(),
      daysUntilRetirement: Math.max(
        0,
        Math.ceil((this._retirementDate().getTime() - nowMs) / DAY_MS)
      ),
    };
  }

  /** 时间分解：年/总天/年内剩余天/时/分/秒 */
  _breakdown(ms) {
    const years = Math.floor(ms / YEAR_MS);
    const days = Math.floor(ms / DAY_MS);
    const remDays = Math.floor((ms % YEAR_MS) / DAY_MS);
    const hours = Math.floor((ms % DAY_MS) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);
    return { totalMs: ms, years, days, remDays, hours, minutes, seconds };
  }

  _nextBirthday(now = new Date()) {
    const b = this.birthDate;
    let next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
    if (next.getTime() < now.getTime()) {
      next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate());
    }
    return next;
  }

  _retirementDate() {
    const b = this.birthDate;
    return new Date(b.getFullYear() + this.retirementAge, b.getMonth(), b.getDate());
  }
}

export default LifeCountdown;
