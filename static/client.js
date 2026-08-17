/**
 * header-clock — Browser half (built bundle format, mirrors DSH client packages).
 *
 * Registers the plugin factory with the web client module loader. On load it:
 *  - injects the clock CSS once (tagged so it is idempotent across reloads);
 *  - registers a Clock component in the `shell.overlay` slot, fixed at the
 *    top center of the page, updating every second.
 *
 * The Clock uses the Cordis timer service (ctx.interval) with proper cleanup.
 */
window.__ModuleLoader__.load({
  id: 'header-clock',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')

    const inject = ['slots', 'timer']

    const css = [
      // 无绝对定位：时钟位于 overlay 容器正常文档流中，左上角 + 边距。
      '.dsh-clock-wrap {',
      '  margin: 20px 0 0 200px;', // 距顶 20px、距左 200px
      '  pointer-events: none;',
      '}',
      '.dsh-header-clock {',
      '  display: inline-block;',
      "  font-family: 'Microsoft YaHei', 'PingFang SC', 'Segoe UI', system-ui, sans-serif;",
      '  font-size: 1.5rem;', // 24px（16px 根字号），跟随浏览器字号设置，视障用户调大字号时自动放大
      '  line-height: 1.4;',
      '  color: var(--dsw-alias-label-primary, rgba(255, 255, 255, 0.92));',
      '  font-variant-numeric: tabular-nums;',
      '  white-space: nowrap;',
      '  user-select: none;',
      '}',
      // 窄屏无障碍：最小 1rem（16px，正文基准），低视力用户仍可读
      '@media (max-width: 768px) {',
      '  .dsh-header-clock { font-size: 1rem; }',
      '}',
      '@media (max-width: 480px) {',
      '  .dsh-header-clock { font-size: 1rem; }',
      '}',
    ].join('\n')

    // 注入或更新样式：同一页面内重载时刷新内容，避免旧样式残留
    if (typeof document !== 'undefined') {
      let tag = document.querySelector('style[data-plugin-css="header-clock"]')
      if (tag) {
        tag.textContent = css
      } else {
        tag = document.createElement('style')
        tag.dataset.pluginCss = 'header-clock'
        tag.textContent = css
        document.head.appendChild(tag)
      }
    }

    function apply(ctx) {
      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'header-clock', order: 0, label: 'Clock' },
        () => {
          const Clock = () => {
            const [now, setNow] = React.useState(() => new Date())
            React.useEffect(() => ctx.interval(() => setNow(new Date()), 1000), [])
            const pad = (n) => String(n).padStart(2, '0')
            const weekdays = ['日', '一', '二', '三', '四', '五', '六']
            const date = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 星期${weekdays[now.getDay()]}`
            const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
            const text = `${date}　${time}`
            return React.createElement(
              'div',
              { className: 'dsh-clock-wrap' },
              React.createElement('span', { className: 'dsh-header-clock', title: '当前时间' }, text),
            )
          }
          return React.createElement(Clock)
        },
      ))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
