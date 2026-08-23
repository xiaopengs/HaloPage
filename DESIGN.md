---
name: 赛点青赛事编辑部设计系统
description: 面向六人匹克球循环赛的赛事编辑部与现场记分板视觉语言。
colors:
  paper: "#f4f1e8"
  paper-deep: "#e8e3d6"
  ink: "#171716"
  muted: "#6a685f"
  court: "#c7ff3e"
  brick: "#e64b32"
  white: "#fffdf6"
typography:
  display:
    fontFamily: "Barlow Condensed, Noto Sans SC, sans-serif"
    fontSize: "clamp(50px, 9vw, 126px)"
    fontWeight: 800
    lineHeight: 0.82
    letterSpacing: "-0.045em"
  body:
    fontFamily: "Noto Sans SC, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  surface: "14px"
  control: "2px"
spacing:
  compact: "10px"
  base: "18px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.court}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "46px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "46px"
---

# Design System: 赛点青赛事编辑部

## Overview

**Creative North Star: “场边赛事日报”**

这套系统把循环赛理解为持续更新的赛事报道，而不是深色后台或玻璃化营销页。它以暖灰纸张承受密集阅读，以压缩粗标题捕捉比赛张力，再用一处高亮的场地绿把当前动作、进行状态和关键数字集中在眼前。界面为组织者服务，信息应像裁判记录一样可以扫读、复核和立即操作。

**Key Characteristics:** 大字号比分叙事、细线成绩单结构、像素阵容辅助识别、移动端底部记分路径。

## Colors

色彩被当作状态与阅读节奏，而不是装饰层。纸张与墨黑形成稳定对比，场地绿只承担行动和进行中状态，砖红只说明错误或比分分隔。

### Primary

- **场地绿**：用于主操作、当前选中状态、关键进度与高优先数字。它在任一屏幕上保持稀少，以便真正的下一步始终显眼。

### Secondary

- **比分砖红**：用于无效比分、局内分隔及需要立刻注意的修正信息。

### Neutral

- **赛事纸张**：全局阅读底板，并以细横线形成成绩册般的节奏。
- **裁判墨黑**：标题、边线、表格秩序和主文本使用的唯一深色。
- **记录灰**：说明性文字、次级标签与非当前状态。

**The One Signal Rule.** 场地绿只表达“现在要做什么”或“正在发生什么”，不能作为大面积背景填充。

## Typography

**Display Font:** Barlow Condensed，搭配 Noto Sans SC 后备字体。
**Body Font:** Noto Sans SC。

字体系统将比赛的瞬时张力交给压缩粗标题，将规则、说明和姓名交给清晰的中文无衬线正文。数字保持紧凑、粗重并带可扫描的差异。

### Hierarchy

- **Display**：800，响应式 50–126px，行高 0.82；只用于首屏和关键状态。
- **Headline**：700，28–37px；用于页面主标题、轮次和模块标题。
- **Title**：700，14–24px；用于对局、选手和榜单行。
- **Body**：400，13–16px，行高 1.75；用于规则与操作解释。
- **Label**：700，10–12px；用于局数、进度与录分标签。

**The Scoreboard Rule.** 每个页面只允许一个主视觉标题；其他层级承担操作和数据，不竞争注意力。

## Layout

桌面端以 1320px 内容宽度组织不对称首屏、下一场记分票和成绩单式分区；细横线是主要的空间组织器。移动端在 700px 以下转换为单列，将首页的下一场与录分入口放在最早可见区域，并以固定底部导航承接常用任务。多列信息不靠缩放，而是主动折叠次要数据：移动榜单只保留名次、选手、积分和净胜分。

## Elevation & Depth

系统默认平面化。层级通过纸张色差、细线、投票式高亮和明确的间距建立；只有“下一场”记分票使用场地绿投影，目的是表现其为当前最需要处理的实体，而不是制造普遍浮层。

**The One Ticket Rule.** 只有当前下一场可以使用实体投影；其余面板必须通过线条与留白建立分组。

## Shapes

线条比圆角更重要。主要信息区使用直角或 2px 控件边角，头像为方形像素切片；仅状态点和“VS”标记可使用圆形。需要承载独立对局或输入的界面可使用轻微圆角（14px），但不得形成通用圆角卡片阵列。

## Components

### Buttons

- **Shape:** 低圆角（2px）与最低 46px 高度。
- **Primary:** 场地绿填充、墨黑文字、7px 实体底影；按下时下移并轻微缩放。
- **Secondary:** 透明纸张底、墨黑 1px 描边。
- **Focus:** 3px 场地绿轮廓，偏移 3px。

### Inputs / Fields

- **Style:** 纸张色底、墨黑 1px 描边、大号压缩数字。
- **Focus:** 变为场地绿底，以记录“正在输入”。
- **Error:** 砖红描边与淡红底，同时保留清晰的修正文本。

### Navigation

桌面端采用紧凑居中的文本导航；移动端改为四项固定底部导航，选中项使用场地绿实体背景。导航标签必须有文字，符号只作为辅助。

### 下一场记分票

这是系统的签名组件：以比赛票据格式展示轮次、双方选手、赛制和开始录分操作。它始终对应首个未完成对局，并在保存后将焦点交给下一场。

### 统一像素头像

六位选手来自一张 3×2 统一头像图。CSS 以背景定位呈现六个等比例裁切，姓名、性别和战绩始终与头像并列，避免视觉识别成为唯一信息来源。

## Do's and Don'ts

### Do:

- **Do** 让当前对局、完成进度和榜首在首页第一视域内同时可见。
- **Do** 使用规则、输入校验和统计函数的一致文案解释比分与排名。
- **Do** 在移动端保留所有核心任务，并把保存动作安排在拇指可达位置。
- **Do** 保持线条、间距与大数字的赛场记录感。

### Don't:

- **Don't** 回退到暗青玻璃、霓虹发光或泛化仪表盘视觉；该方向已被本次替换式重构明确弃用。
- **Don't** 让场地绿成为无意义的大面积装饰，或把砖红用于普通强调。
- **Don't** 在手机上以横向溢出的桌面表格隐藏排名、赛程或录分的核心信息。
- **Don't** 以头像替代姓名、性别、战绩或错误提示。
