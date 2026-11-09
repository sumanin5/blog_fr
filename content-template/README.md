# 本地内容目录

这是新克隆项目时可用的最小模板，不包含原网站文章，也不绑定任何 GitHub 仓库。

在 `articles/示例专栏/` 中创建中文文章文件，或在 `ideas/<分类>/` 中创建 `index.md` 和文章。每个分类的 index.md、每篇文章都要填写稳定且唯一的 slug。

文章示例（author 改为本地网站已有用户名）：

```markdown
---
title: 我的文章
slug: my-first-local-article
author: your-local-username
status: draft
---

正文。
```

`cover: assets/封面.png` 可指定文章封面，图片放在文章相邻的 assets/ 中。设置 `GIT_PULL_BEFORE_SYNC=false` 后，导入只读取本地文件，不要求 Git 初始化、提交或远程连接。

本地运行和目录配置见项目的 `docs/LOCAL_CONTENT.md`。
