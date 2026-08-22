# HaloPage

静态页面小项目集合，用于部署到 Halo / 1Panel / Nginx 的 `/static/xxx/` 路径下。

## Projects

### EatHelper

「今天吃什么」微信可分享小页面：

- 菜系随机推荐
- 收藏本地保存
- 浏览器定位
- 免费 OpenStreetMap / Overpass API 查询周边美食
- 纯静态，无后端，无 API Key

线上示例：

<https://thinkspc.fun/static/eat/>

部署方式：

```bash
mkdir -p /path/to/site/index/eat
cp EatHelper/index.html /path/to/site/index/eat/index.html
```

访问：

```text
https://your-domain/static/eat/
```

### Yunzhou

「云舟 · 个人作品集」鼠标/触摸驱动视频时间轴交互主页：

- 视频随鼠标/触摸位置 scrubbing（人物转身跟随）
- 晚霞暖色调玻璃拟态 UI，纯静态单页
- 随附《视频加载教程》：动态视频背景加载方案 · 小白图文教程

线上示例：

<https://thinkspc.fun/static/yunzhou/>

部署方式：

```bash
mkdir -p /path/to/site/index/yunzhou
cp -r Yunzhou/* /path/to/site/index/yunzhou/
```

访问：

```text
https://your-domain/static/yunzhou/
```

教程页面：

```text
https://your-domain/static/yunzhou/视频加载教程/
```
