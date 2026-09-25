/**
 * render.js — 页面模块渲染函数
 * 职责：依据 app.js 传入的状态与 core 计算结果，渲染
 *   1) Hero 首屏总览（剩余生命天数 / 存款可支撑月数）
 *   2) 生命倒计时模块（进度环 + 参数 + 详情）
 *   3) 存款生存计算器模块（输入卡 + 结果卡 + 压力测试）
 *   4) 设置抽屉（偏好、重置、导入/导出入口）
 * 本文件不做任何业务计算，不直接访问 localStorage。
 * 每个渲染函数返回一个 updater(stats)（或 null），供每秒时钟刷新时只更新文本节点。
 */
import { Config } from '../core/index.js';
import {
  h,
  icon,
  createStatCard,
  createProgressRing,
  createField,
  createChipGroup,
} from './components.js';
import {
  formatDate,
  formatDateTime,
  formatDaysAgo,
  formatMoney,
  formatInt,
  formatPercent,
  formatClock,
  formatMonthsLeft,
} from './format.js';

/* ---------------- 通用小部件 ---------------- */

/* 与 core/life.js 保持同一时间口径（365.25 天/年），
   避免「已过」在 UI 层用另一套算法算出的天数与「剩余」对不上。 */
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365.25 * DAY_MS;

/** 已度过时长拆成「N 年 M 天」 */
function elapsedYearsDays(stats) {
  const ms = Math.max(0, stats.livedMs || 0);
  const years = Math.floor(ms / YEAR_MS);
  const remDays = Math.floor((ms % YEAR_MS) / DAY_MS);
  return `${years} 年 ${remDays} 天`;
}

/** 剩余寿命拆成「N 年 M 天」（不含时分秒，供高亮条大号展示） */
function remainingYearsDays(stats) {
  if (stats.isOver) return `已超期 ${formatInt(stats.breakdown.days)} 天`;
  return `${stats.breakdown.years} 年 ${stats.breakdown.remDays} 天`;
}

/** 剩余寿命的秒级时钟（已超期时无意义，返回空串） */
function remainingClock(stats) {
  if (stats.isOver) return '';
  const b = stats.breakdown;
  return formatClock(b.hours, b.minutes, b.seconds);
}

/** 高亮条右侧胶囊：key 小标签 + value 文本 */
function stripPill(key, value) {
  return h('span', { class: 'hl-strip__gg' }, [
    h('span', { class: 'hl-strip__gg-key', text: key }),
    h('span', { class: 'hl-strip__gg-val', text: value }),
  ]);
}

/** 「GG」胶囊：按设定预期寿命推算的终点日期 */
function ggPill(date, { isOver = false } = {}) {
  return stripPill(isOver ? '已 GG' : 'GG', formatDate(date));
}

/**
 * 高亮条：左侧一组数字，右侧可选胶囊
 * @param {Node[]} leftNodes
 * @param {Node|null} rightNode
 * @param {string} [modifier] 额外修饰类（如 hl-strip--good）
 */
function hlStrip(leftNodes, rightNode, modifier) {
  return h('div', { class: modifier ? `hl-strip ${modifier}` : 'hl-strip' }, [
    h('span', { class: 'hl-strip__left' }, leftNodes),
    rightNode || null,
  ]);
}

/** 存款耗尽日 vs 寿命终点：哪个先到 */
function savingsVerdict(depletionDate, lifeEndDate) {
  if (!depletionDate || !lifeEndDate) return null;
  const d = depletionDate instanceof Date ? depletionDate : new Date(depletionDate);
  const e = lifeEndDate instanceof Date ? lifeEndDate : new Date(lifeEndDate);
  if (isNaN(d.getTime()) || isNaN(e.getTime())) return null;
  return d.getTime() >= e.getTime() ? '钱比命长 · 放心花' : '人还在 · 钱先没了';
}

/* ---------------- Hero 首屏总览 ---------------- */

