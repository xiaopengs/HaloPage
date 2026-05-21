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
