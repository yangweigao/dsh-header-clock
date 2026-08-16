# dsh-header-clock

> **DeepSeek Harness 插件** — 本仓库是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的第三方客户端插件，在 DSH 页面顶部居中动态显示当前日期与时间，每秒刷新。

```
2025年01月15日 星期三 14:30:45
```

DSH 是一个基于 Cordis 的 AI 智能体运行时与 Web 界面（https://github.com/deepseek-ai/deepseek-harness）。本插件以 DSH 动态 Cordis 插件（Client 端）形式运行，通过其 `shell.overlay` 槽位注入 UI，无需修改 DSH 本体。

## 功能

- 显示完整日期（`YYYY年MM月DD日`）与中文星期（`星期X`）
- 显示时间（`HH:MM:SS`），每秒自动刷新
- 页面顶部水平居中，滚动时保持固定
- 点击穿透（`pointer-events: none`），不阻挡任何页面操作
- 自动适配明暗主题（使用 `--dsw-alias-*` 主题变量）
- 等宽数字（`tabular-nums`），秒数跳动时数字不晃动

## 实现说明

- 纯 **Client 端**动态 Cordis 插件，无 Host 端代码
- 注册于 `shell.overlay` 槽位（全屏浮层、additive、无替换风险），不遮蔽产品自带 UI
- 使用 Cordis 定时器服务 `ctx.interval`（`inject: ['timer']`），组件卸载时自动清理
- 定位采用 `absolute` 容器 + `flex` 居中（`shell.overlay` 容器本身是 absolute 定位，`fixed` 在该结构下不可靠）
- 日期与时间合并为单个文本流，同一字体行高渲染，天然严格对齐

## 在 DeepSeek Harness 中加载

本插件是 **DSH 动态 Cordis 插件**，无需安装到 DSH 本体目录，在会话中直接加载：

1. 打开 DSH 会话，向模型提供本仓库的 `client.js`；
2. 模型通过 `cordis_define` 注册动态插件（`code.client` 为 `client.js` 中 `apply` 的函数体）；
3. 通过 `cordis_run` 激活，在页面运行卡片上批准即可。

或直接复制以下代码体作为 `code.client`：

```js
return {
  inject: ['timer'],
  apply(ctx) {
    // 见 client.js 中的 apply 函数体
  },
}
```

## 自定义

样式与布局可在 `styles.insert` 中调整：

| 参数 | 位置 | 默认值 |
| --- | --- | --- |
| 距顶部距离 | `.dsh-clock-wrap` → `top` | `20px` |
| 水平偏移 | `.dsh-clock-wrap` → `transform: translate(x, y)` | `(35px, 5px)` |
| 字号 | `.dsh-header-clock` → `font-size` | `24px` |
| 字体族 | `.dsh-header-clock` → `font-family` | 微软雅黑 / PingFang 优先 |
| 文字颜色 | `.dsh-header-clock` → `color` | `--dsw-alias-label-primary` |

日期格式与星期文案在组件内 `text` 模板字符串中修改。

## 共享与社区

- 本插件以**公开仓库**形式共享给 DeepSeek Harness 社区，任何人可直接获取源码、自行加载或二次开发。
- DSH 官方仓库：https://github.com/deepseek-ai/deepseek-harness —— 关于 DSH 本身的问题、需求与贡献请前往该仓库。
- 本插件的功能建议、Bug 报告可通过本仓库的 Issues 提交，欢迎 Fork / PR。

## 许可证

MIT