export function renderHero(container, ctx) {
  container.replaceChildren();

  // 寿命终点，用于与存款耗尽日做对比（无生命数据时为 null）
  const lifeEnd = ctx.lifeStats ? ctx.lifeStats.endDate : null;

  // —— 卡 A：我还能活多久 ——
  let cardA;
  let updateA = null;
  if (ctx.lifeStats) {
    const s = ctx.lifeStats;
    const tone = s.isOver ? 'success' : 'accent';

    // 「已过 N 年 M 天」：由原「时间详情」卡上移到卡 A，紧贴主数字下方成一行小字。
    // 不塞进高亮条 —— 实测会让「GG 日期」胶囊被挤到第二行左对齐，反而破坏首屏观感。
    const elapsedValEl = h('span', { class: 'elapsed-line__val', text: elapsedYearsDays(s) });
    const elapsedLine = h('p', { class: 'elapsed-line' }, [
      h('span', { class: 'elapsed-line__key', text: '已过' }),
      // 显式空格文本节点：复制/朗读出来是「已过 36 年 253 天」，而不是「已过36 年 253 天」
      ' ',
      elapsedValEl,
    ]);

    // 高亮条：左侧「还剩 N 年 M 天 + 秒级时钟」，右侧 GG 日期胶囊
    const yearsDaysEl = h('span', { class: 'hl-strip__main', text: remainingYearsDays(s) });
    const clockEl = h('span', { class: 'hl-strip__clock', text: remainingClock(s) });

    cardA = createStatCard({
      title: '我还能活多久',
      iconName: 'hourglass',
      value: formatInt(s.breakdown.days),
      unit: '天',
      subNode: [
        elapsedLine,
        hlStrip([yearsDaysEl, clockEl], ggPill(s.endDate, { isOver: s.isOver })),
      ],
      subClass: 'card-sub-stack',
      tone,
    });
    const badge = h('span', { class: 'stat-card__badge' }, [
      h('span', { text: `已活 ${formatPercent(s.percentLived)}` }),
      h('span', { class: 'stat-card__badge-sep', text: '·' }),
      h('span', { text: s.isOver ? '已超期' : `剩余 ${formatPercent(s.percentRemaining)}` }),
    ]);
    cardA.root.querySelector('.stat-card__head').appendChild(badge);
    cardA.refs.badge = badge;

    updateA = (stats) => {
      cardA.refs.value.textContent = formatInt(stats.breakdown.days);
      elapsedValEl.textContent = elapsedYearsDays(stats);
      yearsDaysEl.textContent = remainingYearsDays(stats);
      clockEl.textContent = remainingClock(stats);
    };
  } else {
    cardA = createStatCard({
      title: '我还能活多久',
      iconName: 'hourglass',
      value: '——',
      sub: ctx.lifeError ? '参数有误，请检查下方生命倒计时设置' : '在下方填写出生日期后开始倒计时',
      tone: 'muted',
    });
  }

  // —— 卡 B：钱还能撑多久 ——
  let cardB;
  if (ctx.savingsCfg && ctx.result) {
    const r = ctx.result;
    const m = formatMonthsLeft(r.monthsLeft, Config.LIMITS.maxSimMonths);
    const isNumeric = isFinite(r.monthsLeft) && r.monthsLeft < Config.LIMITS.maxSimMonths;
    const burn = r.monthlyBurn;
    const burnLabel =
      burn > 0 ? `月净消耗 ${formatMoney(burn, ctx.symbol)}` : '月收支盈余';

    const subParts = [];
    if (r.isSustainable) {
      subParts.push(
        hlStrip(
          [h('span', { class: 'hl-strip__main', text: '不会耗尽' })],
          stripPill('稳', '月收支有盈余'),
          'hl-strip--good',
        ),
      );
    } else if (!r.depletionDate) {
      subParts.push(
        hlStrip([
          h('span', {
            class: 'hl-strip__main',
            text: `模拟 ${Config.LIMITS.maxSimMonths / 12} 年仍未耗尽`,
          }),
        ]),
      );
    } else {
      // 结论行放在高亮条「上方」：让卡 B 与卡 A 结构一致（大数字 → 小字行 → 高亮条），
      // 两张卡等高时两条高亮条才会落在同一水平线上。
      // 放在条下方会把卡 B 的条整体顶高约一行，与卡 A 的条错开（v1.3.1 观感问题）。
      const verdict = savingsVerdict(r.depletionDate, lifeEnd);
      if (verdict) subParts.push(h('p', { class: 'card-sub-note', text: verdict }));

      subParts.push(
        hlStrip(
          [
            h('span', {
              class: 'hl-strip__main',
              text: `${r.yearsLeft} 年 ${r.remainingMonths} 个月`,
            }),
          ],
          stripPill('耗尽', formatDate(r.depletionDate)),
        ),
      );
    }

    cardB = createStatCard({
      title: '钱还能撑多久',
      iconName: 'wallet',
      value: m.text,
      unit: isNumeric ? '个月' : null,
      subNode: subParts,
      subClass: 'card-sub-stack',
      badge: burnLabel,
      tone: m.tone === 'success' ? 'success' : 'accent',
    });
  } else {
    cardB = createStatCard({
      title: '钱还能撑多久',
      iconName: 'wallet',
      value: '——',
      sub: ctx.savingsError
        ? '参数有误，请检查存款计算器输入'
        : '在下方填写存款与月支出后开始计算',
      tone: 'muted',
    });
  }

  container.append(cardA.root, cardB.root);
  return updateA;
}

