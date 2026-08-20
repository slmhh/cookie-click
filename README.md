# 曲奇收集器 Cookie Collector

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![github: slmhh](https://img.shields.io/badge/github-repo-blue?logo=github)](https://github.com/slmhh/CodeReplay)

现已上架[Edge扩展商店](https://microsoftedge.microsoft.com/addons/detail/%E6%9B%B2%E5%A5%87%E6%94%B6%E9%9B%86%E5%99%A8-cookie-collector/gacmjdenigcnkkimdonfbjpdadobdfmi)。

一个 Microsoft Edge 扩展(Manifest V3):每次接受网站的 Cookie,就掉落一块曲奇;点击页面上含"曲奇 / cookie / 饼干"等字样的文字,也能收获曲奇。收集起来,在弹窗里吃掉它们!

## 功能

- **接受 Cookie 得曲奇**:点击网站的"接受/同意/Accept/Agree"按钮(中英文自动识别),一次掉下 15 块曲奇,计数 +15
- **点击食物词得曲奇**:点击页面任意位置含关键词的短文字(曲奇、曲奇饼、饼干、小甜饼、cookie、biscuit),掉落 1 块曲奇,计数 +1
- **统计与吃曲奇**:点击工具栏图标打开弹窗,查看"收集的曲奇 / 已吃掉",可"吃掉一个曲奇"或"全部清空"
- **持久化**:计数保存在浏览器本地(`chrome.storage.local`),刷新页面、重启浏览器不丢失

## 安装

1. 打开 `edge://extensions`
2. 开启左下角"开发人员模式"
3. 点击"加载解压缩的扩展",选择本项目目录 `cookie click`

## 权限说明

- 仅申请 `storage` 权限:用于在本地保存曲奇计数(`chrome.storage.local`,不联网、不上传)
- 内容脚本仅在 `http://` 和 `https://` 网页上运行,不访问本地文件或其他协议页面
- 扩展不收集任何个人数据

## 使用

1. 浏览任意网站,点击 Cookie 横幅的接受按钮 → 掉下 15 块曲奇,计数 +15
2. 点击页面上的"饼干 / 曲奇 / cookie"等短文字 → 掉落 1 块,计数 +1
3. 点工具栏曲奇图标 → 弹窗中查看 / 吃掉 / 清空

## 测试

用本地 http 服务器访问 `test/test-page.html`(脚本仅在 http/https 页面运行,直接双击打开 file:// 无效)。例如在项目根目录运行:

```
python -m http.server 8000
```

然后浏览器打开 `http://localhost:8000/test/test-page.html`。测试页包含:

- 中英文 Cookie 弹窗(接受 / 拒绝)
- 动态出现的英文弹窗
- 食物词按钮、链接、长段落(长文本不触发)

## 项目结构

```
cookie click/
├── manifest.json          # MV3 清单(仅 storage 权限)
├── content.js             # 按钮识别 + 食物词识别 + 掉落动画 + 计数
├── popup/
│   ├── popup.html         # 弹窗界面
│   ├── popup.js           # 吃掉 / 清空 / 同步计数
│   └── popup.css          # 弹窗样式
├── icons/                 # 16/32/48/128 曲奇图标
├── tools/make-icons.ps1   # 图标生成脚本(一次性,PowerShell)
├── test/test-page.html    # 手动测试页
└── docs/                  # 设计文档与实现计划
```

## 已知限制

- 长段落(>100 字符)中的关键词不触发
- 页面空白处、超大容器不触发
- 不处理 shadow DOM 内的按钮
- 连点有 500ms 节流,防止刷计数
