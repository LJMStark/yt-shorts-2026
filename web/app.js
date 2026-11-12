(function () {
  "use strict";

  const AUDIENCE_RPM = Object.freeze({
    tier1: { base: 0.14, low: 0.08, high: 0.20, usShare: 0.60 },
    mixed: { base: 0.06, low: 0.03, high: 0.10, usShare: 0.35 },
    tier3: { base: 0.015, low: 0.01, high: 0.02, usShare: 0.10 },
  });

  const MUSIC_MULT = Object.freeze({
    original_or_royalty_free: 1.0,
    shorts_commercial_1track: 0.5,
    shorts_commercial_2tracks: 0.33,
    unlicensed_bgm: 0.0,
  });

  const INAUTHENTIC_MAP = Object.freeze({
    static_slideshow_ai: {
      zh: "批量静态图缩放轮播（如 25 张 AI 图拼宠物 PPT 故事）属于 2025.07 Inauthentic Content 重点拒审形态。",
      en: "Mass-produced static image slideshows are directly rejected under the July 2025 Inauthentic Content policy.",
    },
    reupload_fake_avatar: {
      zh: "搬运他人切片叠加左下角假人头或简单镜像变速去重，触发非真实内容与重复内容双拒审。",
      en: "Reuploaded clips with corner fake avatars or mirror/speed tweaks fail YPP human review.",
    },
    tts_reddit_slop: {
      zh: "纯机器念帖拼无关跑酷/解压视频且无原创叙事重构，无法通过 YPP 获利审核。",
      en: "Raw TTS reading scraped posts over unrelated gameplay footage is blocked from YPP monetization.",
    },
  });

  const I18N = Object.freeze({
    zh: {
      title: "YT Shorts 2026 · 有效观看精算与 YPP 过审排雷台",
      sub: "ENGAGED VIEWS LEDGER // 2025.03 & 2025.07 POLICY ENGINE",
      presetTrap: "模拟高频拒审踩坑方案",
      presetSafe: "加载 2026 合规高单价方案",
      langBtn: "EN / 中文",
      copyCmd: "复制安装命令",
      copied: "已复制命令",
      inputPanel: "频道参数与内容形态输入",
      lblViews: "预计日均公开播放 (Public Views)",
      lblVvsa: "VVSA 选择观看率 (未划走比例)",
      lblDuration: "单条视频时长 (秒)",
      lblApv: "平均观看比例 APV (含重播)",
      lblTier: "目标受众广告单价区 (RPM)",
      lblMusic: "背景配乐版权来源",
      lblProd: "内容生产与剪辑范式",
      chkRealAi: "包含写实合成人物/逼真虚构场景",
      chkDisclosed: "已在 Studio 勾选「修改或合成内容」声明",
      chkW8ben: "已填报 AdSense W-8BEN 美中税收协定 (0% 服务预扣)",
      kpiStatus: "YPP 过审与变现判定",
      kpiEngaged: "日均有效观看 (Engaged Views)",
      kpiNet: "预计月度净到手美金 (45% 池)",
      kpiPool: "算法推荐池层级",
      passBadge: "PASS · 可正常变现",
      blockBadge: "BLOCKED · 拒审或禁播归零",
      ypp3m: "YPP 粉丝变现档 (90天 300万 Engaged Views)",
      ypp10m: "YPP 广告分成档 (90天 1,000万 Engaged Views)",
      auditHeader: "2026 官方规则逐项排雷诊断",
      fixPrefix: "修复方案：",
    },
    en: {
      title: "YT Shorts 2026 · Engaged Views & YPP Compliance Auditor",
      sub: "ENGAGED VIEWS LEDGER // 2025.03 & 2025.07 POLICY ENGINE",
      presetTrap: "Load High-Risk Reject Trap",
      presetSafe: "Load 2026 Compliant Tier-1 Preset",
      langBtn: "中文 / EN",
      copyCmd: "Copy CLI Install",
      copied: "Copied",
      inputPanel: "Channel Telemetry & Format Inputs",
      lblViews: "Est. Daily Public Views",
      lblVvsa: "Viewed vs. Swiped Away (VVSA)",
      lblDuration: "Video Duration (Seconds)",
      lblApv: "Avg. Percentage Viewed (APV)",
      lblTier: "Audience Region Tier",
      lblMusic: "Music Licensing Source",
      lblProd: "Production Paradigm",
      chkRealAi: "Contains photorealistic synthetic scenes/persons",
      chkDisclosed: "Checked 'Altered or synthetic content' in Studio",
      chkW8ben: "Claimed W-8BEN Tax Treaty (0% service withholding)",
      kpiStatus: "YPP & Monetization Gate",
      kpiEngaged: "Daily Engaged Views",
      kpiNet: "Est. Monthly Net Revenue (45% Pool)",
      kpiPool: "Algorithm Distribution Pool",
      passBadge: "PASS · MONETIZABLE",
      blockBadge: "BLOCKED · $0 / REJECTED",
      ypp3m: "YPP Expanded Tier (3M Engaged / 90d)",
      ypp10m: "YPP Full Ad Share (10M Engaged / 90d)",
      auditHeader: "2026 Policy & Algorithm Diagnostic Ledger",
      fixPrefix: "Action: ",
    },
  });

  let currentLang = "zh";

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function evaluatePlan(plan, lang) {
    const retentionFactor = Math.min(1.0, 0.65 + plan.apv * 0.35);
    const engagedRatio = Number(clamp(plan.vvsa * retentionFactor, 0.15, 0.95).toFixed(4));
    const dailyEngaged = Math.round(plan.dailyViews * engagedRatio);
    const ninetyDayEngaged = dailyEngaged * 90;

    let distTier = "viral_explore_pool";
    if (plan.vvsa < 0.5) {
      distTier = "dead_pool";
    } else if (plan.vvsa < 0.7) {
      distTier = "flat_pool";
    } else {
      const targetApv = plan.duration <= 30 ? 0.85 : 0.55;
      if (plan.apv < targetApv) distTier = "hook_strong_retention_weak";
    }

    const risks = [];
    if (plan.duration > 180) {
      risks.push({
        severity: "BLOCKER",
        code: "DURATION_OVER_180S",
        title: lang === "zh" ? "超出 180 秒上限，无法进入 Shorts 流" : "Exceeds 180s Shorts limit",
        detail: lang === "zh" ? "竖屏/方屏 Shorts 最长支持 3 分钟（180 秒）。" : "Vertical/square Shorts cap at 180 seconds.",
        fix: lang === "zh" ? "将时长控制在 180 秒以内。" : "Trim duration below 180 seconds.",
      });
    }

    if (plan.duration > 60 && plan.music !== "original_or_royalty_free") {
      risks.push({
        severity: "BLOCKER",
        code: "MUSIC_BLOCK_OVER_60S",
        title: lang === "zh" ? "61-180 秒使用商业或未授权配乐触发全球禁播" : "Worldwide Block: Commercial music on 61-180s Shorts",
        detail: lang === "zh" ? "超过 60 秒的 Shorts 一旦命中任何有效 Content ID 音乐主张，直接全球禁播（Blocked Worldwide），推流与分成归零。" : "Shorts over 60s with any active Content ID music claim are blocked worldwide with zero views and zero revenue.",
        fix: lang === "zh" ? "61 秒以上视频必须切换为 YouTube Audio Library 免版税曲库或原创配乐。" : "Use YouTube Audio Library royalty-free tracks or original score for 61-180s videos.",
      });
    } else if (plan.music === "unlicensed_bgm") {
      risks.push({
        severity: "BLOCKER",
        code: "UNLICENSED_BGM",
        title: lang === "zh" ? "私自扒取同行 BGM 触发版权主张，无法获利" : "Unlicensed BGM strips monetization",
        detail: lang === "zh" ? "脱离官方商业曲库提取音频极易收到 Content ID 主张或下架。" : "Extracted unlicensed audio triggers copyright claims.",
        fix: lang === "zh" ? "改用免版税音频以保留 100% 创作者池权重。" : "Switch to royalty-free audio to keep 100% Creator Pool share.",
      });
    } else if (plan.music !== "original_or_royalty_free") {
      const cut = plan.music === "shorts_commercial_1track" ? "50%" : "67%";
      risks.push({
        severity: "WARNING",
        code: "MUSIC_POOL_DILUTION",
        title: lang === "zh" ? `商业音乐先分走约 ${cut} 创作者资金池权重` : `Commercial track deducts ~${cut} before 45% split`,
        detail: lang === "zh" ? "国家广告池先扣除音乐版权费，剩余部分才按 45% 分给创作者。" : "Music licensing is deducted from the country pool prior to creator rev-share.",
        fix: lang === "zh" ? "非音乐卡点类内容建议改用免版税背景音，收益直接翻倍。" : "Use royalty-free BGM on narrative videos to retain full pool weight.",
      });
    }

    if (INAUTHENTIC_MAP[plan.production]) {
      risks.push({
        severity: "BLOCKER",
        code: "INAUTHENTIC_CONTENT_REJECT",
        title: lang === "zh" ? "命中 2025.07 Inauthentic Content（非真实内容）拒审红线" : "Violates July 2025 Inauthentic Content YPP Policy",
        detail: INAUTHENTIC_MAP[plan.production][lang],
        fix: lang === "zh" ? "升级为「人工冲突脚本 + 定制动态分镜 + 独家考据增量」的精品无露脸栏目。" : "Upgrade to original scripted storytelling with custom visual pacing and editorial value.",
      });
    }

    if (plan.realisticAi && !plan.disclosed) {
      risks.push({
        severity: "WARNING",
        code: "UNDISCLOSED_SYNTHETIC",
        title: lang === "zh" ? "写实合成画面未勾选官方披露声明" : "Undisclosed photorealistic synthetic media",
        detail: lang === "zh" ? "漏标 Altered or synthetic content 会被系统强挂不可移除标签甚至处罚。" : "Missing synthetic disclosure risks forced labels or YPP penalties.",
        fix: lang === "zh" ? "上传时主动勾选合成声明；官方明确合规打标不限流、不降分成。" : "Enable synthetic content disclosure in Studio (zero ranking penalty).",
      });
    }

    if (distTier === "dead_pool") {
      risks.push({
        severity: "WARNING",
        code: "VVSA_DEAD_POOL",
        title: lang === "zh" ? "VVSA 低于 50% 生死线，种子池直接截断推流" : "VVSA below 50% survival threshold",
        detail: lang === "zh" ? "超过半数观众在首秒划走，前台很难突破两千播放。" : "Over half of viewers swipe away immediately, halting seed exploration.",
        fix: lang === "zh" ? "砍掉前 1.5 秒铺垫，首帧直接亮出极端数字反差或反常识结论。" : "Front-load visual contrast and counter-intuitive hook in the first 1.5s.",
      });
    } else if (distTier !== "viral_explore_pool") {
      risks.push({
        severity: "WARNING",
        code: "RETENTION_SUBOPTIMAL",
        title: lang === "zh" ? "留存尚未跨入 VVSA >= 70% 大爆款探索池" : "Retention below 70% VVSA viral explore tier",
        detail: lang === "zh" ? "进入千万级流量池通常要求 VVSA >= 70% 且尾帧诱导重播。" : "Viral explore pools typically require >=70% VVSA and strong loop APV.",
        fix: lang === "zh" ? "每 4 秒加一个因果转折词，尾句不写总结直接硬切首帧形成 Loop。" : "Add micro-twists every 4s and bridge the final phrase back into frame 0.",
      });
    }

    if (!plan.w8ben) {
      risks.push({
        severity: "WARNING",
        code: "W8BEN_TAX_LEAK",
        title: lang === "zh" ? "未填 W-8BEN 税收协定，美国观众收益被预扣 30%" : "Missing W-8BEN treaty: 30% US withholding leak",
        detail: lang === "zh" ? "未勾选美中所得税协定第 7 条第 1 款（0%），将被默认扣走高额美国税。" : "Unclaimed tax treaty triggers default 30% IRS withholding on US views.",
        fix: lang === "zh" ? "在 AdSense 提交 W-8BEN 并填入身份证号作为 Foreign TIN 勾选 0% 条款。" : "Submit W-8BEN in AdSense with Foreign TIN to claim treaty rates.",
      });
    }

    if (risks.length === 0) {
      risks.push({
        severity: "PASS",
        code: "ALL_GREEN",
        title: lang === "zh" ? "全项通过 2026 政策合规与算法探索池健康度校验" : "All 2026 YPP & Algorithm health checks passed",
        detail: lang === "zh" ? "无禁播、无非真实内容拒审、无预扣税漏损，具备规模化复制条件。" : "Zero blockers detected. Ready for high-RPM scaling and Auto-Dubbing.",
        fix: lang === "zh" ? "开启官方 Gemini Auto-Dubbing 挂载西/德/日多语言音轨放大单条收益。" : "Enable Gemini Auto-Dubbing tracks to multiply Tier-1/Tier-2 Engaged Views.",
      });
    }

    const monetizable = !risks.some((r) => r.severity === "BLOCKER");
    const rpmCfg = AUDIENCE_RPM[plan.tier];
    const musicMult = MUSIC_MULT[plan.music];
    const safeMusicMult = musicMult > 0 ? musicMult : 1.0;
    const monthlyK = (dailyEngaged * 30) / 1000;
    const taxLeakRate = plan.w8ben ? 0 : rpmCfg.usShare * 0.3;
    const taxKeep = 1 - taxLeakRate;

    const potentialNet = monthlyK * rpmCfg.base * safeMusicMult;
    const monthlyNet = monetizable ? monthlyK * rpmCfg.base * musicMult * taxKeep : 0;
    const lowNet = monetizable ? monthlyK * rpmCfg.low * musicMult * taxKeep : 0;
    const highNet = monetizable ? monthlyK * rpmCfg.high * musicMult * taxKeep : 0;
    const taxLeak = (monetizable ? monthlyK * rpmCfg.base * musicMult : potentialNet) * taxLeakRate;

    return Object.freeze({
      monetizable,
      engagedRatio,
      dailyEngaged,
      ninetyDayEngaged,
      distTier,
      days3m: dailyEngaged > 0 ? Math.ceil(3000000 / dailyEngaged) : 9999,
      days10m: dailyEngaged > 0 ? Math.ceil(10000000 / dailyEngaged) : 9999,
      monthlyNet,
      lowNet,
      highNet,
      potentialNet,
      taxLeak,
      risks,
    });
  }

  function formatNum(n) {
    return Math.round(n).toLocaleString("en-US");
  }

  function formatUsd(n) {
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function readInputs() {
    return Object.freeze({
      dailyViews: Number(document.getElementById("in-views").value),
      vvsa: Number(document.getElementById("in-vvsa").value) / 100,
      duration: Number(document.getElementById("in-duration").value),
      apv: Number(document.getElementById("in-apv").value) / 100,
      tier: document.getElementById("in-tier").value,
      music: document.getElementById("in-music").value,
      production: document.getElementById("in-prod").value,
      realisticAi: document.getElementById("in-real-ai").checked,
      disclosed: document.getElementById("in-disclosed").checked,
      w8ben: document.getElementById("in-w8ben").checked,
    });
  }

  function render() {
    const t = I18N[currentLang];
    const plan = readInputs();
    const res = evaluatePlan(plan, currentLang);

    document.getElementById("val-views").textContent = formatNum(plan.dailyViews);
    document.getElementById("val-vvsa").textContent = Math.round(plan.vvsa * 100) + "%";
    document.getElementById("val-duration").textContent = plan.duration + "s";
    document.getElementById("val-apv").textContent = Math.round(plan.apv * 100) + "%";

    const statusEl = document.getElementById("out-status");
    statusEl.innerHTML = `<span class="status-pill ${res.monetizable ? "status-pass" : "status-block"}"><span class="dot"></span>${res.monetizable ? t.passBadge : t.blockBadge}</span>`;
    document.getElementById("out-status-meta").textContent = res.monetizable
      ? (res.taxLeak > 0 ? `W-8BEN Leak: -${formatUsd(res.taxLeak)}/mo` : "Creator Pool Share: 45%")
      : `Compliant Potential: ${formatUsd(res.potentialNet)}/mo`;

    document.getElementById("out-engaged").textContent = formatNum(res.dailyEngaged);
    document.getElementById("out-engaged-meta").textContent = `Ratio ${(res.engagedRatio * 100).toFixed(1)}% · 90d: ${formatNum(res.ninetyDayEngaged)}`;

    document.getElementById("out-net").textContent = formatUsd(res.monthlyNet);
    document.getElementById("out-net-meta").textContent = res.monetizable
      ? `Range ${formatUsd(res.lowNet)} - ${formatUsd(res.highNet)} / mo`
      : "Blocked by Policy / Copyright";

    const tierNames = {
      viral_explore_pool: "EXPLORE POOL (>=70%)",
      hook_strong_retention_weak: "MID-DROP POOL",
      flat_pool: "FLAT POOL (50-69%)",
      dead_pool: "SEED HALT (<50%)",
    };
    document.getElementById("out-pool").textContent = tierNames[res.distTier];
    document.getElementById("out-pool-meta").textContent = `Duration ${plan.duration}s · APV ${Math.round(plan.apv * 100)}%`;

    const pct3m = Math.min(100, Math.round((res.ninetyDayEngaged / 3000000) * 100));
    const pct10m = Math.min(100, Math.round((res.ninetyDayEngaged / 10000000) * 100));
    document.getElementById("bar-3m").style.width = pct3m + "%";
    document.getElementById("bar-3m").style.background = pct3m >= 100 && res.monetizable ? "var(--accent-emerald)" : "var(--accent-amber)";
    document.getElementById("meta-3m").textContent = `${pct3m}% (${res.days3m}d)`;

    document.getElementById("bar-10m").style.width = pct10m + "%";
    document.getElementById("bar-10m").style.background = pct10m >= 100 && res.monetizable ? "var(--accent-emerald)" : "var(--accent-red)";
    document.getElementById("meta-10m").textContent = `${pct10m}% (${res.days10m}d)`;

    const stack = document.getElementById("risk-list");
    stack.innerHTML = res.risks
      .map(
        (r) => `
      <div class="risk-card risk-${r.severity}">
        <div class="risk-head">
          <span class="risk-title">${r.title}</span>
          <span class="risk-badge">${r.severity} · ${r.code}</span>
        </div>
        <p class="risk-desc">${r.detail}</p>
        <p class="risk-fix">${t.fixPrefix}${r.fix}</p>
      </div>`
      )
      .join("");
  }

  function applyTexts() {
    const t = I18N[currentLang];
    const map = {
      "txt-title": t.title,
      "txt-sub": t.sub,
      "btn-trap": t.presetTrap,
      "btn-safe": t.presetSafe,
      "btn-lang": t.langBtn,
      "btn-copy": t.copyCmd,
      "txt-input-panel": t.inputPanel,
      "lbl-views": t.lblViews,
      "lbl-vvsa": t.lblVvsa,
      "lbl-duration": t.lblDuration,
      "lbl-apv": t.lblApv,
      "lbl-tier": t.lblTier,
      "lbl-music": t.lblMusic,
      "lbl-prod": t.lblProd,
      "lbl-real-ai": t.chkRealAi,
      "lbl-disclosed": t.chkDisclosed,
      "lbl-w8ben": t.chkW8ben,
      "kpi-lbl-status": t.kpiStatus,
      "kpi-lbl-engaged": t.kpiEngaged,
      "kpi-lbl-net": t.kpiNet,
      "kpi-lbl-pool": t.kpiPool,
      "lbl-ypp-3m": t.ypp3m,
      "lbl-ypp-10m": t.ypp10m,
      "txt-audit-header": t.auditHeader,
    };
    Object.keys(map).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = map[id];
    });
  }

  function applyPreset(mode) {
    if (mode === "trap") {
      document.getElementById("in-views").value = 160000;
      document.getElementById("in-vvsa").value = 54;
      document.getElementById("in-duration").value = 85;
      document.getElementById("in-apv").value = 48;
      document.getElementById("in-tier").value = "mixed";
      document.getElementById("in-music").value = "shorts_commercial_1track";
      document.getElementById("in-prod").value = "static_slideshow_ai";
      document.getElementById("in-real-ai").checked = true;
      document.getElementById("in-disclosed").checked = false;
      document.getElementById("in-w8ben").checked = false;
    } else {
      document.getElementById("in-views").value = 220000;
      document.getElementById("in-vvsa").value = 76;
      document.getElementById("in-duration").value = 46;
      document.getElementById("in-apv").value = 82;
      document.getElementById("in-tier").value = "tier1";
      document.getElementById("in-music").value = "original_or_royalty_free";
      document.getElementById("in-prod").value = "ai_assisted_original";
      document.getElementById("in-real-ai").checked = true;
      document.getElementById("in-disclosed").checked = true;
      document.getElementById("in-w8ben").checked = true;
    }
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("input, select").forEach((el) => {
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });
    document.getElementById("btn-trap").addEventListener("click", () => applyPreset("trap"));
    document.getElementById("btn-safe").addEventListener("click", () => applyPreset("safe"));
    document.getElementById("btn-lang").addEventListener("click", () => {
      currentLang = currentLang === "zh" ? "en" : "zh";
      applyTexts();
      render();
    });
    document.getElementById("btn-copy").addEventListener("click", () => {
      const cmd = document.getElementById("cli-cmd-text").textContent;
      navigator.clipboard.writeText(cmd).then(() => {
        const btn = document.getElementById("btn-copy");
        btn.textContent = I18N[currentLang].copied;
        setTimeout(() => {
          btn.textContent = I18N[currentLang].copyCmd;
        }, 1600);
      });
    });
    applyTexts();
    render();
  });
})();