/* ---------------- 生命倒计时模块 ---------------- */

const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unspecified', label: '不指定' },
];

/** 首次使用引导卡 */
function renderLifeGuide(ctx) {
  const birthField = createField({
    id: 'f-birth',
    label: '出生日期',
    type: 'date',
    value: '',
    onChange: (e) => commit(e),
  });
  const genderChips = createChipGroup({
    name: '性别',
    options: GENDER_OPTIONS,
    value: 'unspecified',
  });

  function currentGender() {
    return genderChips.group.querySelector('.chip.is-selected')?.dataset.value ||
      'unspecified';
  }
  function commit(e, chipValue) {
    const hint = chipValue ? `chip:${chipValue}` : (e?.relatedTarget?.id || null);
    const err = ctx.actions.onProfileCommit(
      { birthDate: birthField.input.value, gender: currentGender(), lifeExpectancy: '', retirementAge: '' },
      'birthDate',
      hint,
    );
    birthField.setError(err && err.field === 'birthDate' ? err.message : null);
  }

  genderChips.group.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    commit(e, btn.dataset.value);
  });

  return h('div', { class: 'card guide' }, [
    h('div', { class: 'guide__icon' }, [icon('hourglass', 22)]),
    h('h3', { class: 'guide__title', text: '先建立你的生命倒计时' }),
    h('p', {
      class: 'guide__desc',
      text: '填写出生日期与性别即可开始。预期寿命仅按你设定的数值做线性时间换算，不做任何寿命预测。',
    }),
    h('div', { class: 'form-grid form-grid--2' }, [birthField.root, genderChips.root]),
    h('p', { class: 'field__hint', text: Config.LIFE_EXPECTANCY_NOTE }),
  ]);
}

