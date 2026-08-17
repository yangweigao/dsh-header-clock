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
      /* 纯 CSS 定位：相对 overlay 容器（填满页面框架）水平居中 + 右移 50px。
         不依赖 JS：任何渲染时刻（含重挂载首帧）位置都正确，无闪烁。 */
      .dsh-clock-wrap {
        position: absolute;
        top: 25px; /* 距顶 20px + 下移 5px */
        left: 50%;
        transform: translateX(calc(-50% + 50px)); /* 回移自身一半宽度 + 右移 50px */
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
            // JS 对准内容区（center 列）中央：测量 overlay 层兄弟中 grid 第 2 列的几何，
            // left = 列中央 + 右移 50px（transform 负责回移自身一半宽度）。
            // CSS left:50% 作为首帧兜底，无闪烁；ResizeObserver 跟踪侧边栏拖拽/列宽变化。
            React.useEffect(() => {
              let observer = null
              const update = () => {
                try {
                  const el = ref.current
                  const layer = document.querySelector('[data-shell-overlay]')
                  if (!el || !layer) return
                  const frame = layer.parentElement
                  const center = [...frame.children].find(
                    (c) => c !== layer && getComputedStyle(c).gridColumnStart === '2',
                  )
                  if (!center) return
                  const cr = center.getBoundingClientRect()
                  setLeft(Math.round(cr.left + cr.width / 2 + 50))
                } catch (e) {}
              }
              try {
                update()
                window.addEventListener('resize', update)
                if (typeof ResizeObserver !== 'undefined') {
                  const layer = document.querySelector('[data-shell-overlay]')
                  if (layer) {
                    const frame = layer.parentElement
                    const center = [...frame.children].find(
                      (c) => c !== layer && getComputedStyle(c).gridColumnStart === '2',
                    )
                    if (center) {
                      observer = new ResizeObserver(update)
                      observer.observe(center)
                    }
                  }
                }
              } catch (e) {}
              return () => {
                try { window.removeEventListener('resize', update) } catch (e) {}
                try { if (observer) observer.disconnect() } catch (e) {}
              }
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
