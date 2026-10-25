# 安装

Typewriter Nocturne 支持 macOS（Apple 芯片和 Intel）、Windows x64 和 Linux x64。所有安装包都由 GitHub
Actions 构建，和 `SHA256SUMS.txt` 一起发布在 [Releases](https://github.com/Chaosnap/Typewriter-Nocturne/releases) 页面。

| 系统 | 文件 |
| --- | --- |
| macOS（Apple 芯片） | `Typewriter-Nocturne-<版本>-mac-arm64.dmg` |
| macOS（Intel） | `Typewriter-Nocturne-<版本>-mac-x64.dmg` |
| Windows x64 | `Typewriter-Nocturne-<版本>-win-x64-setup.exe` |
| Linux x64 | `…-linux-x86_64.AppImage` 或 `…-linux-amd64.deb` |

打开前先校验下载的文件：

```bash
shasum -a 256 Typewriter-Nocturne-*.dmg
```

## 目前还没有代码签名

代码签名需要付费证书，项目暂时还没有，所以系统会询问一次：

- **macOS**：首次打开后，到「系统设置 → 隐私与安全性」点「仍要打开」。
- **Windows**：SmartScreen 会提示「Windows 已保护你的电脑」。校验过 SHA-256 后选「更多信息 → 仍要运行」。
- **Linux**：用 `chmod +x` 给 AppImage 加执行权限，或用 `sudo apt install ./Typewriter-Nocturne-*.deb` 安装 DEB。

## 第一步

1. 终端会在一张棉纸上打开你平常用的 Shell，照常输入即可。
2. 拉一下左上角的绳子，开关台灯。
3. 点右上角的滑块图标打开 **Nocturne Studio**，选择主题、纸张、字体、灯光和声音。
4. 选中一段输出，点羽毛笔打开**印刷机**，把它印成一页盖了火漆印的诗笺。

设置保存在独立的目录里，不会动到已有的 Hyper 安装，详见[设置文件](./settings)。