/** 已配置后的生命模块 */
function renderLifePanel(ctx) {
  const profile = ctx.state.profile;
  const stats = ctx.lifeStats;

  const birthField = createField({
    id: 'f-birth',
    label: '出生日期',
    type: 'date',
    value: profile.birthDate || '',
    onChange: (e) => commit('birthDate', e),
  });
  const genderChips = createChipGroup({
    name: '性别',
    options: GENDER_OPTIONS,
    value: profile.gender || 'unspecified',
  });
  const lifeExpField = createField({
    id: 'f-life-exp',
    label: '预期寿命（岁）',
    type: 'number',
    value: profile.lifeExpectancy ?? '',
    placeholder: '留空用默认',
    min: 1,
    max: Config.LIMITS.maxLifeExpectancy,
    unit: '岁',
    onChange: (e) => commit('lifeExpectancy', e),
  });
  const retireField = createField({
    id: 'f-retire',
    label: '退休年龄（岁）',
    type: 'number',
    value: profile.retirementAge ?? '',
    placeholder: '留空用默认',
    min: 1,
    max: Config.LIMITS.maxLifeExpectancy,
    unit: '岁',
    onChange: (e) => commit('retirementAge', e),
  });

  function values() {
    return {
      birthDate: birthField.input.value,
      gender:
        genderChips.group.querySelector('.chip.is-selected')?.dataset.value || 'unspecified',
      lifeExpectancy: lifeExpField.input.value.trim(),
      retirementAge: retireField.input.value.trim(),
    };
  }
  function commit(sourceField, e, chipValue) {
    [birthField, lifeExpField, retireField].forEach((f) => f.setError(null));
    const hint = chipValue ? `chip:${chipValue}` : (e?.relatedTarget?.id || null);
    const err = ctx.actions.onProfileCommit(values(), sourceField, hint);
    if (err) {
      const map = { birthDate: birthField, lifeExpectancy: lifeExpField, retirementAge: retireField };
      if (map[err.field]) map[err.field].setError(err.message);
    }
  }

  genderChips.group.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (btn) commit('gender', e, btn.dataset.value);
  });

  // —— 一张卡装下「进度环 + 参数」（V1.3.0）——
  // 原来「环卡 | 参数卡」并排，列宽与首屏两张卡对不齐、两张卡高度也不一致；
  // 合并为一张卡后，整页所有卡片都落在同一套两列栅格上（见 css 的 main 统一栅格）。
  const ring = stats
    ? createProgressRing(stats.percentLived, {
        isOver: stats.isOver,
        centerLabel: stats.isOver ? '已超期' : '已度过',
      })
    : null;

  const ringBox = h('div', { class: 'life-card__ring' }, [
    ring ? ring.root : h('div', { class: 'ring-placeholder', text: '暂不可用' }),
  ]);

  // 说明收口成一行：预期寿命只是「你设定的换算口径」，不是寿命预测（免责口径不变）。
  const noteText = stats
    ? stats.isOver
      ? `已超过设定预期寿命 ${stats.breakdown.days} 天，愿每一天都值得`
      : `按预期寿命 ${stats.lifeExpectancy} 岁线性换算 · 仅为你设定的口径，非寿命预测`
    : ctx.lifeError || '当前参数无法计算，请检查输入。';

  const paramsBox = h('div', { class: 'life-card__params' }, [
    h('div', { class: 'form-grid' }, [birthField.root, genderChips.root]),
    h('div', { class: 'form-grid' }, [lifeExpField.root, retireField.root]),
    h('p', { class: `card__note${stats ? '' : ' card__note--error'}`, text: noteText }),
  ]);

  return h('div', { class: 'card life-card' }, [
    h('h3', { class: 'card__title', text: '寿命进度条' }),
    h('div', { class: 'life-card__body' }, [ringBox, paramsBox]),
  ]);
}

export function renderLifeSection(container, ctx) {
  // 模块标题并入卡片标题（原「生命倒计时」独立标题行删除，为「一屏显示」省一行高度）。
  if (!ctx.state.profile) {
    container.replaceChildren(renderLifeGuide(ctx));
    return null;
  }
  container.replaceChildren(renderLifePanel(ctx));
  // 「剩余时间」文本已并入首屏卡 A 的高亮条，由 renderHero 的 updater 每秒刷新，
  // 此处无需再注册第二个 updater。
  return null;
}

/* ---------------- 存款生存计算器模块 ---------------- */

const SAVINGS_FIELDS = [
  { key: 'savings', id: 'f-savings', label: '当前存款', unit: '元', min: 0, step: 100, placeholder: '0' },
  { key: 'monthlyExpense', id: 'f-expense', label: '月支出', unit: '元', min: 0, step: 100, placeholder: '0' },
  { key: 'monthlyIncome', id: 'f-income', label: '月收入（可空 = 0）', unit: '元', min: 0, step: 100, placeholder: '0' },
];

/** 明细条里的一个格子：小标签 + 主值 + 可选小字说明 */
function detailCell(label, value, { tone = '', sub = '' } = {}) {
  return h('div', { class: 'detail-bar__cell' }, [
    h('span', { class: 'detail-bar__label', text: label }),
    h('span', { class: `detail-bar__value${tone ? ` tone-${tone}` : ''}`, text: value }),
    sub ? h('span', { class: 'detail-bar__sub', text: sub }) : null,
  ]);
}

/**
 * 存款明细条（V1.3.0 新增，横跨两列）
 * 只放「明细 + 压力测试」：可支撑月数、耗尽日期这些结论已经在首屏卡 B 上，
 * 这里不再重复 —— 整页不会出现两处一样的数字，也省下一大半高度。
 * 错误优先于空状态：若 core 抛错，即使 result 为 null 也要展示真实原因。
 */
