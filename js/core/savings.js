/**
 * savings.js — 存款生存计算器
 * 输入：当前存款、月支出、月收入（默认 0）、年化通胀率
 * 输出：可支撑月数、耗尽日期、月度净消耗、压力测试结果
 * 仅做现金流消耗模拟，不涉及投资收益、不提供金融建议。
 */
import { Config } from './config.js';

export class SavingsCalculator {
  /**
   * @param {object} opts
   * @param {number} opts.savings         当前存款（元，>=0）
   * @param {number} opts.monthlyExpense  月支出（元，>=0）
   * @param {number} [opts.monthlyIncome=0] 月收入（元，>=0）
   * @param {number} [opts.inflationRate=2.5] 年化通胀率（%，0-100）
   * @param {Date}   [opts.startDate=now]  起算日
   * @param {number} [opts.maxMonths]     模拟上限（默认 1200 = 100 年）
   */
  constructor(opts) {
    if (!opts) throw new Error('SavingsCalculator: opts 必填');
    this.savings = Number(opts.savings) || 0;
    this.monthlyExpense = Number(opts.monthlyExpense) || 0;
    this.monthlyIncome = Number(opts.monthlyIncome) || 0;
    this.inflationRate =
      typeof opts.inflationRate === 'number' ? opts.inflationRate : Config.DEFAULTS.inflationRate;
    this.startDate = opts.startDate ? new Date(opts.startDate) : new Date();
    this.maxMonths = Number(opts.maxMonths) || Config.LIMITS.maxSimMonths;
    this._validate();
  }

  _validate() {
    if (this.savings < 0) throw new Error('savings 不能为负');
    if (this.monthlyExpense < 0) throw new Error('monthlyExpense 不能为负');
    if (this.monthlyIncome < 0) throw new Error('monthlyIncome 不能为负');
    if (this.inflationRate < 0 || this.inflationRate > 1000) {
      throw new Error('inflationRate 取值异常（0-1000）');
    }
  }

  /**
   * 逐月模拟：每月先扣「支出 - 收入」净消耗；支出按年化通胀逐月递增。
   * 收入覆盖支出时判为「可持续」，直接返回，避免无意义循环。
   */
  simulate() {
    const baseBurn = this.monthlyExpense - this.monthlyIncome;

    // 收入覆盖支出 → 可持续
    if (this.monthlyExpense > 0 && baseBurn <= 0) {
      return {
        monthsLeft: Infinity,
        yearsLeft: Infinity,
        remainingMonths: 0,
        depletionDate: null,
        monthlyBurn: baseBurn, // 负数 = 净盈余
        totalSpent: 0,
        totalIncome: 0,
        finalBalance: this.savings,
        isSustainable: true,
        inflationUsed: this.inflationRate,
        note: '当前月收入 ≥ 月支出，存款不会耗尽（不考虑大额突发支出）。',
      };
    }

    // 支出为 0 → 不会被日常消耗耗尽（无论存款多少）
    // 注：旧版条件为 `monthlyExpense <= 0 && savings > 0`，导致「存款 0 且支出 0」
    // 落入逐月循环，误报为「1 个月」并伪造出耗尽日期。
    if (this.monthlyExpense <= 0) {
      return {
        monthsLeft: Infinity,
        yearsLeft: Infinity,
        remainingMonths: 0,
        depletionDate: null,
        monthlyBurn: baseBurn,
        totalSpent: 0,
        totalIncome: 0,
        finalBalance: this.savings,
        isSustainable: true,
        inflationUsed: this.inflationRate,
        note: '月支出为 0，存款不会因日常消耗耗尽。',
      };
    }

    // 无存款、且支出无法被收入覆盖 → 立即无法支撑（避免伪造出「1 个月」与耗尽日期）
    if (this.savings <= 0) {
      return {
        monthsLeft: 0,
        yearsLeft: 0,
        remainingMonths: 0,
        depletionDate: null,
        monthlyBurn: baseBurn,
        totalSpent: 0,
        totalIncome: 0,
        finalBalance: 0,
        isSustainable: false,
        inflationUsed: this.inflationRate,
        note: '当前存款为 0，无法覆盖月支出。',
      };
    }

    // 逐月消耗
    let balance = this.savings;
    let expense = this.monthlyExpense;
    const monthlyFactor = Math.pow(1 + this.inflationRate / 100, 1 / 12);
    let months = 0;
    let totalSpent = 0;
    let totalIncome = 0;
    let depletionMonth = null;

    while (months < this.maxMonths) {
      const burn = expense - this.monthlyIncome;
      balance -= burn;
      totalSpent += expense;
      totalIncome += this.monthlyIncome;
      if (balance <= 0) {
        depletionMonth = months;
        break;
      }
      expense *= monthlyFactor;
      months++;
    }

    const monthsLeft = depletionMonth !== null ? depletionMonth + 1 : this.maxMonths;
    return {
      monthsLeft,
      yearsLeft: Math.floor(monthsLeft / 12),
      remainingMonths: monthsLeft % 12,
      depletionDate:
        depletionMonth !== null ? this._addMonths(this.startDate, depletionMonth + 1) : null,
      monthlyBurn: baseBurn,
      totalSpent,
      totalIncome,
      finalBalance: Math.max(0, balance),
      isSustainable: false,
      inflationUsed: this.inflationRate,
      note: null,
    };
  }

  /**
   * 压力测试：三种常见不利情景下的可支撑月数
   * - 支出 +20%
   * - 收入 -50%
   * - 通胀率翻倍
   */
  stressTests() {
    const base = this;
    const make = (patch) =>
      new SavingsCalculator({
        savings: base.savings,
        monthlyExpense: base.monthlyExpense,
        monthlyIncome: base.monthlyIncome,
        inflationRate: base.inflationRate,
        startDate: base.startDate,
        ...patch,
      }).simulate().monthsLeft;

    return {
      expenseUp20: make({ monthlyExpense: base.monthlyExpense * 1.2 }),
      incomeDown50: make({ monthlyIncome: base.monthlyIncome * 0.5 }),
      inflationDoubled: make({ inflationRate: base.inflationRate * 2 }),
    };
  }

  _addMonths(date, n) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + n);
    return d;
  }
}

export default SavingsCalculator;
