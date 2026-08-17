# dsh-header-clock

> **DeepSeek Harness 插件** — 本仓库是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的第三方客户端插件，在 DSH 页面顶部居中动态显示当前日期与时间，每秒刷新。

```
2025年01月15日 星期三　14:30:45
```

DSH 是一个基于 Cordis 的 AI 智能体运行时与 Web 界面（https://github.com/deepseek-ai/deepseek-harness）。本插件以 DSH Cordis 插件（Client 端）形式运行，通过其 `shell.overlay` 槽位注入 UI，无需修改 DSH 本体。

> 本仓库提供两种形态：`client.js`（动态插件，会话内加载）与 `static/`（静态持久化插件，随 DSH 启动自动加载）。

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

### 方式 A：动态插件（会话内，临时）

无需安装到 DSH 本体目录，在会话中直接加载：

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

> 注意：动态插件是进程级的，**DSH 重启后消失**，需要重新激活。

### 方式 B：静态持久化插件（随 DSH 启动自动加载，推荐）

把 `static/` 目录安装为 DSH profile 的本地插件包，**每次进入页面自动显示时钟**，刷新/重启都不消失：

1. 将 `static/` 整个目录复制为 `<DSH_HOME>/profiles/web/node_modules/header-clock/`
   （Windows 默认 `C:\Users\<用户名>\.dsh\profiles\web\node_modules\header-clock\`）
2. 编辑 `<DSH_HOME>/profiles/web/cordis.patch.yml`，追加：

   ```yaml
   - insert:
       - id: header-clock
         name: header-clock
   ```

3. **重启 DSH 服务**（不是刷新浏览器——启动清单只在服务启动时构建），时钟即自动出现。

验证：`dsh --profile web --dump-config | grep header-clock` 应能看到该条目。

**临时禁用**（保留文件，随时恢复）：把 `cordis.patch.yml` 中 header-clock 条目的 `disabled` 改为 `true`，重启 DSH 即可；改回 `false` 并重启即恢复。**彻底卸载**：删除该 patch 条目并删除 `node_modules/header-clock/` 目录。

## 自定义

样式与布局可在代码的 CSS 模板中调整：

| 参数 | 位置 | 默认值 |
| --- | --- | --- |
| 距顶部距离 | `.dsh-clock-wrap` → `top` | `20px` |
| 水平偏移 | `.dsh-clock-wrap` → `transform: translate(x, y)` | `(50px, 5px)` |
| 字号 | `.dsh-header-clock` → `font-size` | `24px` |
| 字体族 | `.dsh-header-clock` → `font-family` | 微软雅黑 / PingFang 优先 |
| 文字颜色 | `.dsh-header-clock` → `color` | `--dsw-alias-label-primary` |

日期格式与星期文案在组件内 `text` 模板字符串中修改。改动后重启 DSH 服务生效。

## 共享与社区

- 本插件以**公开仓库**形式共享给 DeepSeek Harness 社区，代码以 MIT 协议公开，欢迎 Fork 自用、二次开发或提交改进。
- DSH 官方仓库：https://github.com/deepseek-ai/deepseek-harness —— 关于 DSH 本身的问题、需求与贡献请前往该仓库。
- 功能建议、Bug 报告可通过本仓库的 Issues 提交，欢迎 PR。

## 许可证

MIT
