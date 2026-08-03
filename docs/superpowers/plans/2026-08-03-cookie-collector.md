# 曲奇收集器 (Cookie Collector) 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一个 Edge(MV3)扩展:用户点击网站"接受 Cookie"按钮时掉落曲奇动画、计数累计,弹窗可查看/吃掉/清空。

**Architecture:** 纯原生 JS 无依赖。content script 通过捕获阶段 click 委托 + 关键词匹配识别接受按钮,MutationObserver 不需要(委托天然覆盖动态 DOM);计数写入 `chrome.storage.local`;popup 读取并操作该存储。

**Tech Stack:** Manifest V3、原生 JS/CSS/HTML、PowerShell + System.Drawing(一次性生成图标)、Edge 浏览器手动测试。

## Global Constraints

- 目录 `D:\Code\cookie click` 不是 git 仓库:**跳过所有 git commit 步骤**(除非用户另行要求)。
- 无构建工具、无第三方依赖、无自动测试框架;测试为 Edge 手动验证。
- 权限仅 `storage`,content_scripts 匹配 `<all_urls>`,`run_at: document_idle`。
- 代码一律不写注释。
- 按钮文字关键词(中英):接受/同意/允许/我知道了/确认/好的;accept/agree/got it/allow/understand/fine/sure/ok。否定词(不/拒绝/reject/decline 等)命中则跳过。
- 食物关键词:曲奇/曲奇饼/饼干/小甜饼/cookie/biscuit(英文不区分大小写);祖先匹配深度 ≤3 层、文本 ≤100 字符。
- 动画节流 500ms;曲奇 SVG 掉落动画 1.2s。
- 存储结构:`{ total: number, eaten: number }`,字段名不得更改。

---

### Task 1: 扩展骨架 — manifest、图标、测试页

**Files:**
- Create: `manifest.json`
- Create: `tools/make-icons.ps1`
- Create: `icons/icon16.png`、`icon32.png`、`icon48.png`、`icon128.png`(由脚本生成)
- Create: `test/test-page.html`

**Interfaces:**
- Produces: `icons/icon*.png` 四个路径,Task 1 后续与 Task 2/3 均依赖 manifest 加载正常;`test/test-page.html` 供 Task 2 手动验证。

- [ ] **Step 1: 写 `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "曲奇收集器 Cookie Collector",
  "version": "1.0.0",
  "description": "每次接受网站 Cookie 时,掉落一块曲奇,收集起来吃掉它!",
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 2: 写 `tools/make-icons.ps1`(曲奇 PNG 生成脚本)**

```powershell
Add-Type -AssemblyName System.Drawing

function New-CookieIcon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $cookie = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(216, 155, 95))
  $edge   = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(169, 110, 47), [Math]::Max(1, [int]($size * 0.05)))
  $chip   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(92, 58, 30))
  $cx = $size * 0.5; $cy = $size * 0.5; $r = $size * 0.42
  $g.FillEllipse($cookie, $cx - $r, $cy - $r, 2 * $r, 2 * $r)
  $g.DrawEllipse($edge, $cx - $r, $cy - $r, 2 * $r, 2 * $r)
  $chips = @(@(0.38, 0.38, 0.10), @(0.62, 0.33, 0.09), @(0.52, 0.55, 0.11), @(0.35, 0.62, 0.09), @(0.65, 0.63, 0.10))
  foreach ($c in $chips) {
    $cr = $size * $c[2]
    $g.FillEllipse($chip, $size * $c[0] - $cr, $size * $c[1] - $cr, 2 * $cr, 2 * $cr)
  }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $cookie.Dispose(); $edge.Dispose(); $chip.Dispose(); $bmp.Dispose()
}

