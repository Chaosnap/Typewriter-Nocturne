# 快捷键

| 操作 | macOS | Windows 与 Linux |
| --- | --- | --- |
| 专注模式 | <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>Enter</kbd> | <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>Enter</kbd> |
| 开关台灯 | <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>L</kbd> | <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>L</kbd> |
| Nocturne Studio | <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>,</kbd> | <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>,</kbd> |
| 开关打字机音效 | <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>M</kbd> | <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>M</kbd> |
| 印刷机 | <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>P</kbd> | <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>P</kbd> |
| 档案 | <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>O</kbd> | <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>O</kbd> |

这些操作也都在 **View** 菜单里。其他快捷键沿用 Hyper（新建标签页、分屏、搜索、缩放等）。任何快捷键都可以在 `hyper.json` 的 `keymaps` 中修改，例如：

```json
{
  "keymaps": {
    "nocturne:print": "ctrl+alt+p"
  }
}
```
