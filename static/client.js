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
      // 绝对定位：顶部外边距固定 20px；水平由 JS 覆盖 left，
      // 使时钟左边缘与"页面状态显示区域"右边缘保持 10px 距离。
      // CSS left:50% + translateX(-50%) 作为首帧兜底（无闪烁）。
      '.dsh-clock-wrap {',
      '  position: absolute;',
      '  top: 20px;', // 顶部外边距固定 20px
      '  left: 50%;',
      '  transform: translateX(-50%);', // 回移自身一半宽度（JS left 含宽度补偿）
      '  transition: top 0.25s ease, left 0.25s ease;', // 位置变化平滑过渡，避免跳变闪烁
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
            const [left, setLeft] = React.useState(null)
            const ref = React.useRef(null)
            React.useEffect(() => ctx.interval(() => setNow(new Date()), 1000), [])
            // 与"页面状态显示区域"保持左边距 10px（时钟在它右侧 10px）：
            // 每秒扫描文本含"创造/创意"的元素，left = 区域右边缘 + 10 + 自身宽一半
            // （transform translateX(-50%) 回移宽度一半，使实际左边缘 = 区域右边缘 + 10）。
            // 顶部外边距固定 20px（CSS）。稳定性：跳过滚动容器文本、锁定目标、平滑过渡。
            React.useEffect(() => {
              let locked = null
              const inScrollable = (el) => {
                let cur = el
                while (cur && cur !== document.body) {
                  const s = getComputedStyle(cur)
                  if (/(auto|scroll)/.test(s.overflowY) && cur.scrollTop > 0) return true
                  cur = cur.parentElement
                }
                return false
              }
              const scan = () => {
                try {
                  const layer = document.querySelector('[data-shell-overlay]')
                  if (!layer) return
                  let target = locked && document.contains(locked) ? locked : null
                  if (!target) {
                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
                    let node = null
                    while ((node = walker.nextNode())) {
                      const t = (node.textContent || '').trim()
                      const el = node.parentElement
                      if (/创造模式|创意模式|创造|创意/.test(t) && t.length < 20 && el && !inScrollable(el)) {
                        target = el
                        break
                      }
                    }
                    locked = target
                  }
                  if (!target) return
                  const r = target.getBoundingClientRect()
                  const lr = layer.getBoundingClientRect()
                  const width = ref.current ? ref.current.offsetWidth : 0
                  setLeft(Math.round(r.right - lr.left + 10 + width / 2))
                } catch (e) {}
              }
              scan()
              return ctx.interval(scan, 1000)
            }, [])
            // 与"创造模式"状态条保持 10px 距离：每秒扫描文本含"创造/创意"的元素，
            // 时钟 top = 该元素底部 + 10px（相对 overlay 容器）。找不到时保持 CSS 兜底。
            // 稳定性三措施：跳过滚动容器内的文本（排除聊天内容误匹配）、
            // 锁定首次匹配的元素（不随扫描更换目标）、平滑过渡（CSS transition）。
            React.useEffect(() => {
              let locked = null
              const inScrollable = (el) => {
                let cur = el
                while (cur && cur !== document.body) {
                  const s = getComputedStyle(cur)
                  if (/(auto|scroll)/.test(s.overflowY) && cur.scrollTop > 0) return true
                  cur = cur.parentElement
                }
                return false
              }
              const scan = () => {
                try {
                  const layer = document.querySelector('[data-shell-overlay]')
                  if (!layer) return
                  let target = locked && document.contains(locked) ? locked : null
                  if (!target) {
                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
                    let node = null
                    while ((node = walker.nextNode())) {
                      const t = (node.textContent || '').trim()
                      const el = node.parentElement
                      if (/创造模式|创意模式|创造|创意/.test(t) && t.length < 20 && el && !inScrollable(el)) {
                        target = el
                        break
                      }
                    }
                    locked = target
                  }
                  if (!target) return
                  const r = target.getBoundingClientRect()
                  const lr = layer.getBoundingClientRect()
                  const width = ref.current ? ref.current.offsetWidth : 0
                  setLeft(Math.round(r.right - lr.left + 10 + width / 2))
                } catch (e) {}
              }
              scan()
              return ctx.interval(scan, 1000)
            }, [])
            const pad = (n) => String(n).padStart(2, '0')
            const weekdays = ['日', '一', '二', '三', '四', '五', '六']
            const date = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 星期${weekdays[now.getDay()]}`
            const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
            const text = `${date}　${time}`
            const style = { left: left === null ? undefined : left + 'px' }
            return React.createElement(
              'div',
              { className: 'dsh-clock-wrap', style },
              React.createElement('span', { className: 'dsh-header-clock', title: '当前时间', ref }, text),
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