function renderSavingsDetail(ctx) {
  const symbol = ctx.symbol;

  if (ctx.savingsError) {
    return h('div', { class: 'card detail-bar' }, [
      h('p', { class: 'card__error', text: ctx.savingsError }),
    ]);
  }

  const r = ctx.result;
  if (!r) {
    return h('div', { class: 'card detail-bar' }, [
      h('p', {
        class: 'detail-bar__hint',
        text: '填完上面的存款参数，这里会出现月度明细与压力测试（失焦即自动计算并保存在本机，无需点按钮）。',
      }),
    ]);
  }

  // 月净消耗：支出 − 收入 = 净
  const burn = r.monthlyBurn;

  const stress = ctx.stress;
  /** 压力测试月数 → 文案（Infinity = 收入覆盖支出，直接说可持续） */
  const toText = (months) => {
    if (months === null || months === undefined || Number.isNaN(months)) return '—';
    if (!isFinite(months)) return '可持续';
    if (months >= Config.LIMITS.maxSimMonths) return `${Config.LIMITS.maxSimMonths / 12} 年以上`;
    return `${formatInt(months)} 个月`;
  };

  const stressCell = stress
    ? h('div', { class: 'detail-bar__cell detail-bar__cell--stress' }, [
        h('span', { class: 'detail-bar__label', text: '压力测试（不利情景）' }),
        h('ul', { class: 'stress-list' }, [
          h('li', {}, [
            h('span', { text: '支出 +20%' }),
            h('b', { text: toText(stress.expenseUp20) }),
          ]),
          h('li', {}, [
            h('span', { text: '收入 −50%' }),
            h('b', { text: toText(stress.incomeDown50) }),
          ]),
          h('li', {}, [
            h('span', { text: '通胀翻倍' }),
            h('b', { text: toText(stress.inflationDoubled) }),
          ]),
        ]),
      ])
    : null;

  return h('div', { class: 'card detail-bar' }, [
    h('div', { class: 'detail-bar__grid' }, [
      detailCell('月净消耗', formatMoney(Math.abs(burn), symbol), {
        tone: burn > 0 ? 'danger' : burn < 0 ? 'success' : 'muted',
        sub: `月支出 ${formatMoney(ctx.cfgVals.monthlyExpense, symbol)} − 月收入 ${formatMoney(ctx.cfgVals.monthlyIncome, symbol)}`,
      }),
      detailCell('耗尽日期', r.depletionDate ? formatDate(r.depletionDate) : '不会耗尽', {
        sub: r.depletionDate
          ? `还能撑 ${r.yearsLeft} 年 ${r.remainingMonths} 个月`
          : '当前现金流有盈余',
      }),
      detailCell('模拟期累计支出', r.isSustainable ? '—' : formatMoney(r.totalSpent, symbol), {
        sub: `按年化通胀 ${r.inflationUsed}% 逐月递增`,
      }),
      detailCell('模拟期累计收入', r.isSustainable ? '—' : formatMoney(r.totalIncome, symbol), {
        sub: '不含任何投资收益',
      }),
      stressCell,
    ]),
    r.note ? h('p', { class: 'detail-bar__note', text: r.note }) : null,
  ]);
}

