/**
 * dsh-header-clock
 * DeepSeek Harness 头部时钟插件（Client 端）
 *
 * 在页面顶部居中显示当前日期与时间：
 *   YYYY年MM月DD日 星期X HH:MM:SS
 * 每秒刷新一次。
 *
 * 实现要点：
 *  - 注册于 shell.overlay 槽位（全屏浮层、可添加、点击穿透），
 *    不会替换或遮蔽任何产品自带 UI。
 *  - 使用 Cordis 定时器服务 ctx.interval（inject: ['timer']），
 *    每秒更新一次 Date 状态；组件卸载时自动清理。
 *  - 定位使用 absolute + inset 容器 + flex 居中（overlay 容器本身
 *    是 absolute 定位，fixed 定位在该结构下不可靠）。
 *  - 样式使用主题 CSS 变量（--dsw-alias-*），自动适配明暗主题。
 *
 * 在 DeepSeek Harness 中加载：将下方 module.exports 的 apply 函数体
 * 作为动态插件的 code.client 传入 cordis_define（详见 README.md）。
 */
module.exports = {
  inject: ['timer'],
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    styles.insert(`
      /* 绝对定位，对准内容区（center 列）头部：
         垂直 top 20px 在内容区顶部；水平由 JS 覆盖 left 对准内容区中央，
         CSS left:50% + translateX(-50%) 作为首帧兜底（无闪烁）。 */
      .dsh-clock-wrap {
        position: absolute;
        top: 20px; /* 内容区头部（兜底） */
        left: 50%;
        transform: translateX(-50%); /* 回移自身一半宽度 */
        transition: top 0.25s ease, left 0.25s ease; /* 位置变化平滑过渡，避免跳变闪烁 */
        pointer-events: none;
      }
      .dsh-header-clock {
        display: inline-block;
        font-family: 'Microsoft YaHei', 'PingFang SC', 'Segoe UI', system-ui, sans-serif;
        font-size: 1.5rem; /* 24px（16px 根字号），跟随浏览器字号设置 */
        line-height: 1.4;
        color: var(--dsw-alias-label-primary, rgba(255, 255, 255, 0.92));
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        user-select: none;
      }
      /* 窄屏无障碍：最小 1rem（16px 正文基准） */
      @media (max-width: 768px) {
        .dsh-header-clock { font-size: 1rem; }
      }
      @media (max-width: 480px) {
        .dsh-header-clock { font-size: 1rem; }
      }
    `)

    slots.inject('shell.overlay', () => {
      return slots.register(
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
            const pad = (n) => String(n).padStart(2, '0')
            const weekdays = ['日', '一', '二', '三', '四', '五', '六']
            const date = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 星期${weekdays[now.getDay()]}`
            const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
            // 日期与时间之间使用全角空格分隔，空隙更明显
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
      )
    })
  },
}
