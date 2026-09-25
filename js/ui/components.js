/**
 * components.js — 可复用 UI 组件工厂
 * 职责：StatCard / ProgressRing / InputField / ChipGroup / DataTable /
 *       ConfirmDialog / Toast，以及 h()/svg() DOM 构造助手与内联 SVG 图标。
 * 所有组件返回真实 DOM 节点，不依赖任何框架。
 */
import { formatDateTime } from './format.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/* ---------------- DOM 构造助手 ---------------- */

/**
 * 创建 HTML 元素
 * @param {string} tag
 * @param {object} [props] 属性 / 事件 / dataset
 * @param {Node|string|Array<Node|string>} [children]
 */
export function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(props)) {
    if (val == null || val === false) continue;
    if (key === 'class') node.className = val;
    else if (key === 'dataset') Object.assign(node.dataset, val);
    else if (key === 'text') node.textContent = val;
    else if (key === 'value') node.value = val;
    else if (key === 'checked') node.checked = !!val;
    else if (key === 'disabled') node.disabled = !!val;
    else if (key.startsWith('on') && typeof val === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (val === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(val));
    }
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(
      typeof child === 'string' || typeof child === 'number'
        ? document.createTextNode(String(child))
        : child
    );
  }
  return node;
}

/** 创建 SVG 元素 */
function svg(tag, props = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, val] of Object.entries(props)) {
    if (val == null || val === false) continue;
    node.setAttribute(key, String(val));
  }
  for (const child of [].concat(children)) {
    if (child) node.appendChild(child);
  }
  return node;
}

/* ---------------- 内联 SVG 图标（stroke 风格，currentColor） ---------------- */

const ICON_PATHS = {
  // 导出：托盘 + 向下箭头
  export:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  // 导入：托盘 + 向上箭头
  import:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  // 清空：垃圾桶
  trash:
    '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
    '<path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  // 设置：滑杆
  settings:
    '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>' +
    '<line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>' +
    '<line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>' +
    '<line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>' +
    '<line x1="17" y1="16" x2="23" y2="16"/>',
  chevron: '<polyline points="6 9 12 15 18 9"/>',
  // 沙漏（生命卡）
  hourglass:
    '<path d="M6 3h12M6 21h12M7 3c0 6 5 6 5 9s-5 3-5 9M17 3c0 6-5 6-5 9s5 3 5 9"/>',
  // 钱包（存款卡）
  wallet:
    '<path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2"/>' +
    '<rect x="3" y="6" width="18" height="14" rx="2"/>' +
    '<path d="M16 13h3v3h-3a1.5 1.5 0 0 1 0-3z"/>',
  // 盾牌（数据安全卡）
  shield: '<path d="M12 22s8-3.9 8-10V5.5L12 3 4 5.5V12c0 6.1 8 10 8 10z"/>',
  // 警示三角（备份提醒条）
  alert:
    '<path d="M12 4.4 2.9 20h18.2L12 4.4z"/>' +
    '<line x1="12" y1="10" x2="12" y2="14.4"/>' +
    '<line x1="12" y1="17.2" x2="12" y2="17.3"/>',
};

/**
 * 生成内联 SVG 图标
 * @param {keyof typeof ICON_PATHS} name
 * @param {number} [size=18]
 */
export function icon(name, size = 18) {
  const root = svg(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.8,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
  );
  root.innerHTML = ICON_PATHS[name] || '';
  return root;
}

/* ---------------- StatCard：核心大数字卡 ---------------- */

/**
 * @param {object} opts
 * @param {string} opts.title 卡标题
 * @param {string} [opts.iconName] 标题图标
 * @param {string} opts.value 主数值文本
 * @param {string} [opts.unit] 单位（如「天」「个月」）
 * @param {string} [opts.sub] 副信息
 * @param {string} [opts.badge] 角标
 * @param {'accent'|'success'|'danger'|'muted'} [opts.tone='accent'] 主数值色调
 */
