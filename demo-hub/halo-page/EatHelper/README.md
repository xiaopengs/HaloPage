# EatHelper

一个纯静态的「今天吃什么」小页面，适合部署到微信公众号、微信群、QQ、Halo 静态页等场景分享。

## 功能

- 按菜系随机推荐菜品
- 支持收藏，数据保存在浏览器 localStorage
- 支持浏览器定位
- 使用免费 OpenStreetMap / Overpass API 查询附近餐馆
- 支持分享/复制链接
- 移动端优先，适合微信内打开

## 免费 API

周边美食查询使用：

- Browser Geolocation API
- OpenStreetMap Overpass API

不需要后端，不需要 API Key。

## 部署

将 `index.html` 放到静态目录，例如：

```bash
/static/eat/index.html
```

然后访问：

```text
https://your-domain/static/eat/
```
