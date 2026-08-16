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
      .dsh-clock-wrap {
        position: absolute;
        top: 20px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        transform: translate(35px, 5px);
        pointer-events: none;
      }
      .dsh-header-clock {
        display: inline-block;
        font-family: 'Microsoft YaHei', 'PingFang SC', 'Segoe UI', system-ui, sans-serif;
        font-size: 24px;
        line-height: 1.4;
        color: var(--dsw-alias-label-primary, rgba(255, 255, 255, 0.92));
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        user-select: none;
      }
    `)

    slots.inject('shell.overlay', () => {
      return slots.register(
        { name: 'shell.overlay', id: 'clock', order: 0, label: 'Clock' },
        () => {
          const Clock = () => {
            const [now, setNow] = React.useState(() => new Date())
            React.useEffect(() => ctx.interval(() => setNow(new Date()), 1000), [])
            const pad = (n) => String(n).padStart(2, '0')
            const weekdays = ['日', '一', '二', '三', '四', '五', '六']
            const date = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 星期${weekdays[now.getDay()]}`
            const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
            // 日期与时间之间使用全角空格分隔，空隙更明显
            const text = `${date}　${time}`
            return React.createElement(
              'div',
              { className: 'dsh-clock-wrap' },
              React.createElement('span', { className: 'dsh-header-clock', title: '当前时间' }, text),
            )
          }
          return React.createElement(Clock)
        },
      )
    })
  },
}
