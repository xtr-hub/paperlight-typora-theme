# OneLight 官方预览页截图工具

使用 **Typora 官方 `typora-theme-toolkit` 的 `html-preview` 页面**采集主题截图。

不再自己实现 Markdown → DOM 渲染器，也不启动、不控制 Typora；只做三件事：

1. 拉取/复用官方 `html-preview`
2. 把 `onelight.css` / `onelight-dark.css` 注入预览页
3. 用无头浏览器截图

## 环境要求

- Node.js >= 20
- 已安装 `git`（首次运行需要克隆官方 toolkit）
- 已安装 Microsoft Edge 或 Google Chrome（默认使用 Edge）

## 使用

```bash
cd tools/demo-shots
npm install
npm run shots
```

首次运行会自动把官方 toolkit 克隆到：

```text
tools/demo-shots/.cache/typora-theme-toolkit
```

该目录不会提交到 Git。

常用命令：

```bash
npm run shots -- --theme light      # 只生成浅色
npm run shots -- --theme dark       # 只生成深色
npm run shots -- --shot code        # 只生成某个区块
npm run shots -- --list             # 查看配置
npm run shots -- --update-toolkit   # 重新拉取官方 toolkit
npm run shots -- --headed           # 显示浏览器窗口调试
```

默认输出：

```text
docs/img/preview/
├── light/
│   ├── overview.png
│   ├── headings.png
│   ├── ...
├── dark/
│   ├── ...
└── manifest.json
```

`docs/img/preview/` 是生成产物，默认不提交到 Git。需要放进 README 时，复制到 `docs/img/readme/` 并更新引用。

## 预览页来源

- `lorem.html`：官方 Markdown 内容预览页
- `ui-controls2.html`：官方 UI/侧边栏预览页

配置在 `shots.json`：

```json
{
  "themes": {
    "light": "/onelight.css",
    "dark": "/onelight-dark.css"
  },
  "pages": {
    "lorem": "html-preview/html/lorem.html",
    "ui": "html-preview/html/ui-controls2.html"
  },
  "shots": [
    { "name": "overview", "page": "lorem", "mode": "viewport", "scrollTo": "#write h1" },
    { "name": "headings", "page": "lorem", "group": "#write h1, #write h2, #write h3" },
    { "name": "code", "page": "lorem", "selector": "#write pre.md-fences" }
  ]
}
```

- `selector`：截取单个元素
- `group`：把多个元素移动到临时 wrapper 中一起截图（适合标题组）
- `mode: "viewport"`：截取当前视口
- `mode: "fullPage"`：截取完整页面

## 实现说明

- 主题 CSS 通过本地 HTTP 路由注入，不修改官方 toolkit 文件
- `onelight.css` 的相对 `@import` 和字体/图片路径会被映射到仓库里的 `onelight/`
- 官方预览页里的旧版 MathJax SVG 使用 `NS1:href`，现代 Chromium 不识别；工具会把它规范化为 `href` / `xlink:href`
- 旧版预览页的代码块字体颜色、任务列表布局、背景图等问题，工具会用少量截图专用 CSS 修正

## 限制

- 内容固定为官方 `lorem.html`，不是 `docs/demo.md` 的中文 demo
- 官方预览页年代较早（2016–2018 左右），部分 DOM 与当前 Typora 1.x 有差异
- 官方预览页没有 GitHub Alerts 示例
- 这是**浏览器预览**，不包含 Typora 标题栏、菜单栏等应用窗口元素
- 如果要使用中文 demo 并保持 Typora 真实排版，建议用 Typora 导出 HTML 后再截图
