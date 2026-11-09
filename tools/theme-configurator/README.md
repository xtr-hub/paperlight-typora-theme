# Paperlight 主题设置页

这是一个无需服务端的静态配置工具。可以预览浅色和深色主题，调整颜色、排版、背景和表情包，再把设置应用到已安装的 Paperlight 主题。

面板提供下拉菜单、滑块与主题切换的动效，支持键盘操作，并遵循系统的减少动态效果设置。支持原生可定制下拉框的浏览器会显示与面板一致的选项菜单，其他浏览器保留系统菜单。

## 推荐：在线使用

直接打开 [Paperlight 在线配置页](https://xtr-hub.github.io/paperlight-typora-theme/)，无需在本机启动服务。先安装当前版本的 Paperlight 主题，再调整外观、实时预览并保存到 Typora 主题目录。具体安装方法见[项目 README](../../README.md#安装主题)。

预览中的阅读札记展示了中英混排、引用、提示框、任务清单、代码和表格；也可在 Typora 中打开 [Markdown 演示稿](../../docs/demo.md)，体验公式与流程图等更多内容。

## 本地使用

需要 Node.js，执行：

```bash
node tools/theme-configurator/serve.mjs
```

在浏览器打开 `http://127.0.0.1:4173/tools/theme-configurator/`。先在 Typora 中安装此仓库版本的 Paperlight 主题；设置页只生成自定义覆盖文件，不会安装主题本身。

1. 调整设置，并在预览中切换浅色或深色主题。
2. 在 Typora 的「偏好设置 → 外观 → 打开主题文件夹」中找到实际使用的主题目录。
3. 在设置页选择该文件夹并点击「保存到主题文件夹」。也可以下载两个 CSS 文件，手动放进该目录。
4. 重启 Typora 或切换一次主题，使新配置生效。

Typora 会加载同目录下的 `paperlight.user.css` 和 `paperlight-dark.user.css`。直接保存只更新这两个文件中由设置页标记的区块，保留文件内其他自定义 CSS。如果手动安装下载的文件，请先合并或备份已经存在的同名文件。

从 OneLight 升级时，如果旧的 `onelight.user.css` 或 `onelight-dark.user.css` 包含需要保留的手写样式，请先复制为对应的 `paperlight.user.css` 或 `paperlight-dark.user.css`。设置页会识别并更新复制文件中的旧版 OneLight 配置标记，保留标记之外的内容；旧文件不会被修改。旧版导出的 JSON 仍可导入。在相同浏览器来源下，旧版保存在 IndexedDB 中的设置也会自动恢复；跨浏览器或跨域时请使用 JSON 导入。

## 图片与配置

- 背景和表情包可使用内置图片、本地图片或 HTTP(S) 图片链接；背景支持位置、尺寸、平铺和遮罩强度，表情包支持四角位置、边距、尺寸和透明度。
- 本地 PNG、JPEG、GIF、WebP、AVIF 图片最大 8 MB，会嵌入生成的 CSS 和配置文件，换电脑时无需另行复制图片。链接图片仍依赖链接可用和网络连接。
- 「导出配置」生成包含设置和本地图片的 JSON；「导入配置」可恢复它。请妥善保管这些文件，因为其中可能包含你选择的图片。
- 设置会保存在当前浏览器的本地存储中，刷新后自动恢复；清除浏览器数据或更换浏览器前，请先导出配置。刷新后需要重新选择主题文件夹。
- 直接写目录依赖浏览器的 File System Access API，需要 HTTPS 或 localhost，且需要用户在目录选择器中授权。浏览器不支持时，可使用下载或复制方式；网页不能直接读取用户输入的任意本机路径。

## 构建与静态部署

在仓库根目录运行：

```bash
node tools/theme-configurator/build.mjs
```

将生成的 `dist/` **整个目录**作为静态网站根目录上传到任意静态托管服务。`dist/index.html` 是网页入口，构建结果还包含预览和 Paperlight 所需样式、字体与内置图片；支持部署在网站子路径下。`dist/` 是构建产物，不会提交到 Git。运行时不需要 Node.js 或后端服务，Node.js 仅用于本地构建与预览。

### 使用 GitHub Pages 自动部署

1. 在 GitHub 仓库的 **Settings → Pages → Build and deployment** 中，将 **Source** 设置为 **GitHub Actions**。
2. 将更改推送到 `paperlight` 分支。仓库自带的 `Deploy theme configurator` 工作流会执行构建，将 `dist/` 上传为 Pages 工件并部署。
3. 在仓库 **Actions → Deploy theme configurator** 中查看运行状态和部署地址。也可以从工作流页面手动运行；如果 `github-pages` 环境配置了分支限制，需要允许 `paperlight` 分支。

使用 HTTPS 才能在支持的浏览器中授权写入本地主题目录。其他浏览器仍可预览、导入和导出，并通过下载 CSS 手动安装。

## 回归测试

测试使用现有截图工具的 `playwright-core` 依赖和本机 Microsoft Edge，不会操作实际 Typora 目录：

```bash
npm --prefix tools/demo-shots install
node --test tools/theme-configurator/tests/integration.test.cjs
```

如果浏览器不在 Windows 的默认 Edge 路径，可通过 `BROWSER_PATH` 环境变量指定 Chromium 内核浏览器的可执行文件。
