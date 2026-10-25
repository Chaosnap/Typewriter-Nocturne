# 云端构建

所有依赖安装、原生模块编译、测试和安装包都由 GitHub Actions 完成，不在开发者的电脑上构建任何东西。

```text
修改代码 → 推送 → CI（代码检查 · 类型 · 单元测试 · 许可证 · 打包 · 真实 PTY 端到端测试）→ 修复 → 推送
```

每次推送到 `main` 都会运行：

- **Validate**：ESLint 与 Prettier、TypeScript、单元测试（物理、光照模型、每种纸张的对比度、设置校验、诗笺、按键分类），以及所有生产依赖的许可证检查；
- **Package**（macOS、Windows、Linux）：生成安装包，然后对打包后的应用做端到端测试——通过真实 PTY 向真实 Shell 输入，检查输出、退出码、中日韩文字、粘贴、输入法组合输入、窗口缩放、台灯拉绳和印刷机，并拍摄本文档中的截图。

打版本标签时会发布带校验和的 [Release](https://github.com/Chaosnap/Typewriter-Nocturne/releases)。本站用 VitePress 构建，同样由流水线发布到 GitHub Pages。

Typewriter Nocturne 是 [Hyper](https://github.com/vercel/hyper) 的分支，并尽量与上游保持一致；设计见 [ARCHITECTURE.md](https://github.com/Chaosnap/Typewriter-Nocturne/blob/main/docs/ARCHITECTURE.md)，合并上游的方法见 [UPSTREAM.md](https://github.com/Chaosnap/Typewriter-Nocturne/blob/main/UPSTREAM.md)。