export function createStatCard(opts) {
  const valueEl = h('span', { class: 'stat-card__value', text: opts.value ?? '—' });
  const unitEl = opts.unit ? h('span', { class: 'stat-card__unit', text: opts.unit }) : null;
  const subEl = h('p', { class: 'stat-card__sub', text: opts.sub ?? '' });
  const badgeEl = opts.badge ? h('span', { class: 'stat-card__badge', text: opts.badge }) : null;

  const root = h('div', { class: `card stat-card stat-card--${opts.tone || 'accent'}` }, [
    h('div', { class: 'stat-card__head' }, [
      h('span', { class: 'stat-card__title' }, [
        opts.iconName ? icon(opts.iconName, 16) : null,
        h('span', { text: opts.title }),
      ]),
      badgeEl,
    ]),
    h('div', { class: 'stat-card__main' }, [valueEl, unitEl]),
    subEl,
  ]);

  return {
    root,
    refs: { value: valueEl, unit: unitEl, sub: subEl, badge: badgeEl, root },
  };
}

/* ---------------- ProgressRing：生命进度环 ---------------- */

/**
 * @param {number} percent 0-100
 * @param {object} [opts]
 * @param {boolean} [opts.isOver=false] 已超期 -> 绿色
 * @param {string} [opts.centerLabel='已度过']
 */
export function createProgressRing(percent, { isOver = false, centerLabel = '已度过' } = {}) {
  const size = 200;
  const stroke = 12;
  const r = (size - stroke) / 2 - 4;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - pct / 100);

  const track = svg('circle', {
    class: 'ring-track',
    cx: size / 2,
    cy: size / 2,
    r,
    fill: 'none',
    'stroke-width': stroke,
  });
  const progress = svg('circle', {
    class: 'ring-progress',
    cx: size / 2,
    cy: size / 2,
    r,
    fill: 'none',
    'stroke-width': stroke,
    'stroke-linecap': 'round',
    'stroke-dasharray': circumference,
    'stroke-dashoffset': offset,
    transform: `rotate(-90 ${size / 2} ${size / 2})`,
  });
  const svgRoot = svg(
    'svg', { class: 'ring-svg', width: size, height: size, viewBox: `0 0 ${size} ${size}` },
    [track, progress],
  );

  const pctEl = h('span', {
    class: 'ring-center__pct',
    text: `${Math.round(pct)}%`,
  });
  const labelEl = h('span', { class: 'ring-center__label', text: centerLabel });

  const root = h('div', {
    class: `ring-wrap${isOver ? ' is-over' : ''}`,
    role: 'progressbar',
    'aria-valuenow': Math.round(pct),
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-label': '生命进度百分比',
  }, [svgRoot, h('div', { class: 'ring-center' }, [pctEl, labelEl])]);

  return { root };
}

/* ---------------- InputField：带标签/单位/错误槽的输入 ---------------- */

/**
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} opts.label
 * @param {'text'|'number'|'date'} [opts.type='text']
 * @param {string|number} [opts.value='']
 * @param {string} [opts.placeholder]
 * @param {string} [opts.unit] 右侧单位
 * @param {number|string} [opts.min] [opts.max] [opts.step]
 * @param {string} [opts.inputmode]
 * @param {string} [opts.hint] 字段下方常驻说明
 * @param {Function} [opts.onChange] 值变化（不区分事件）
 * @param {boolean} [opts.disabled]
 */
