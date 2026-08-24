# 阿里云 OSS 日报发布

这个目录负责把已经通过质量门的公开内容同步到阿里云 OSS。它只上传以下公开文件：

- `latest.json`
- `manifest.json`
- `issues/`
- `editions/`
- `personalization/latest.json`

不会上传 `pending/`、`audit/`、候选池评分、账号资料或 Supabase 密钥。

## 准备工作

1. 在阿里云 OSS 创建一个用于公开日报文件的 Bucket。
2. 给 Bucket 配置一个稳定的 HTTPS 访问地址。测试阶段可以先使用 OSS 公共域名，正式使用建议绑定自己的域名并配 HTTPS。
3. 在构建机安装 `ossutil`，并使用阿里云 RAM 子账号配置访问凭证。只给这个子账号目标 Bucket 的写权限，不要使用主账号密钥。
4. 设置环境变量 `OSS_DESTINATION`，格式如下：

   `oss://shixiaobao-content-cn-20260824/public`

5. 运行 `publish-oss.sh`。

## 自动发布（GitHub Actions）

仓库内的 `Publish Mobile Content To OSS` 工作流会在日报通过质量检查并写入
`main` 后，把公开日报同步到 OSS。首次启用时，在 GitHub 仓库的
`Settings -> Secrets and variables -> Actions` 中添加以下配置：

Secrets（仅保存 RAM 子账号的密钥，绝不写入代码）：

- `ALIYUN_OSS_ACCESS_KEY_ID`
- `ALIYUN_OSS_ACCESS_KEY_SECRET`

Variables（不是秘密，可以直接填写）：

- `ALIYUN_OSS_ENDPOINT`: `oss-cn-hangzhou.aliyuncs.com`
- `ALIYUN_OSS_DESTINATION`: `oss://shixiaobao-content-cn-20260824/public`
- `ALIYUN_OSS_PUBLIC_BASE_URL`: `https://shixiaobao-content-cn-20260824.oss-cn-hangzhou.aliyuncs.com/public`

这个 RAM 子账号只应拥有上述 Bucket 的 `public/*` 写入权限。工作流会在
上传后访问 `latest.json`、`manifest.json` 和 `personalization/latest.json`；任一
文件无法公开读取时，任务会报错，便于及时发现手机端可能读到旧日报的问题。

## App 中的地址配置

把 OSS 上 `latest.json` 的 HTTPS 地址填入：

`EXPO_PUBLIC_DAILY_ISSUE_URL`

把 OSS 上 `personalization/latest.json` 的 HTTPS 地址填入：

`EXPO_PUBLIC_PERSONALIZATION_POOL_URL`

把 GitHub Pages 的两个地址填入对应的 `*_FALLBACK_URL`，作为临时备用。App 会逐个尝试地址，并对所有请求加时间戳避免旧缓存。

## 更新策略

日报生成、质量检查和版本历史仍以 Git 仓库为准。OSS 只是面向手机的文件货架；上传失败时不应删除上一次可用文件。上传成功后，用手机浏览器分别打开 `latest.json`、`manifest.json` 和 `personalization/latest.json` 检查 HTTP 200。
