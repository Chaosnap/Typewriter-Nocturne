# 印刷机与档案

印刷机会把一段代码或终端输出印成一页**诗笺**：像诗页一样排在条纹纸上，按十四行诗版本的习惯每四行在页边标一个行号，写上标题、日期和落款，最后盖上红色火漆印。

![印成诗笺并盖上火漆印的代码片段](/images/press.jpg)

## 打印

1. 点右上角的羽毛笔、从 View 菜单，或按 <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>P</kbd>（macOS）/ <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>P</kbd>（Windows 和 Linux）打开印刷机。
2. 选择要印的内容：
   - **Selection（选中内容）**：终端里选中的文字（如果有选中内容会自动选这一项）；
   - **Screen（屏幕）**：终端当前屏幕上显示的各行；
   - **Snippet（片段）**：任何你粘贴或输入到框里的内容。
3. 起个标题，点 **Print and seal**。诗笺会伴着打字机的声音一行一行打出来，最后火漆印落下。

<div class="folio">
<p class="caps">Sonnet XVIII</p>

```js
// Shall I compare thee to a summer's day?
function leaves(tree, depth = 0) {
  if (!tree.children.length) {
    return [tree.name];                                   // 4
  }
  return tree.children.flatMap((child) => leaves(child, depth + 1));
}
```

</div>

文字以纯文本保存：控制字符和颜色会被去掉，制表符换成空格，过长的行会带悬挂缩进折行，空行成为诗节之间的分隔。

## 档案

开启 **Keep in the Archive（存入档案）** 时（默认开启），每张印好的诗笺都会被保存并编号：Sonnet I、II、III…… 印刷机的 **Archive** 标签页（<kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>O</kbd> / <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>O</kbd>）按时间从新到旧列出它们。每一张都可以：

- 打开重新查看；
- **Save as image…**：把这一页导出为 PNG，保存到你选择的位置；
- **Copy text**：把原始文字复制到剪贴板；
- 删除（点 × 再确认一次）。

**Open the archive folder** 会打开诗笺的存放位置：配置目录里名为 `archive` 的文件夹，每张诗笺是一个小 JSON 文件，只保存在你的电脑上，不会上传。如果印的内容不想保留，可以在印刷机里或 Studio 的 *Press & Archive* 中关闭「Keep in the Archive」；之后印的诗笺只会显示，仍然可以导出为图片。
