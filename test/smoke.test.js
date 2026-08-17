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
  querySelector: (sel) => styleTags.find((t) => sel.includes('header-clock') && t.textContent) || null,
}
global.window = {}
global.document = document

let injectedDate = null
let stateValue = null
let effectCleanup = null
const React = {
  useState: (init) => {
    if (stateValue === null) stateValue = injectedDate || (typeof init === 'function' ? init() : init)
    return [stateValue, (v) => { stateValue = v }]
  },
  useEffect: (fn) => { try { effectCleanup = fn() || null } catch {} },
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
  stateValue = null
  const inner = componentFn().type()
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

// ========== timer 清理 ==========
let disposed = 0
let cleanupRegister = null, cleanupComponent = null
effectCleanup = null
const cleanupCtx = {
  slots: { inject: (n, cb) => { cleanupRegister = cb }, register: (o, comp) => { cleanupComponent = comp } },
  interval: () => () => { disposed += 1 },
}
loaded.apply(cleanupCtx)
cleanupRegister()
cleanupComponent().type() // 渲染 → useEffect → 注册 interval → disposer 存入 effectCleanup
check('渲染时注册了 interval', typeof intervalCb === 'function')
effectCleanup() // 卸载 → 调用 disposer
check('timer disposer 在卸载时被调用', disposed === 1)

console.log(`\n${fail === 0 ? '✓ 全部通过' : `✗ ${fail} 项失败`}（共 ${total.length} 项）`)
process.exit(fail === 0 ? 0 : 1)
