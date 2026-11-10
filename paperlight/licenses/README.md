# 许可证与第三方资源

核查日期：2026-11-10。

Paperlight 的主题代码沿用原 OneLight 项目的 [WTFPL](../../LICENSE) 许可证。
**第三方字体、图标和图片保留各自的权利，不因随项目提供而转为 WTFPL。**
本文件用于披露来源和已知许可状态，不是第三方版权方出具的授权书。

## 随附资源清单

| 文件 | 来源或识别依据 | 许可与当前状态 |
| --- | --- | --- |
| `fonts/MiaoZi-GuoZhiTi.woff2` | 从 [原 OneLight 项目](https://github.com/caolib/typora-onelight-theme/tree/onelight) 沿用；字体内嵌名称为 MiaoZi-GuoZhiTi，Version 1.000，版权方为上海喵字网络科技有限公司 | **未核实到本项目的再分发授权**。内嵌说明要求联系版权方取得许可；不能按 WTFPL 或“免费商用字体”处理 |
| `fonts/JetBrainsMono-Regular.woff2` | 内嵌版权为 The JetBrains Mono Project Authors，Version 2.304，内嵌许可为 SIL OFL 1.1；[上游项目](https://github.com/JetBrains/JetBrainsMono/tree/v2.304) | [SIL OFL 1.1 全文](JetBrainsMono-OFL.txt)；分发时须保留版权与许可说明 |
| `fonts/codicon.ttf` | 从原 OneLight 沿用；内嵌字体族为 codicon、Version 1.5，没有内嵌版权或许可字段；[Microsoft Codicons 上游](https://github.com/microsoft/vscode-codicons) | 上游图标采用 [CC BY 4.0](Codicons-CC-BY-4.0.txt)。**当前副本对应的具体上游版本尚未核实**，附上游许可不等于完成该副本的来源核验 |
| `img/mutou.gif` | 从原 OneLight 项目沿用；本项目未找到原始创作者和图片的独立许可文件 | **作者及再分发许可待核实**；不作免费使用、商用或开放再分发的承诺 |
| `img/mutou2.gif` | 从原 OneLight 项目沿用；本项目未找到原始创作者和图片的独立许可文件 | **作者及再分发许可待核实**；不作免费使用、商用或开放再分发的承诺 |

以上路径相对于 `paperlight/`。`resources.json` 记录当前文件的 SHA-256 校验值、
核查依据和许可状态，便于后续补充授权或确认版本。校验值只能识别文件，不能证明授权。

## 使用与公开发布

- 保留这些旧资源是为了恢复现有外观，**不代表本项目已获得其全部使用或再分发权利**。
- 如需使用喵字果汁体、两张 GIF，或再次公开分发包含它们的安装包，请先确认并取得覆盖实际用途的许可。
  本项目没有依据承诺“非商业使用就一定可以”。
- 可以在配置页关闭手写标题字体及表情包，或选择自己有权使用的图片。
  **关闭显示不会从仓库或安装包中移除文件**，不能代替再分发许可。
- 暂不发布此次计划中的正式 Release，也不提交官方主题库收录 PR。
  后续需先补齐未确认资源的授权与来源，或改用许可明确的资源，再重新检查安装包。
- 用户上传或通过链接选用的图片，其权利由相应版权方保留；自定义图片功能不提供图片授权。

## 原项目与独立维护

感谢 [caolib/typora-onelight-theme](https://github.com/caolib/typora-onelight-theme)
提供原主题。Paperlight 是社区独立维护的衍生项目，并非 Typora 官方或原主题作者移交的项目。
原项目的代码许可证与第三方素材的许可状态应分别核查。