export function renderSavingsSection(container, ctx) {
  const cfg = ctx.state.savingsCfg;
  const inflationPlaceholder = String(ctx.state.settings.inflationRate ?? Config.DEFAULTS.inflationRate);

  const fields = SAVINGS_FIELDS.map((f) =>
    createField({
      id: f.id,
      label: f.label,
      type: 'number',
      value: cfg ? cfg[f.key] ?? '' : '',
      unit: f.unit,
      min: f.min,
      step: f.step,
      placeholder: f.placeholder,
      inputmode: 'decimal',
      onChange: (e) => commit(e),
    }),
  );
  const inflationField = createField({
    id: 'f-inflation',
    label: '年化通胀率',
    type: 'number',
    value: cfg ? cfg.inflationRate ?? '' : '',
    unit: '%',
    min: 0,
    max: 100,
    step: 0.1,
    placeholder: inflationPlaceholder,
    onChange: (e) => commit(e),
  });

  function fieldValues() {
    const [savings, monthlyExpense, monthlyIncome] = fields.map((f) => f.input.value.trim());
    return { savings, monthlyExpense, monthlyIncome, inflationRate: inflationField.input.value.trim() };
  }
  function commit(e) {
    [...fields, inflationField].forEach((f) => f.setError(null));
    const hint = e?.relatedTarget?.id || null;
    const err = ctx.actions.onSavingsCommit(fieldValues(), hint);
    if (err) {
      const map = {
        savings: fields[0],
        monthlyExpense: fields[1],
        monthlyIncome: fields[2],
        inflationRate: inflationField,
      };
      if (map[err.field]) map[err.field].setError(err.message);
    }
  }

  // 四个输入放进同一套两列栅格（当前存款/月支出 | 月收入/通胀）——
  // 比竖向排 4 行省掉一半高度，也更接近「一屏看完」。
  const inputCard = h('div', { class: 'card form-card' }, [
    h('h3', { class: 'card__title', text: '存款参数' }),
    h('div', { class: 'form-grid' }, [...fields.map((f) => f.root), inflationField.root]),
    h('p', {
      class: 'card__note',
      text: '支出按年化通胀逐月递增，仅作机械模拟，非预测。',
    }),
  ]);

  // 明细条默认跨两列（宽屏）；窄屏自然落成一张整行卡片。
  container.replaceChildren(inputCard, renderSavingsDetail(ctx));
  return null;
}

/* ---------------- 设置抽屉 ---------------- */

let settingsOpen = false;

export function renderSettingsSection(container, ctx, ui) {
  const settings = ctx.state.settings;

  const symbolField = createField({
    id: 'f-currency',
    label: '货币符号',
    type: 'text',
    value: settings.currencySymbol ?? Config.DEFAULTS.currencySymbol,
    placeholder: Config.DEFAULTS.currencySymbol,
    hint: '显示在金额前，最多 3 个字符',
    onChange: (e) => commit(e),
  });
  symbolField.input.setAttribute('maxlength', '3');

  const inflationField = createField({
    id: 'f-default-inflation',
    label: '默认年化通胀率',
    type: 'number',
    value: settings.inflationRate ?? Config.DEFAULTS.inflationRate,
    unit: '%',
    min: 0,
    max: 100,
    step: 0.1,
    hint: '新建存款测算时使用的默认值',
    onChange: (e) => commit(e),
  });

  // 主题：当前仅暗色，保留 UI 占位但不切换
  const themeSelect = h('select', {
    id: 'f-theme',
    class: 'field__input',
    disabled: true,
  }, [
    h('option', { value: 'dark', text: '暗色（当前）' }),
    h('option', { value: 'auto', text: '跟随系统（预留）' }),
  ]);
  themeSelect.value = 'dark';
  const themeField = h('div', { class: 'field' }, [
    h('label', { class: 'field__label', for: 'f-theme', text: '主题' }),
    h('div', { class: 'field__control' }, [themeSelect]),
    h('p', { class: 'field__hint', text: '当前版本仅提供暗色主题' }),
  ]);

  function commit(e) {
    symbolField.setError(null);
    inflationField.setError(null);
    const hint = e?.relatedTarget?.id || null;
    const err = ctx.actions.onSettingsCommit({
      currencySymbol: symbolField.input.value.trim(),
      inflationRate: inflationField.input.value.trim(),
    }, hint);
    if (err) {
      const map = { currencySymbol: symbolField, inflationRate: inflationField };
      if (map[err.field]) map[err.field].setError(err.message);
    }
  }

  const exportBtn = h('button', {
    type: 'button',
    class: 'btn btn--primary',
    onclick: () => ctx.actions.exportData(),
  }, [icon('export', 16), h('span', { text: '导出备份' })]);
  const importBtn = h('button', {
    type: 'button',
    class: 'btn btn--ghost',
    onclick: () => ctx.actions.importData(),
  }, [icon('import', 16), h('span', { text: '导入备份' })]);
  const resetBtn = h('button', {
    type: 'button',
    class: 'btn btn--ghost btn--danger-text',
    onclick: () => ctx.actions.resetSettings(),
  }, [icon('trash', 16), h('span', { text: '重置偏好' })]);

  // 数据安全与备份（V1.3.0：由独立整块卡片收进抽屉）
  // 它是「偶尔看一眼」的信息，常驻页面流会白占近一屏高度；
  // 真到需要提醒时（超过 14 天没备份），页面上仍会单独冒出一条提醒条（renderDataSection）。
  const status = ctx.backupStatus || {
    itemCount: 0,
    lastExportAt: null,
    daysSinceExport: null,
  };
  const dataBlock = h('div', { class: 'drawer__data' }, [
    h('p', {
      class: 'drawer__data-meta',
      id: 'backup-meta',
      text:
        status.itemCount === 0
          ? '暂无数据 —— 填完参数后这里会显示备份状态'
          : `当前数据 ${status.itemCount} 项 · 最后备份 ${formatDaysAgo(status.daysSinceExport, '从未备份')}`,
    }),
    status.lastExportAt
      ? h('p', { class: 'drawer__data-sub', text: `上次备份：${formatDateTime(status.lastExportAt)}` })
      : null,
    h('p', {
      class: 'drawer__data-note',
      text:
        '所有数据只存在这台设备的浏览器里，没有任何服务器副本。清理浏览器数据、更换设备或重装系统都会导致数据丢失 —— 导出备份是唯一的保护手段。',
    }),
  ]);

  const body = h('div', { class: `drawer__body${settingsOpen ? ' is-open' : ''}` }, [
    h('div', { class: 'drawer__inner' }, [
      h('div', { class: 'form-grid form-grid--3' }, [
        symbolField.root, inflationField.root, themeField,
      ]),
      dataBlock,
      h('div', { class: 'drawer__actions' }, [exportBtn, importBtn, resetBtn]),
    ]),
  ]);

  const toggleBtn = h('button', {
    type: 'button',
    class: 'drawer__toggle',
    'aria-expanded': settingsOpen ? 'true' : 'false',
    'aria-controls': 'settings-body',
    onclick: () => {
      settingsOpen = !settingsOpen;
      body.classList.toggle('is-open', settingsOpen);
      toggleBtn.setAttribute('aria-expanded', settingsOpen ? 'true' : 'false');
      toggleBtn.classList.toggle('is-open', settingsOpen);
    },
  }, [
    h('span', { class: 'drawer__toggle-left' }, [
      icon('settings', 18),
      h('span', { text: '设置 · 备份 · 数据安全' }),
    ]),
    h('span', { class: `drawer__chevron${settingsOpen ? ' is-open' : ''}` }, [icon('chevron', 18)]),
  ]);
  toggleBtn.classList.toggle('is-open', settingsOpen);
  body.id = 'settings-body';

  container.replaceChildren(
    h('section', { class: 'card drawer', 'aria-label': '设置、备份与数据安全' }, [toggleBtn, body]),
  );
}

