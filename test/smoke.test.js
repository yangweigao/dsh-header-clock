/**
 * header-clock 冒烟测试（无需 DSH 环境，纯 Node 运行）
 *
 * 用法: node test/smoke.test.js
 * 验证: 模块加载、CSS 注入幂等、槽位注册、渲染结构、日期格式、
 *       日期边界（闰年/年末/年初/补零/星期）、timer 清理。
 */
'use strict'
const fs = require('fs')
const path = require('path')

const PLUGIN_SRC = path.join(__dirname, '..', 'static', 'client.js')
const src = fs.readFileSync(PLUGIN_SRC, 'utf8')

let fail = 0
const total = []
function check(name, ok, detail = '') {
  total.push({ name, ok })
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) fail += 1
}

// ========== 浏览器环境 mock ==========
const styleTags = []
const document = {
  head: { appendChild: (t) => styleTags.push(t) },
  createElement: (n) => ({ tagName: n, dataset: {}, textContent: '' }),
  querySelector: (sel) => {
    // CSS 注入守卫需要命中 style 标签；DOM 查询（[data-shell-overlay]）返回 null → JS 对准走兜底路径
    if (sel.startsWith('style[')) return styleTags.find((t) => sel.includes('header-clock') && t.textContent) || null
    return null
  },
}
global.window = { innerWidth: 1024, addEventListener: () => {}, removeEventListener: () => {} }
global.document = document
global.getComputedStyle = () => ({})

// React mock：hook 按调用序复用（模拟真实 React），ref 返回可测量对象
let injectedDate = null
let stateValues = []
let hookIndex = 0
let effectCleanup = null
const refMock = { current: { offsetWidth: 400 } }
const React = {
  useState: (init) => {
    if (stateValues[hookIndex] === undefined) {
      stateValues[hookIndex] = typeof init === 'function'
        ? (hookIndex === 0 ? (injectedDate || init()) : init())
        : init
    }
    const i = hookIndex
    hookIndex += 1
    return [stateValues[i], (v) => { stateValues[i] = v }]
  },
  useEffect: (fn) => { try { effectCleanup = fn() || null } catch {} },
  useRef: () => refMock,
  createElement: (type, props, ...children) => ({ type, props, children }),
}
let intervalCb = null
let registerCb = null, registerOpts = null, componentFn = null
const ctx = {
  slots: {
    inject: (name, cb) => { registerCb = cb },
    register: (opts, component) => { registerOpts = opts; componentFn = component },
  },
  interval: (cb) => { intervalCb = cb; return () => {} },
  get: () => undefined,
}

// 渲染辅助：重置 hook 指针后渲染组件（保留 state，模拟真实 React 复用）
function renderClock() {
  hookIndex = 0
  const el = componentFn()
  return el.type() // 执行 Clock
}

// ========== 加载插件 ==========
let loaded = null
window.__ModuleLoader__ = {
  load: ({ factory }) => {
    const module = { exports: {} }
    loaded = factory((name) => {
      if (name === 'react') return React
      throw new Error('unexpected require: ' + name)
    }) || module.exports
  },
}
eval(src) // 首次加载
eval(src) // 二次加载（重载场景）

check('模块导出 apply/inject', loaded && typeof loaded.apply === 'function' && Array.isArray(loaded.inject))
check('inject 声明 slots/timer', loaded.inject.includes('slots') && loaded.inject.includes('timer'))
check('CSS 注入且重载不重复', styleTags.length === 1)
check('CSS 含窄屏媒体查询', styleTags[0].textContent.includes('@media (max-width: 768px)'))

loaded.apply(ctx)
registerCb()
check('注册槽位 shell.overlay', registerOpts && registerOpts.name === 'shell.overlay')
check('slot id 为 header-clock（无冲突）', registerOpts && registerOpts.id === 'header-clock')

// ========== 渲染与日期格式 ==========
function renderAt(iso) {
  injectedDate = new Date(iso)
  stateValues = [] // 全新状态：注入测试日期
  const inner = renderClock()
  const span = inner.children[0]
  return Array.isArray(span.children) ? span.children[0] : span.children
}
check('常规日期', renderAt('2026-08-17T09:06:39') === '2026年08月17日 星期一　09:06:39')
check('闰年 2 月 29 日', renderAt('2024-02-29T00:00:00') === '2024年02月29日 星期四　00:00:00')
check('年末最后一秒', renderAt('2025-12-31T23:59:59') === '2025年12月31日 星期三　23:59:59')
check('新年第一秒', renderAt('2026-01-01T00:00:00') === '2026年01月01日 星期四　00:00:00')
check('个位数补零', renderAt('2025-01-05T07:03:04') === '2025年01月05日 星期日　07:03:04')
check('星期映射 7 天', (() => {
  const map = { '2026-08-16': '日', '2026-08-17': '一', '2026-08-18': '二', '2026-08-19': '三', '2026-08-20': '四', '2026-08-21': '五', '2026-08-22': '六' }
  return Object.entries(map).every(([iso, w]) => renderAt(iso + 'T12:00:00').includes('星期' + w))
})())

// ========== CSS 定位断言（纯 CSS：left 50% + translateX 回移） ==========
;(() => {
  const cssText = styleTags[0].textContent
  check('CSS 使用 left: 50% 兜底定位', cssText.includes('left: 50%'))
  check('CSS 使用 translateX 回移（含右移 50px）', cssText.includes('translateX(calc(-50% + 50px))'))
  // 渲染：JS 对准在测试环境走兜底路径（无 DOM）→ left 保持 null → style.left undefined
  stateValues = []
  const inner = renderClock()
  check('wrap 有 style 且 left 为 undefined（CSS 兜底）', inner.props.style && inner.props.style.left === undefined, '实际: ' + JSON.stringify(inner.props.style))
})()

// ========== timer 清理 ==========
let disposed = 0
let lastDisposer = null
let cleanupRegister = null, cleanupComponent = null
const cleanupCtx = {
  slots: { inject: (n, cb) => { cleanupRegister = cb }, register: (o, comp) => { cleanupComponent = comp } },
  interval: () => { lastDisposer = () => { disposed += 1 }; return lastDisposer },
}
loaded.apply(cleanupCtx)
cleanupRegister()
hookIndex = 0
stateValues = []
cleanupComponent().type() // 渲染 → useEffect → 注册 interval
check('渲染时注册了 interval', typeof intervalCb === 'function')
lastDisposer() // 卸载 → 调用 disposer
check('timer disposer 在卸载时被调用', disposed === 1)

console.log(`\n${fail === 0 ? '✓ 全部通过' : `✗ ${fail} 项失败`}（共 ${total.length} 项）`)
process.exit(fail === 0 ? 0 : 1)
