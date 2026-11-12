---
name: yt-shorts-2026
description: 2026 YouTube Shorts 算法与变现合规工程包。内置 Engaged Views 新规精算、2025.07 Inauthentic Content 过审排雷、1-3 分钟音乐全球禁播检测、三绿对标选赛道与 VVSA 70% 双轨脚本生成。当用户规划 YouTube Shorts 出海、测算 YPP 门槛与 RPM 收益、检查频道拒审风险、拆解对标账号或改写高留存短视频脚本时使用。
---

# YouTube Shorts 2026 Playbook & Compliance Auditor

本 Skill 将 2025-2026 年 YouTube 官方推荐机制、YPP 合作伙伴审核新政与高单价出海实战经验沉淀为四条确定性工作流。执行前必须以 2026 最新口径为准，主动纠偏市面上流传的 2023-2024 过时攻略（如单看前台播放量冲 YPP、批量 AI 静态图轮播故事、1-3 分钟滥用商业音乐、用 Google+ 建品牌号等）。

## 目录导航与按需读取规则

根据用户当前任务，优先按需读取对应的 `references/` 深度手册，不要凭旧记忆拍脑袋：

1. **推荐算法、播放量统计拆分与多语种放大**：读取 `references/01-algorithm-and-engaged-views.md`
   - 适用：解释 `Views` 与 `Engaged Views`（2025.03.31 生效）差异、优化 `VVSA`（Viewed vs. Swiped Away）选择观看率、设计首尾无缝循环（Loop）、配置 Gemini 原生 `Auto-Dubbing` 多语言音轨。
2. **YPP 非真实内容红线、AI 披露与音乐版权禁区**：读取 `references/02-ypp-inauthentic-and-copyright.md`
   - 适用：诊断 YPP 拒审或清退原因（2025.07.15 `Inauthentic Content` 新政）、判断何时勾选合成内容披露标签、排查 61-180 秒 Shorts 触发 Content ID 全球禁播（Blocked Worldwide）隐患。
3. **三绿对标选赛道与正练/逆练双轨脚本**：读取 `references/03-niche-and-script-playbook.md`
   - 适用：筛选新手可复制的高 RPM 细分赛道、逆向拆解近 3 个月起号黑马、把长帖/奇闻改写为前 1.5 秒强冲突脚本（正练）或像素级重构爆款情绪节拍（逆练）。
4. **YPP 分账账本、AdSense 收 PIN 与 W-8BEN 税务合规**：读取 `references/04-adsense-tax-and-payout.md`
   - 适用：计算 45% 广告池分成与各国真实 RPM、指导频道所属地区与 AdSense 中国收款地址分离配置、填报 W-8BEN 美中税收协定（服务 0% / 版税 10%）及电汇结汇。

---

## 核心工作流

### 工作流 1：收益精算与 YPP 过审风险确定性审计

当用户提供频道设想、日均播放预期、视频时长、配乐方案或内容形式时，**必须先运行内置脚本 `scripts/audit_shorts.py` 获取确定性测算结果**，再结合报告给出策略建议。

```bash
python3 skills/yt-shorts-2026/scripts/audit_shorts.py \
  --daily-views 180000 \
  --vvsa 0.74 \
  --duration 45 \
  --apv 0.80 \
  --tier tier1 \
  --music original_or_royalty_free \
  --production ai_assisted_original \
  --format markdown
```

关键参数映射：
- `--tier`：`tier1`（美英澳加日德高价值区）、`mixed`（全球混合）、`tier3`（印度/东南亚低单价区）
- `--music`：`original_or_royalty_free`（免版税/原创，保留 100% 创作者池且 1-3 分钟安全）、`shorts_commercial_1track`（商业曲库 1 首，分走约 50% 权重且 >60 秒全球禁播）、`shorts_commercial_2tracks`、`unlicensed_bgm`
- `--production`：`original_scripted`、`ai_assisted_original`、`static_slideshow_ai`（静态图 PPT 轮播，必拒）、`reupload_fake_avatar`（假人头搬运，必拒）、`tts_reddit_slop`（纯机器念帖拼解压片，必拒）
- `--realistic-ai` / `--ai-disclosed`：写实合成媒体与披露状态
- `--no-w8ben`：模拟未填报 W-8BEN 导致的美国观众 30% 预扣税损

