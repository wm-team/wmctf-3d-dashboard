# WMCTF 3D Dashboard

CTF 赛事可视化大屏，基于 React、Vite、TypeScript、Three.js 实现。

## 功能

- 1920x1080 固定设计舞台，按浏览器窗口等比缩放。
- 实时排名、轮次倒计时、核心指标、最新解题动态。
- 题目类别分布、解题趋势、战队活跃度热力图。
- 中央 Three.js 全息地形地图，包含等高线、扫描环、光柱和鼠标视角轻微偏移。
- 科幻 HUD 风格布局，面板围绕中央地图盘展开。

## 开发

```bash
pnpm install
pnpm dev
```

## 校验

```bash
pnpm lint
pnpm build
```

## 技术栈

- React 19
- TypeScript 6
- Vite 8
- Three.js / React Three Fiber / Drei