export function createField(opts) {
  const errorEl = h('p', { class: 'field__error', hidden: true });
  const inputProps = {
    id: opts.id,
    class: 'field__input',
    type: opts.type || 'text',
    value: opts.value ?? '',
    placeholder: opts.placeholder,
    min: opts.min,
    max: opts.max,
    step: opts.step,
    inputmode: opts.inputmode,
    disabled: opts.disabled,
  };
  const input = h('input', inputProps);

  const wrapChildren = [
    h('label', { class: 'field__label', for: opts.id, text: opts.label }),
  ];
  wrapChildren.push(
    opts.unit
      ? h('div', { class: 'field__control has-unit' }, [
          input,
          h('span', { class: 'field__unit', text: opts.unit }),
        ])
      : h('div', { class: 'field__control' }, [input]),
  );
  if (opts.hint) wrapChildren.push(h('p', { class: 'field__hint', text: opts.hint }));
  wrapChildren.push(errorEl);

  const root = h('div', { class: 'field' }, wrapChildren);

  if (opts.onChange) {
    // 统一在失焦时提交（change 对 date 输入会在选择中途触发，导致重绘），
    // 高频 input 事件不写盘。
    input.addEventListener('blur', opts.onChange);
  }

  return {
    root,
    input,
    setError(msg) {
      if (msg) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
        root.classList.add('has-error');
        input.setAttribute('aria-invalid', 'true');
      } else {
        errorEl.textContent = '';
        errorEl.hidden = true;
        root.classList.remove('has-error');
        input.removeAttribute('aria-invalid');
      }
    },
  };
}

/* ---------------- ChipGroup：单选标签组（性别等） ---------------- */

/**
 * @param {object} opts
 * @param {string} opts.name group 名称（aria）
 * @param {Array<{value:string,label:string}>} opts.options
 * @param {string} [opts.value] 当前选中值
 * @param {Function} [opts.onSelect] 选中回调 (value)
 */
export function createChipGroup({ name, options, value, onSelect }) {
  const group = h('div', { class: 'chip-group', role: 'radiogroup', 'aria-label': name });
  const buttons = options.map((opt, i) => {
    const selected = opt.value === value;
    const btn = h('button', {
      type: 'button',
      class: `chip${selected ? ' is-selected' : ''}`,
      role: 'radio',
      'aria-checked': selected ? 'true' : 'false',
      tabindex: selected ? 0 : -1,
      dataset: { value: opt.value },
      text: opt.label,
      onclick: () => select(opt.value),
    });
    return btn;
  });

  function select(v) {
    buttons.forEach((b, i) => {
      const selected = b.dataset.value === v;
      b.classList.toggle('is-selected', selected);
      b.setAttribute('aria-checked', selected ? 'true' : 'false');
      b.tabIndex = selected ? 0 : -1;
      if (selected) b.focus();
    });
    if (onSelect) onSelect(v);
  }

  // 键盘：方向键在选项间移动
  group.addEventListener('keydown', (e) => {
    const idx = options.findIndex((o) => o.value === value);
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (idx - 1 + options.length) % options.length;
    else return;
    e.preventDefault();
    value = options[next].value;
    select(value);
  });

  group.append(...buttons);

  return {
    root: h('div', { class: 'field' }, [
      h('span', { class: 'field__label', id: `${name}-label`, text: name }),
      (() => {
        group.setAttribute('aria-labelledby', `${name}-label`);
        return group;
      })(),
    ]),
    group,
  };
}

/* ---------------- DataTable：两列小表（压力测试） ---------------- */

/**
 * @param {Array<{label:string, value:string, tone?:'accent'|'success'|'danger'|'muted'}>} rows
 */
export function createDataTable(rows = []) {
  const tbody = h('tbody');
  const root = h('table', { class: 'data-table' }, [
    h('thead', {}, [
      h('tr', {}, [h('th', { text: '情景' }), h('th', { class: 'num', text: '可支撑时长' })]),
    ]),
    tbody,
  ]);

  function update(nextRows) {
    tbody.replaceChildren();
    nextRows.forEach((row) => {
      tbody.appendChild(
        h('tr', {}, [
          h('td', { text: row.label }),
          h('td', { class: `num tone-${row.tone || 'accent'}`, text: row.value }),
        ]),
      );
    });
  }
  update(rows);
  return { root, update };
}