### 工作流 2：「三绿对标」赛道可行性诊断

拒绝凭个人喜好发明冷门赛道。引导或协助用户按以下四项硬指标检验候选对标频道（详见 `references/03-niche-and-script-playbook.md`）：
1. **起号窗口绿灯**：建号或首条 Shorts 发布在近 90-120 天内，粉丝尚处几千至数万量级但近期多条视频突破十万/百万播放（排除靠早期红利躺赢的老大号）。
2. **受众单价绿灯**：语言、文化梗与评论区主流留言指向美、英、澳、加、德、日等高 CPM 市场，或可通过官方 Auto-Dubbing 覆盖多语种高单价受众。
3. **变现与原创绿灯**：未命中静态图轮播、未授权影视硬切、假动物救援等 `Inauthentic Content` 灰产套路，频道货币化状态正常。
4. **可复现率绿灯**：近 20 条作品中至少 30% 以上高于频道中位数 3 倍，证明选题结构可批量复现，而非单条彩票式偶发爆款。

### 工作流 3：前 1.5 秒 VVSA 钩子与正/逆练脚本生成

Shorts 上滑信息流不存在传统缩略图点击率（CTR），第一生死线是 **`VVSA`（Viewed vs. Swiped Away，选择观看率 >= 70%）**。在生成或改写脚本时严格执行：

1. **0.0s - 1.5s 反划走铁律**：
   - 严禁出现「大家好」「今天我们来聊」「你知道吗」等废话铺垫，严禁黑屏淡入。
   - 第一句台词必须与第一帧画面反差同步落地（直接给反常识结论、极端数字对比或悬念动作中途截断）。
2. **中段每 4 秒微节拍**：
   - 单句口播控制在 12-18 个英文单词（或 20-28 个中文字）以内，用因果转折词（`But here is the catch` / `Until researchers opened the box`）替代并列罗列。
3. **尾帧无缝 Loop（拉升 APV > 95%）**：
   - 将结尾最后半句做成指向开头的悬念桥，或删除尾音空白直切第一帧，让观众在无意识重播 3-5 秒后才反应过来。

### 工作流 4：旧攻略纠偏清单（回答咨询时主动提示）

一旦发现用户沿用以下旧经验，立即指出对应的 2025-2026 官方变更：
- **误区 1**：「前台跑够 1000 万播放就能开 YPP 分成」 -> **纠偏**：2025.03.31 起公开 `Views` 含起播即计，YPP 300万/1000万门槛与广告分账 **100% 只认后台高级分析里的 `Engaged Views`（有效观看）**。
- **误区 2**：「生成 25 张 AI 猫咪图片配个悲惨音乐就能躺赚美金」 -> **纠偏**：2025.07.15 `Inauthentic Content` 政策已将无人工叙事增量的批量静态图故事与模板化 AI Slop 列为头号拒审/清退对象。
- **误区 3**：「现在 Shorts 支持 3 分钟了，直接挂热门音乐做 2 分钟解说」 -> **纠偏**：61-180 秒 Shorts 一旦触发任何有效 Content ID 音乐主张，直接**全球禁播（Blocked Worldwide）**，1 分钟以上只准用免版税或原创配乐。
- **误区 4**：「挂了 AI 合成声明会被平台限流」 -> **纠偏**：官方明确合规勾选 `Altered or synthetic content` 不降权、不影响广告分成；瞒报写实合成人物反而会被系统识别强挂标签甚至处罚。
