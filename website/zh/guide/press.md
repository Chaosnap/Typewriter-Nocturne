# 印刷机与档案

印刷机会把一段代码或终端输出印成一页**诗笺**：像诗页一样排版，按十四行诗版本的习惯每四行在页边标一个行号，写上标题、日期和落款，最后盖上火漆印。纸张、火漆、正文字体和署名都可以自己选。

![印成诗笺并盖上火漆印的代码片段](/images/press.jpg)

## 打印

1. 点右上角的羽毛笔、从 View 菜单，或按 <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>P</kbd>（macOS）/ <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>P</kbd>（Windows 和 Linux）打开印刷机。
2. 选择要印的内容：
   - **Selection（选中内容）**：终端里选中的文字（如果有选中内容会自动选这一项）；
   - **Screen（屏幕）**：终端当前屏幕上显示的各行；
   - **Command（上一条命令）**：你运行的上一条命令，连同它输出的全部内容；
   - **Snippet（片段）**：任何你粘贴或输入到框里的内容。

   只有 *Snippet* 有输入框。另外三种会显示将要印多少行、开头几行是什么，并在你点打印的那一刻重新读取终端。

   你在选择时，右侧会实时显示这页诗笺打印出来的样子，并标着 *Preview（预览）*：来源、标题、文字、纸张、火漆、丝带、字体的每次改动都会立即重绘。还没有可打印的内容时，会先用两行示例文字排版，纸张和火漆的变化照样看得到。
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

## 纸张、火漆与字体

印刷机里的 **Paper, seal and type** 一栏：

| 选项 | 可选 |
| --- | --- |
| Paper（纸张） | Laid（条纹纸，有帘纹和链纹）、Cotton（白色棉浆纸，带纤维）、Vellum（光滑温暖的犊皮纸）、Parchment（羊皮纸，有污渍，边缘更深）、Night（深色纸，浅色墨水配烫金标题） |
| Wax seal（火漆印） | 盖火漆，或者不盖火漆直接打印 |
| Wax（火漆颜色） | 深红、牛血红、黑、金、祖母绿、宝石蓝，各自配一条丝带 |
| Monogram（字母） | 压进火漆的一到两个字母 |
| Emblem（纹章） | 新月与星、纹章玫瑰、羽毛笔，或不要 |
| Silk ribbon（丝带） | 火漆下有没有丝带 |
| Ribbon（丝带样式） | 丝带在火漆下的系法，每种都画在一枚所选颜色的小火漆上：Swallowtails（两条燕尾）、Loop（上方一个环、下方两条尾）、Band（一条丝带竖穿火漆）、Cross（两条丝带交叉）、Banner（上方一条、下方两条尾）、Pendant（上方一条，下方垂成两条长尾） |
| Text face（正文字体） | Typewriter（Courier Prime）、Sonnet（EB Garamond，十四行诗那样的优雅正体）、Display（Cormorant Garamond）、IBM Plex Mono、终端当前字体，或任何已安装的字体 |
| Signed（署名） | “— set at the typewriter, by …” 中的名字；留空时是 *by lamplight* |

选项旁的小火漆就是将要盖下的样子。火漆按真实的蜡来画：边缘圆润有光泽的蜡池，冷却不均留下的斑驳，溢出的几滴蜡；凹陷的印面四周是隆起的蜡唇；绞绳纹边框，以及柔和压印的字母和纹章（带五角星的新月、纹章玫瑰、带羽枝的羽毛笔）；蜡面的颗粒与高光。火漆下的丝带是垂坠的缎带，按你选的方式系好：带光泽、细密的包边和燕尾剪口，有的尾巴会翻转过来露出背面。每张诗笺都会保存打印时的样式，从档案里再打开时看起来完全一样。

![上一条命令印在夜间纸上，盖着金色火漆](/images/press-night.jpg)

## 档案

开启 **Keep in the Archive（存入档案）** 时（默认开启），每张印好的诗笺都会被保存并编号：Sonnet I、II、III…… 印刷机的 **Archive** 标签页（<kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>O</kbd> / <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>O</kbd>）按时间从新到旧列出它们。每一张都可以：

- 打开重新查看；
- 点 ✎ **改名**（<kbd>Enter</kbd> 保存新标题，<kbd>Esc</kbd> 取消）；
- **Save as image…**：把这一页导出为 PNG，保存到你选择的位置；
- **Copy text**：把原始文字复制到剪贴板；
- 删除（点 × 再确认一次）。

要一次删除多张，点 **Select**，勾选它们（或点 **Select all**），再点 **Delete** 并确认。

![在档案里勾选多张诗笺一起删除](/images/archive-select.jpg)

**Open the archive folder** 会打开诗笺的存放位置：配置目录里名为 `archive` 的文件夹，每张诗笺是一个小 JSON 文件，只保存在你的电脑上，不会上传。如果印的内容不想保留，可以在印刷机里或 Studio 的 *Press & Archive* 中关闭「Keep in the Archive」；之后印的诗笺只会显示，仍然可以导出为图片。