/* ---------------- ConfirmDialog：自定义二次确认（禁用原生 confirm） ---------------- */

let dialogState = null;

function ensureDialog() {
  if (dialogState) return dialogState;

  const cancelBtn = h('button', { type: 'button', class: 'btn btn--ghost', text: '取消' });
  const confirmBtn = h('button', { type: 'button', class: 'btn btn--danger', text: '确认' });
  const titleEl = h('h3', { class: 'modal__title' });
  const messageEl = h('p', { class: 'modal__message' });

  const dialog = h('div', {
    class: 'modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'modal-title',
  }, [
    h('div', { class: 'modal__body' }, [
      titleEl,
      messageEl,
      h('div', { class: 'modal__actions' }, [cancelBtn, confirmBtn]),
    ]),
  ]);
  titleEl.id = 'modal-title';

  const overlay = h('div', { class: 'modal-overlay', hidden: true }, [dialog]);
  document.getElementById('modal-root').appendChild(overlay);

  function close(result) {
    overlay.hidden = true;
    document.removeEventListener('keydown', onKeydown, true);
    if (dialogState?.resolve) dialogState.resolve(result);
    dialogState = null;
  }
  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close(false);
    }
  }

  cancelBtn.addEventListener('click', () => close(false));
  confirmBtn.addEventListener('click', () => close(true));
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close(false);
  });

  dialogState = { overlay, titleEl, messageEl, cancelBtn, confirmBtn, close, onKeydown };
  return dialogState;
}

/**
 * 弹出确认框，返回 Promise<boolean>
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.confirmText='确认']
 * @param {string} [opts.cancelText='取消']
 * @param {boolean} [opts.danger=true] 确认按钮是否危险样式
 * @returns {Promise<boolean>}
 */
export function confirmDialog(opts) {
  return new Promise((resolve) => {
    const d = ensureDialog();
    d.titleEl.textContent = opts.title;
    d.messageEl.textContent = opts.message;
    d.confirmBtn.textContent = opts.confirmText || '确认';
    d.cancelBtn.textContent = opts.cancelText || '取消';
    d.confirmBtn.className = `btn ${opts.danger === false ? 'btn--primary' : 'btn--danger'}`;
    d.overlay.hidden = false;
    // 危险操作默认聚焦「取消」，避免误触
    (opts.danger === false ? d.confirmBtn : d.cancelBtn).focus();
    document.addEventListener('keydown', d.onKeydown, true);
    d.resolve = resolve;
  });
}

/* ---------------- Toast：右下角轻提示，3 秒自动消失 ---------------- */

/**
 * @param {string} message
 * @param {'info'|'success'|'error'} [type='info']
 */
