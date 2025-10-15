# Tauri + Vue 3

This template should help get you started developing with Tauri + Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## 临时记录
- 错误处理日后要统一

## 目录结构
```markdown
TauriOmniTool/
├── src-tauri/              # Tauri 后端核心目录
│   ├── src/
│   │   ├── main.rs         # 入口文件
│   │   ├── lib.rs          # 核心库文件，模块声明
│   │   ├── utils/          # 一些公用的文件
│   │   └── modules/        # 【关键】按功能模块划分的Rust代码
│   │       └── file_ops/   # 文件操作模块
│   ├── capabilities/
│   │   └── default.json
│   ├── icons/              # 应用图标
│   ├── target/             # 编译输出目录
│   ├── Cargo.toml          # Rust 依赖管理
│   └── tauri.conf.json
├── src/                    # Vue 3 前端核心目录
│   ├── assets/             # 静态资源 (图片、字体等)
│   ├── components/         # 公共组件
│   │   ├── common/         # 全局通用组件 (如按钮、弹窗、加载条)
│   │   └── modules/        # 按模块划分的较大型组件
│   ├── hooks/              # 【Vue3核心】Composables (自定义hooks)，复用逻辑
│   ├── router/             # Vue Router 路由配置
│   ├── stores/             # Pinia 状态管理
│   │   ├── capability.js   # 功能库相关的
│   │   ├── shortcut.js     # 快捷键相关的
│   │   └── modules/        # 按模块划分的 Store
│   ├── utils/              # 工具文件
│   │   ├── function.js     # 通用JS函数文件
│   │   ├── mitt.js         # mitt文件，用于各组件之间传值
│   │   └── sqlite.js       # 数据库相关的操作
│   ├── views/              # 页面级组件 (路由组件)
│   │   ├── Capabilities.vue# 功能库组件
│   │   ├── Use.vue         # 功能组件（所有功能都从这里动态加载）
│   │   └── Home.vue        # 首页
│   ├── App.vue             # Vue 根组件
│   └── main.js             # Vue 入口文件
├── public/                 # 纯粹的静态文件，不经过 Vite 处理
├── index.html              # HTML 模板
├── package.json            # 前端依赖管理
├── vite.config.js          # Vite 构建配置
├── README.md               # 项目说明文档
└── CHANGELOG.md            # 更新日志