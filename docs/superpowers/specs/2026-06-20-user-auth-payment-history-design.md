# 哲学占卜 — 用户系统 · 付费 · 历史记录 设计文档

日期：2026-06-20

---

## 一、目标

在现有纯静态占卜网页基础上，以最小改动量加入：
- 手机号注册 / 登录（短信验证码）
- 占卜币付费体系（1 币 = 0.5 元，AI 解牌消耗 1 币）
- 虎皮椒聚合支付（支持微信支付 + 支付宝扫码）
- 个人主页（余额、充值、历史记录完整视觉还原）

---

## 二、架构

**方案 A：保留现有 HTML + Vercel Serverless Functions**

```
哲学占卜/
├── index.html            ← 主占卜页（现有，最小改动）
├── login.html            ← 注册 / 登录页（新增）
├── profile.html          ← 个人主页（新增）
└── api/
    ├── ask.js            ← DeepSeek 代理（已有）
    ├── auth/
    │   ├── send-code.js  ← 发送短信验证码
    │   └── verify.js     ← 验证码校验 + 签发 token
    ├── readings/
    │   ├── save.js       ← 保存一次解牌记录
    │   └── list.js       ← 拉取历史列表
    └── payment/
        ├── create.js     ← 创建虎皮椒订单
        └── notify.js     ← 虎皮椒支付回调（充值入账）
```

**基础设施**
- 前端托管：Vercel（已有）
- 数据库 + Auth：Supabase
- 短信：阿里云短信服务（个人实名认证即可）
- 支付：虎皮椒支付（支持微信 + 支付宝，个人注册）

---

## 三、数据库（Supabase）

### users
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | Supabase 自动生成 |
| phone | text UNIQUE | 手机号 |
| coin_balance | int | 占卜币余额，默认 0 |
| created_at | timestamptz | 注册时间 |

### readings
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| spread_type | text | '2'/'3'/'5'/'cross'/'h'/'9' |
| question | text | 用户输入的问题 |
| cards_json | jsonb | [{cardId, position, isReversed}, ...] |
| ai_reading | text | AI 解读全文 |
| created_at | timestamptz | |

### transactions
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| coins | int | 正数=充值，负数=消费 |
| type | text | 'topup' / 'spend' |
| order_id | text | 虎皮椒订单号（充值时记录） |
| created_at | timestamptz | |

---

## 四、页面设计

### login.html
- 风格与 index.html 完全一致（色系、字体、装饰元素）
- 单一表单，顶部切换「登录 / 注册」（同一套流程：输入手机号 → 发送验证码 → 输入验证码 → 完成）
- 登录/注册成功后将 JWT token 存入 `localStorage('zb_token')`，跳回来源页

### index.html 改动（最小化）
- 右上角加小按钮：已登录显示「我的」（跳 profile.html），未登录显示「登录」
- AI 解牌点击时拦截逻辑：
  1. 未登录 → 弹提示「请先登录」，跳 login.html
  2. 已登录余额 = 0 → 弹提示「占卜币不足，去充值」，跳 profile.html
  3. 已登录余额 ≥ 1 → 正常解牌，完成后扣 1 币，静默调用 `/api/readings/save.js`

### profile.html
**顶部**：手机号（脱敏） + 占卜币余额

**充值区**（三个套餐）：
| 套餐 | 价格 | 占卜币 |
|---|---|---|
| 入门 | 5 元 | 10 币 |
| 标准 | 18 元 | 40 币 |
| 豪华 | 30 元 | 70 币 |

点击套餐 → 调用 `/api/payment/create.js` → 跳转虎皮椒支付页 → 支付完成跳回，刷新余额。

**历史记录**：
- 列表：时间倒序，每条显示「日期 · 牌阵名 · 问题摘要（前 20 字）」
- 点开一条 → 展开完整解读：视觉还原当时牌面（与结果页完全相同的布局和样式）+ AI 解读全文

---

## 五、支付流程

```
用户选择套餐
  → POST /api/payment/create.js（套餐金额、用户 id）
  → 服务端生成虎皮椒订单，返回支付跳转 URL
  → 前端跳转虎皮椒支付页
  → 用户扫微信/支付宝二维码完成支付
  → 虎皮椒 POST /api/payment/notify.js
  → 服务端验证签名 → users.coin_balance += 购买币数
                    → transactions 写入充值记录
  → 用户返回 profile.html，余额已更新
```

---

## 六、认证流程

```
用户输入手机号
  → POST /api/auth/send-code.js
  → 服务端调用阿里云短信，发送 6 位验证码（5 分钟有效）
  → 验证码暂存 Supabase（phone + code + expires_at）

用户输入验证码
  → POST /api/auth/verify.js
  → 服务端校验验证码 → 通过则 upsert users 表
  → 签发 JWT（内含 user_id），返回给前端
  → 前端存入 localStorage('zb_token')
```

---

## 七、未登录用户体验

- 可以正常进入网站、选牌阵、抽牌、翻牌、查看牌面详情
- 点击「AI 解牌」时弹出登录引导，不影响抽牌体验
- 历史记录仅登录用户可见

---

## 八、环境变量（Vercel）

| 变量名 | 说明 |
|---|---|
| DEEPSEEK_API_KEY | DeepSeek API Key（已配置）|
| SUPABASE_URL | Supabase 项目 URL |
| SUPABASE_SERVICE_KEY | Supabase service_role key |
| JWT_SECRET | 签发/验证 token 用的密钥 |
| ALIYUN_SMS_ACCESS_KEY | 阿里云短信 AccessKey |
| ALIYUN_SMS_SECRET | 阿里云短信 Secret |
| ALIYUN_SMS_SIGN | 短信签名 |
| ALIYUN_SMS_TEMPLATE | 验证码模板 ID |
| HUPIJIAO_APP_ID | 虎皮椒 AppID |
| HUPIJIAO_APP_SECRET | 虎皮椒 AppSecret |
| PAYMENT_NOTIFY_URL | 虎皮椒回调地址（你的 Vercel 域名 + /api/payment/notify）|