export function showToast(message, type = 'info') {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = h('div', { id: 'toast-root', class: 'toast-root', 'aria-live': 'polite' });
    document.body.appendChild(root);
  }
  const toast = h('div', { class: `toast toast--${type}`, role: 'status' }, [
    h('span', { class: 'toast__text', text: message }),
  ]);
  root.appendChild(toast);
  // 入场后开始离场计时
  requestAnimationFrame(() => toast.classList.add('is-shown'));
  setTimeout(() => {
    toast.classList.remove('is-shown');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ---------------- PreviewDialog：导入前预览（G3） ---------------- */

/** 数据项中文名（与 Config.DATA_FIELD_NAMES 对应） */
const FIELD_LABELS = {
  PROFILE: '个人档案',
  LIFE: '生命预期自定义值',
  SAVINGS: '存款与收支参数',
  SETTINGS: '偏好设置',
};

function schemaLabel(meta) {
  if (!meta) return '未记录';
  const f = meta.formatVersion;
  if (f === null || f === undefined) return '未记录';
  const s = meta.schemaVersion;
  return `v${f}（schema v${s === null || s === undefined ? '?' : s}）`;
}

/**
 * 导入预览对话框：展示将写入 / 覆盖的内容，用户确认后才落库
 * @param {object} opts
 * @param {string} opts.fileName 源文件名
 * @param {object|null} opts.meta { appVersion, schemaVersion, exportedAt, formatVersion }
 * @param {Array<{name:string, action:'add'|'overwrite', detail?:string}>} opts.items
 * @param {string[]} [opts.warnings] 校验提示
 * @param {string[]} [opts.ignoredFields] 被忽略的未知字段
 * @returns {Promise<boolean>} 用户是否确认导入
 */
export function previewDialog(opts) {
  return new Promise((resolve) => {
    let done = false;
    const previousFocus = document.activeElement;

    const cancelBtn = h('button', { type: 'button', class: 'btn btn--ghost', text: '取消' });
    const confirmBtn = h('button', { type: 'button', class: 'btn btn--primary', text: '确认导入' });

    const metaRows = [
      ['文件名', opts.fileName || '—'],
      ['导出时间', opts.meta && opts.meta.exportedAt ? formatDateTime(opts.meta.exportedAt) : '未记录'],
      ['应用版本', (opts.meta && opts.meta.appVersion) || '未记录'],
      ['格式版本', schemaLabel(opts.meta)],
    ];

    const items = opts.items || [];
    const warnings = opts.warnings || [];
    const ignored = opts.ignoredFields || [];

    const children = [
      h('h3', { class: 'modal__title', id: 'preview-title', text: '导入备份预览' }),
      h(
        'div',
        { class: 'preview-meta' },
        metaRows.map(([k, v]) =>
          h('div', { class: 'preview-meta__row' }, [
            h('span', { class: 'preview-meta__key', text: k }),
            h('span', { class: 'preview-meta__val', text: String(v) }),
          ]),
        ),
      ),
      h('div', { class: 'preview-section' }, [
        h('h4', { class: 'preview-section__title', text: `将写入 ${items.length} 项数据` }),
        h(
          'ul',
          { class: 'preview-list' },
          items.map((it) =>
            h('li', { class: 'preview-item' }, [
              h('span', {
                class: `preview-item__badge preview-item__badge--${it.action}`,
                text: it.action === 'overwrite' ? '覆盖' : '新增',
              }),
              h('span', {
                class: 'preview-item__name',
                text: it.label || FIELD_LABELS[it.name] || it.name,
              }),
              it.detail ? h('span', { class: 'preview-item__detail', text: it.detail }) : null,
            ]),
          ),
        ),
      ]),
    ];

    if (warnings.length) {
      children.push(
        h('div', { class: 'preview-section' }, [
          h('h4', { class: 'preview-section__title', text: `校验提示（${warnings.length}）` }),
          h('ul', { class: 'preview-warn' }, warnings.map((w) => h('li', { text: w }))),
        ]),
      );
    }

    if (ignored.length) {
      children.push(
        h('p', { class: 'preview-note', text: `已忽略无法识别的字段：${ignored.join('、')}` }),
      );
    }

    children.push(
      h('p', {
        class: 'preview-note',
        text:
          '导入为「覆盖式」：备份里有的数据项会被写入，备份里没有的保持不变。' +
          '该文件含你的个人参数，仅保存在本机，请妥善保管。',
      }),
      h('div', { class: 'modal__actions' }, [cancelBtn, confirmBtn]),
    );

    const dialog = h(
      'div',
      {
        class: 'modal modal--wide',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'preview-title',
      },
      [h('div', { class: 'modal__body' }, children)],
    );

    const overlay = h('div', { class: 'modal-overlay' }, [dialog]);
    document.getElementById('modal-root').appendChild(overlay);

    function close(result) {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKeydown, true);
      overlay.remove();
      if (previousFocus && typeof previousFocus.focus === 'function') {
        try {
          previousFocus.focus({ preventScroll: true });
        } catch {
          previousFocus.focus();
        }
      }
      resolve(result);
    }
    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    }

    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', onKeydown, true);
    confirmBtn.focus();
  });
}