/* ---------------- 备份提醒（V1.1 G4 保留 / V1.3.0 改为「只在需要时出现」） ---------------- */

/**
 * 备份提醒：V1.3.0 起，数据安全的静态信息已收进设置抽屉，
 * 这里只在真的需要提醒（距上次导出超过 BACKUP_REMIND_DAYS 天且未点过「稍后再说」）时
 * 才在页面上出现一条提醒条；平时整块隐藏，不占高度。
 * @param {HTMLElement} container
 * @param {object} ctx 需含 ctx.backupStatus 与 ctx.actions.{exportData,snoozeBackup}
 */
export function renderDataSection(container, ctx) {
  const status = ctx.backupStatus || { shouldRemind: false, message: '' };

  if (!status.shouldRemind) {
    container.replaceChildren();
    container.hidden = true;
    return null;
  }

  container.hidden = false;
  container.replaceChildren(
    h('div', { class: 'backup-banner', role: 'status' }, [
      h('span', { class: 'backup-banner__icon' }, [icon('alert', 18)]),
      h('span', {
        class: 'backup-banner__text',
        text: status.message || '建议导出一份新的备份。',
      }),
      h('div', { class: 'backup-banner__actions' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--primary btn--sm',
            onclick: () => ctx.actions.exportData(),
          },
          [h('span', { text: '立即导出' })],
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--ghost btn--sm',
            onclick: () => ctx.actions.snoozeBackup(),
          },
          [h('span', { text: '稍后再说' })],
        ),
      ]),
    ]),
  );
  return null;
}