New-CookieIcon 16  "icons\icon16.png"
New-CookieIcon 32  "icons\icon32.png"
New-CookieIcon 48  "icons\icon48.png"
New-CookieIcon 128 "icons\icon128.png"
Write-Output "icons generated"
```

- [ ] **Step 3: 运行图标脚本并验证 4 个 PNG 生成**

Run(在项目根目录):`powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1`
Expected: 输出 `icons generated`;`Test-Path icons\icon16.png, icons\icon32.png, icons\icon48.png, icons\icon128.png` 全部为 True。

- [ ] **Step 4: 写测试页 `test/test-page.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Cookie Collector 测试页</title>
  <style>
    body { font-family: sans-serif; padding: 40px; }
    .banner { position: fixed; bottom: 0; left: 0; right: 0; background: #333; color: #fff;
              padding: 16px 24px; display: flex; gap: 12px; align-items: center; z-index: 10; }
    button { padding: 8px 16px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>曲奇收集器测试页</h1>
  <p>中文弹窗:点"接受全部 Cookie"应掉落曲奇;点"拒绝"不应掉落。</p>

  <div class="banner" id="zh-banner">
    <span>本网站使用 Cookie 为您提供更好的浏览体验。</span>
    <button id="zh-accept">接受全部 Cookie</button>
    <button id="zh-reject">拒绝</button>
  </div>

  <div class="banner" id="en-banner" style="bottom: 90px; display: none;">
    <span>We use cookies to improve your experience.</span>
    <button id="en-accept">Accept all</button>
    <button id="en-decline">Decline</button>
  </div>

  <button id="dynamic">动态弹窗按钮(点击后出现英文横幅)</button>
  <button id="good">好的</button>

  <script>
    document.getElementById('en-accept').addEventListener('click', function () {
      document.getElementById('en-banner').style.display = 'none';
    });
    document.getElementById('zh-accept').addEventListener('click', function () {
      document.getElementById('zh-banner').style.display = 'none';
    });
    document.getElementById('dynamic').addEventListener('click', function () {
      var b = document.getElementById('en-banner');
      b.style.display = 'flex';
      b.style.bottom = '150px';
    });
  </script>
</body>
</html>
```

- [ ] **Step 5: 在 Edge 中加载未打包扩展并验证无报错**

Run: `msedge --load-extension="D:\Code\cookie click"`
Manual: 打开 `edge://extensions` 确认扩展已启用且显示曲奇图标,无"加载错误";打开扩展的 service worker 日志无报错(MV3 无 SW 时忽略此步)。

---

### Task 2: content.js — 按钮识别 + 曲奇动画 + 计数

**Files:**
- Create: `content.js`

**Interfaces:**
- Consumes: Task 1 的 `test/test-page.html`、`manifest.json`(已声明注入 content.js)。
- Produces: 写入 `chrome.storage.local` 键 `total`(数字);点击匹配按钮时在页面显示掉落动画。Task 3 的 popup 读取 `total`/`eaten` 键。

- [ ] **Step 1: 写 `content.js`(完整实现)**

```js
(() => {
  'use strict';

  const ZH_KEYWORDS = ['接受', '同意', '允许', '我知道了', '确认', '好的'];
  const EN_KEYWORDS = ['accept', 'agree', 'got it', 'allow', 'understand', 'fine', 'sure', 'ok'];
  const NEGATIONS = ['不接受', '不同意', '拒绝', '不', 'reject', 'decline', 'deny', 'never', 'ignore', 'dismiss', 'no thanks'];
  const BANNER_HINTS = ['cookie', 'consent', 'gdpr', 'modal', 'banner', 'dialog', 'notice', 'privacy', 'ccpa', 'cookie-banner', 'cookie-consent'];

  const COOKIE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="72" height="72">' +
    '<circle cx="32" cy="32" r="26" fill="#D89B5F" stroke="#A96E2F" stroke-width="3"/>' +
    '<circle cx="24" cy="24" r="3.2" fill="#5C3A1E"/>' +
    '<circle cx="40" cy="20" r="3" fill="#5C3A1E"/>' +
    '<circle cx="34" cy="34" r="3.4" fill="#5C3A1E"/>' +
    '<circle cx="23" cy="38" r="2.8" fill="#5C3A1E"/>' +
    '<circle cx="42" cy="42" r="3" fill="#5C3A1E"/></svg>';

  let lastDrop = 0;

  function visibleText(el) {
    if (el.tagName === 'INPUT') {
      return ((el.value || '') + ' ' + (el.getAttribute('aria-label') || '')).trim();
    }
    return (el.textContent || '').trim();
  }

  function isNegated(text) {
    return NEGATIONS.some(function (n) { return text.includes(n); });
  }

  function matchesEn(text) {
    return EN_KEYWORDS.some(function (k) {
      var esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(^|\\s)' + esc + '($|\\s)').test(text);
    });
  }

  function matchesZh(text) {
    return ZH_KEYWORDS.some(function (k) { return text.includes(k); });
  }

  function isInBanner(el) {
    var node = el;
    while (node && node !== document.documentElement) {
      if (node.nodeType === 1) {
        var hint = (String(node.className || '') + ' ' + String(node.id || '')).toLowerCase();
        if (BANNER_HINTS.some(function (h) { return hint.includes(h); })) return true;
        if (window.getComputedStyle(node).position === 'fixed') {
          var r = node.getBoundingClientRect();
          if (r.width < window.innerWidth * 0.9 && r.height < window.innerHeight * 0.9) return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  function matchesAcceptButton(el) {
    if (!el || !el.closest) return false;
    var target = el.closest('button, a, input[type="button"], input[type="submit"], [role="button"]');
    if (!target || !target.isConnected) return false;
    var text = visibleText(target).toLowerCase();
    if (!text || text.length > 60) return false;
    if (isNegated(text)) return false;
    var zh = matchesZh(text);
    var en = matchesEn(text);
    if (!zh && !en) return false;
    if (isInBanner(target)) return true;
    return text.length <= 12;
  }

  function dropCookie() {
    var now = Date.now();
    if (now - lastDrop < 500) return;
    lastDrop = now;
    try {
      var holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:2147483647;';
      var style = document.createElement('style');
      style.textContent = '@keyframes cc-fall{0%{transform:translateY(0) rotate(0deg);opacity:1}75%{opacity:1}100%{transform:translateY(calc(100vh - 60px)) rotate(400deg);opacity:0}}';
      var cookie = document.createElement('div');
      cookie.style.cssText = 'position:absolute;top:-90px;left:' + (5 + Math.random() * 80) + '%;animation:cc-fall 1.2s ease-in forwards;';
      cookie.innerHTML = COOKIE_SVG;
      holder.appendChild(style);
      holder.appendChild(cookie);
      document.documentElement.appendChild(holder);
      setTimeout(function () { holder.remove(); }, 1300);
    } catch (e) {}
  }

  function recordCookie() {
    try {
      chrome.storage.local.get({ total: 0 }, function (data) {
        chrome.storage.local.set({ total: (data.total || 0) + 1 }, function () {});
      });
    } catch (e) {}
  }

  document.addEventListener('click', function (event) {
    if (matchesAcceptButton(event.target)) {
      dropCookie();
      recordCookie();
    }
  }, true);
})();
```

- [ ] **Step 2: 刷新测试页并验证正向用例**

Manual: 先在 `edge://extensions` 该扩展卡片上开启"允许访问文件网址"(Allow access to file URLs)开关,再打开 `test/test-page.html`(或改用本地 http 服务器访问测试页);否则 `<all_urls>` 不会注入 `file://` 页面。然后点"接受全部 Cookie" → 应掉落一块曲奇动画;点"Accept all" → 再掉一块。点击"动态弹窗按钮"出现英文横幅后点 "Accept all" → 掉落(验证动态 DOM 由事件委托覆盖)。

- [ ] **Step 3: 验证负向用例**

Manual: 点"拒绝"、"Decline" → 不应掉落;点击页面任意非按钮文本 → 不应掉落。"好的"按钮(页面级短文本回退)掉落属预期内允许的少量误报。

---

### Task 3: popup — 计数展示、吃掉、清空

**Files:**
- Create: `popup/popup.html`、`popup/popup.js`、`popup/popup.css`

**Interfaces:**
- Consumes: Task 2 写入的 `chrome.storage.local` 键 `total`;自身维护 `eaten`。存储结构 `{ total: number, eaten: number }`。

- [ ] **Step 1: 写 `popup/popup.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <header>
    <span class="logo">🍪</span>
    <h1>曲奇收集器</h1>
  </header>
  <div class="stats">
    <div class="stat">
      <span class="num" id="total">0</span>
      <span class="label">收集的曲奇</span>
    </div>
    <div class="stat">
      <span class="num" id="eaten">0</span>
      <span class="label">已吃掉</span>
    </div>
  </div>
  <button id="eat" class="primary">吃掉一个曲奇</button>
  <button id="clear" class="secondary">全部清空</button>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: 写 `popup/popup.js`**

```js
'use strict';

var totalEl = document.getElementById('total');
var eatenEl = document.getElementById('eaten');

function render(data) {
  totalEl.textContent = data.total || 0;
  eatenEl.textContent = data.eaten || 0;
}

function load() {
  chrome.storage.local.get({ total: 0, eaten: 0 }, render);
}

document.getElementById('eat').addEventListener('click', function () {
  chrome.storage.local.get({ total: 0, eaten: 0 }, function (d) {
    var total = d.total || 0;
    if (total <= 0) return;
    chrome.storage.local.set({ total: total - 1, eaten: (d.eaten || 0) + 1 }, load);
  });
});

document.getElementById('clear').addEventListener('click', function () {
  chrome.storage.local.set({ total: 0, eaten: 0 }, load);
});

chrome.storage.onChanged.addListener(load);
load();
```

- [ ] **Step 3: 写 `popup/popup.css`**

```css
body {
  width: 280px;
  margin: 0;
  padding: 16px;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  background: #fff8ef;
  color: #4a2c12;
  box-sizing: border-box;
}
header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.logo { font-size: 28px; }
h1 { font-size: 17px; margin: 0; }
.stats {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}
.stat {
  flex: 1;
  background: #fff;
  border: 1px solid #e8d5b8;
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}
.num { display: block; font-size: 26px; font-weight: bold; }
.label { font-size: 12px; color: #8a6a4a; }
button {
  width: 100%;
  padding: 9px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 8px;
}
.primary { background: #d89b5f; color: #fff; }
.primary:hover { background: #c98a4c; }
.primary:active { transform: translateY(1px); }
.secondary { background: #f0e2cd; color: #8a6a4a; }
.secondary:hover { background: #e6d3b6; }
```

- [ ] **Step 4: 验证计数与持久化**

Manual:
1. 先在 `edge://extensions` 该扩展卡片上开启"允许访问文件网址"(Allow access to file URLs)开关,再打开 `test/test-page.html`(或改用本地 http 服务器访问测试页);否则 `<all_urls>` 不会注入 `file://` 页面。刷新测试页,点"接受全部 Cookie"两次 → 打开 popup,总数应为 2,已吃掉为 0。
2. 点"吃掉一个曲奇"两次 → 总数 0、已吃掉 2;再点无变化(总数不为负)。
3. 刷新测试页再打开 popup → 数字保持不变(持久化)。
4. 点"全部清空" → 均为 0。
5. 打开另一个标签页的任意网站,点其 Cookie 横幅的接受按钮 → popup 同步 +1(`onChanged` 生效)。

---

### Task 4: 食物关键词点击 — 含"曲奇/cookie/饼干"的文字可点击得曲奇

**Files:**
- Modify: `content.js`(新增 FOOD_KEYWORDS 常量与 matchesFoodWord 函数,修改 click 处理器)
- Modify: `test/test-page.html`(新增测试元素)

**Interfaces:**
- Consumes: Task 2 的 `dropCookie()`/`recordCookie()` 与 500ms 节流(`lastDrop`),与 `matchesAcceptButton` 共用一个节流窗口。
- Produces: 无新存储键,复用 `total`。

- [ ] **Step 1: 修改 `content.js` — 常量与匹配函数**

在 `EN_NEGATIONS` 常量行后新增一行:

```js
  const FOOD_KEYWORDS = ['曲奇饼', '曲奇', '饼干', '小甜饼', 'cookie', 'biscuit'];
```

在 `matchesAcceptButton` 函数后新增 `matchesFoodWord` 函数(保持既有 var/function 风格):

```js
  function matchesFoodWord(el) {
    if (!el || el.nodeType !== 1) return false;
    var node = el;
    for (var depth = 0; node && node.nodeType === 1 && depth < 4; depth++) {
      var text = (node.textContent || '').trim().toLowerCase();
      if (text.length > 0 && text.length <= 100) {
        for (var i = 0; i < FOOD_KEYWORDS.length; i++) {
          if (text.includes(FOOD_KEYWORDS[i])) return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }
```

- [ ] **Step 2: 修改 `content.js` — click 处理器(节流提前,先按钮后食物词)**

将现有 click 监听器整体替换为:

```js
  document.addEventListener('click', function (event) {
    var now = Date.now();
    if (now - lastDrop < 500) return;
    if (!matchesAcceptButton(event.target) && !matchesFoodWord(event.target)) return;
    lastDrop = now;
    dropCookie();
    recordCookie();
  }, true);
```

- [ ] **Step 3: 修改 `test/test-page.html` — 新增测试元素**

在 `<button id="good">好的</button>` 后新增:

```html
  <button id="biscuit">小甜饼</button>
  <a href="#cookie-anchor" id="cookie-link">点击这条 cookie 链接</a>
  <span id="biscuit-en">biscuits are nice</span>
  <p id="long-paragraph">本段落包含"曲奇"二字,但文本总长超过 100 字符,点击它不应掉落曲奇。xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</p>
```

- [ ] **Step 4: 自动化验证**

Run: `node --check content.js` — 必须通过。
Harness(Node 临时脚本,放 `.superpowers/sdd/2026-08-03-cookie-collector/`,用完删除):加载真实 content.js(stub document/window/chrome,捕获 click 监听器),断言:
- 点击文本含"饼干"的按钮 → 触发(动画 + 计数)
- 点击 "小甜饼" span → 触发
- 点击含 "cookie" 的链接 → 触发(不阻止默认导航,无需断言导航本身)
- 点击 `#long-paragraph`(长文本 >100 字符含"曲奇")→ 不触发
- 回归:点"接受全部 Cookie" → 触发;点"拒绝"/"Decline" → 不触发
- 节流:两次食物点击间隔 100ms → 仅 1 次计数;间隔 600ms → 2 次计数

- [ ] **Step 5: 手动验证(用户执行)**

Manual(需先开启"允许访问文件网址"或走 http 服务器):
1. 打开 `test/test-page.html`:点"小甜饼"按钮 → 掉落曲奇;点 "cookie 链接" → 掉落且页面正常滚动到锚点;点 `#long-paragraph` → 不掉落。
2. 在真实网站正文里点击含"饼干/曲奇/cookie"的短文字(如商品名、文章标题)→ 掉落;点击长段落中的该词 → 不掉落(已知限制)。
3. 打开 popup 确认计数同步 +1。

---

## 自检结果

- **Spec 覆盖:** 按钮关键词识别(中英)→ Task 2;动画 → Task 2;计数存储 → Task 2;popup 吃掉/清空 → Task 3;图标 → Task 1;错误处理(动画 try/catch、storage 降级为忽略)→ Task 2;食物关键词点击 → Task 4;测试清单 → Task 2/3/4。
- **无占位符:** 所有文件内容均完整给出,测试为具体手动步骤。
- **类型/命名一致:** 存储键 `total`、`eaten` 在 Task 2/3 及 manifest 中拼写一致;图标路径 `icons/icon*.png` 一致;`FOOD_KEYWORDS`/`matchesFoodWord` 在 Task 4 内一致。
