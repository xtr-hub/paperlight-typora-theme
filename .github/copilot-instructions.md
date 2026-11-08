- 这是一个typora主题项目,项目地址为 https://github.com/xtr-hub/typora-onelight-theme
- onelight.css 是主题的主样式文件,其中导入了其他样式文件,onelight-dark.css 是暗黑主题的样式文件
- onelight.user.css 是用户自定义样式文件,优先级更高,可以添加用户自定义设置
- onelight文件夹下包含了主题的样式、图片和字体等资源
- title是标题样式的相关定义
- code是代码块样式的相关定义
- blockquote是引用块样式的相关定义
- table是表格样式的相关定义
- list是列表样式的相关定义
- editor是编辑器样式的相关定义
- 尽量不要使用!important
- 尽量使用最少的代码达到效果

目录结构：

📂 themes                              # Typora 主题根目录
├── 📂 onelight                        # OneLight 主题资源目录
│   ├── 📂 fonts                       # 字体资源目录
│   │   ├── CascadiaCode.woff2        
│   │   └── MiaoZi-GuoZhiTi.woff2     
│   ├── 📂 img                         # 图片资源目录
│   │   ├── bg.gif                     
│   │   ├── ...                                  
│   └── 📂 style                       # 样式文件目录
│       ├── blockquote.css             # 引用块样式
│       ├── code.css                   # 代码块样式
│       ├── editor.css                 # 编辑器样式
│       └── ...
├── onelight-dark.css                  # OneLight 暗色主题样式文件
├── onelight.css                       # OneLight 主题的主样式文件
├── onelight.user.css                  # 用户自定义样式文件（仓库中没有，有需要自己创建，样式优先级高）
└── onelight-dark.user.css             # 同上，但是深色主题自定义样式文件