#!/usr/bin/env python3
"""Deterministic 2026 YouTube Shorts Engaged Views, RPM & YPP Risk Auditor."""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import asdict, dataclass
from typing import Tuple

AUDIENCE_RPM_CONFIG = {
    "tier1": {"base_rpm": 0.14, "low_rpm": 0.08, "high_rpm": 0.20, "us_share": 0.60},
    "mixed": {"base_rpm": 0.06, "low_rpm": 0.03, "high_rpm": 0.10, "us_share": 0.35},
    "tier3": {"base_rpm": 0.015, "low_rpm": 0.01, "high_rpm": 0.02, "us_share": 0.10},
}

MUSIC_POOL_MULTIPLIER = {
    "original_or_royalty_free": 1.00,
    "shorts_commercial_1track": 0.50,
    "shorts_commercial_2tracks": 0.33,
    "unlicensed_bgm": 0.00,
}

VALID_PRODUCTION_TYPES = {
    "original_scripted",
    "ai_assisted_original",
    "static_slideshow_ai",
    "reupload_fake_avatar",
    "tts_reddit_slop",
}

INAUTHENTIC_PRODUCTION_TYPES = {
    "static_slideshow_ai": "批量静态图缩放轮播（PPT 故事流）属于 2025.07 Inauthentic Content 重点清退形态",
    "reupload_fake_avatar": "搬运切片叠加左下角假人头或简单镜像变速去重，触发非真实内容与重复内容双拒审",
    "tts_reddit_slop": "纯机器配音念帖拼无关解压视频且无原创观点编排，无法通过 YPP 人工复审",
}

YPP_FAN_ENGAGED_VIEWS = 3_000_000
YPP_ADS_ENGAGED_VIEWS = 10_000_000


@dataclass(frozen=True)
class AuditInput:
    daily_public_views: int
    vvsa_rate: float
    duration_seconds: int
    avg_percentage_viewed: float
    audience_tier: str = "tier1"
    music_source: str = "original_or_royalty_free"
    production_type: str = "ai_assisted_original"
    realistic_ai_media: bool = False
    ai_disclosed: bool = False
    w8ben_treaty_claimed: bool = True


@dataclass(frozen=True)
class RiskFinding:
    code: str
    severity: str
    title: str
    detail: str
    remediation: str


@dataclass(frozen=True)
class AuditResult:
    monetizable: bool
    engaged_view_ratio: float
    daily_engaged_views: int
    ninety_day_engaged_views: int
    distribution_tier: str
    can_reach_ypp_fan_in_90d: bool
    can_reach_ypp_ads_in_90d: bool
    days_to_ypp_fan: int
    days_to_ypp_ads: int
    effective_rpm_usd: float
    monthly_net_usd: float
    monthly_range_low_usd: float
    monthly_range_high_usd: float
    potential_monthly_net_usd: float
    monthly_tax_leak_usd: float
    risks: Tuple[RiskFinding, ...]


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def validate_input(plan: AuditInput) -> None:
    if plan.daily_public_views < 0:
        raise ValueError("daily_public_views must be >= 0")
    if not (0.0 <= plan.vvsa_rate <= 1.0):
        raise ValueError("vvsa_rate must be between 0.0 and 1.0")
    if plan.duration_seconds <= 0:
        raise ValueError("duration_seconds must be > 0")
    if not (0.0 < plan.avg_percentage_viewed <= 3.0):
        raise ValueError("avg_percentage_viewed must be between 0.0 and 3.0")
    if plan.audience_tier not in AUDIENCE_RPM_CONFIG:
        raise ValueError(f"audience_tier must be one of {sorted(AUDIENCE_RPM_CONFIG)}")
    if plan.music_source not in MUSIC_POOL_MULTIPLIER:
        raise ValueError(f"music_source must be one of {sorted(MUSIC_POOL_MULTIPLIER)}")
    if plan.production_type not in VALID_PRODUCTION_TYPES:
        raise ValueError(f"production_type must be one of {sorted(VALID_PRODUCTION_TYPES)}")


def classify_distribution_tier(vvsa_rate: float, duration_seconds: int, apv: float) -> str:
    if vvsa_rate < 0.50:
        return "dead_pool"
    if vvsa_rate < 0.70:
        return "flat_pool"
    retention_target = 0.85 if duration_seconds <= 30 else 0.55
    if apv >= retention_target:
        return "viral_explore_pool"
    return "hook_strong_retention_weak"


def compute_engaged_view_ratio(vvsa_rate: float, apv: float) -> float:
    retention_factor = min(1.0, 0.65 + apv * 0.35)
    return round(_clamp(vvsa_rate * retention_factor, 0.15, 0.95), 4)


def evaluate_risks(plan: AuditInput, distribution_tier: str) -> Tuple[RiskFinding, ...]:
    findings: list[RiskFinding] = []

    if plan.duration_seconds > 180:
        findings.append(
            RiskFinding(
                code="DURATION_EXCEEDS_SHORTS_LIMIT",
                severity="BLOCKER",
                title="视频超过 180 秒上限，无法归入 Shorts 流",
                detail=f"当前设置时长为 {plan.duration_seconds} 秒，超出竖屏/方屏 Shorts 最长 3 分钟（180 秒）限制。",
                remediation="将单条时长压缩至 180 秒以内；若做深度长内容请改用 16:9 横屏长视频逻辑。",
            )
        )

    if plan.duration_seconds > 60 and plan.music_source != "original_or_royalty_free":
        findings.append(
            RiskFinding(
                code="MUSIC_BLOCK_OVER_60S",
                severity="BLOCKER",
                title="61-180 秒 Shorts 使用商业或未授权配乐将触发全球禁播",
                detail="1 到 3 分钟的 Shorts 一旦命中任何有效 Content ID 音乐版权主张，会被直接全球禁播（Blocked Worldwide），推流与收益归零。",
                remediation="61 秒以上视频必须切换为 YouTube Audio Library 免版税音乐、原创编曲或已购商用授权配乐。",
            )
        )
    elif plan.music_source == "unlicensed_bgm":
        findings.append(
            RiskFinding(
                code="UNLICENSED_BGM_CLAIM",
                severity="BLOCKER",
                title="直接扒取同行 BGM 或未授权音乐无法获得分成",
                detail="脱离官方 Shorts 商业曲库私自提取他人音频轨，极易收到版权主张或下架警告。",
                remediation="60 秒内请通过官方创作工具挂载授权音乐；追求满额 45% 分成请改用免版税曲库。",
            )
        )
    elif plan.music_source in ("shorts_commercial_1track", "shorts_commercial_2tracks"):
        share_cut = "50%" if plan.music_source == "shorts_commercial_1track" else "67%"
        findings.append(
            RiskFinding(
                code="COMMERCIAL_MUSIC_POOL_DILUTION",
                severity="WARNING",
                title=f"使用商业音乐将分走约 {share_cut} 创作者池基数",
                detail="Shorts 国家资金池会先扣除商业音乐版权成本再进入 45% 创作者分配。",
                remediation="若音乐并非核心完播钩子，建议改用免版税音效与原创旁白以保留 100% 创作者池权重。",
            )
        )

    if plan.production_type in INAUTHENTIC_PRODUCTION_TYPES:
        findings.append(
            RiskFinding(
                code="INAUTHENTIC_CONTENT_YPP_REJECT",
                severity="BLOCKER",
                title="命中 2025.07 Inauthentic Content（非真实内容）拒审红线",
                detail=INAUTHENTIC_PRODUCTION_TYPES[plan.production_type],
                remediation="引入人工叙事冲突编排、独家数据考据或定制化动态分镜，杜绝批量无脑模板套壳。",
            )
        )

    if plan.realistic_ai_media and not plan.ai_disclosed:
        findings.append(
            RiskFinding(
                code="UNDISCLOSED_SYNTHETIC_MEDIA",
                severity="WARNING",
                title="写实类合成画面或克隆他人声音未勾选官方披露标签",
                detail="YouTube 强制要求对写实合成人物、虚构真实场景勾选 Altered or synthetic content，漏标会被强挂标签甚至处罚。",
                remediation="在 Studio 上传详情页勾选合成内容声明；官方明确合规披露不影响推荐权重与广告分成。",
            )
        )

    if distribution_tier == "dead_pool":
        findings.append(
            RiskFinding(
                code="VVSA_BELOW_SURVIVAL_LINE",
                severity="WARNING",
                title="VVSA 选择观看率低于 50% 生死线，种子池将直接停推",
                detail=f"当前 VVSA 为 {plan.vvsa_rate * 100:.1f}%（即 {100 - plan.vvsa_rate * 100:.1f}% 观众直接划走），无法进入探索放大池。",
                remediation="砍掉前 1.5 秒一切寒暄与黑屏转场，第一帧直接抛出反常识结果或视觉冲突。",
            )
        )
    elif distribution_tier in ("flat_pool", "hook_strong_retention_weak"):
        findings.append(
            RiskFinding(
                code="RETENTION_SUBOPTIMAL",
                severity="WARNING",
                title="留存指标尚未达到大爆款探索池阈值",
                detail="爆款池通常要求 VVSA >= 70%，且 30 秒内完播 >= 85%（60 秒以上 >= 55%）。",
                remediation="每 3-5 秒埋设微反转节拍，并将尾帧台词无缝衔接到首帧画面以诱导自动重播。",
            )
        )

    if not plan.w8ben_treaty_claimed:
        findings.append(
            RiskFinding(
                code="W8BEN_TAX_LEAK",
                severity="WARNING",
                title="未申请 W-8BEN 税收协定，美国观众收益将被预扣 30%",
                detail="非美创作者若未在 AdSense 填报 W-8BEN 并勾选所得税协定（如美中第 7 条第 1 款 0%），会被默认扣除美国区 30% 税款。",
                remediation="在 AdSense 税务信息页提交 W-8BEN，勾选税收协定服务条款（0% 预扣税率）。",
            )
        )

    if not findings:
        findings.append(
            RiskFinding(
                code="ALL_CHECKS_PASSED",
                severity="PASS",
                title="通过 2026 YouTube Shorts 核心政策与算法健康度核查",
                detail="未发现全球禁播、非真实内容拒审或税务漏损风险，可按计划推进规模化测试。",
                remediation="持续在 YouTube Analytics 高级模式跟踪 Engaged Views 转化率与单条 VVSA 曲线。",
            )
        )

    return tuple(findings)


def audit_channel_plan(plan: AuditInput) -> AuditResult:
    validate_input(plan)

    ratio = compute_engaged_view_ratio(plan.vvsa_rate, plan.avg_percentage_viewed)
    daily_engaged = int(round(plan.daily_public_views * ratio))
    ninety_day_engaged = daily_engaged * 90

    dist_tier = classify_distribution_tier(
        plan.vvsa_rate, plan.duration_seconds, plan.avg_percentage_viewed
    )
    risks = evaluate_risks(plan, dist_tier)
    has_blocker = any(r.severity == "BLOCKER" for r in risks)
    monetizable = not has_blocker

    if daily_engaged > 0:
        days_fan = math.ceil(YPP_FAN_ENGAGED_VIEWS / daily_engaged)
        days_ads = math.ceil(YPP_ADS_ENGAGED_VIEWS / daily_engaged)
    else:
        days_fan = 9999
        days_ads = 9999

    rpm_cfg = AUDIENCE_RPM_CONFIG[plan.audience_tier]
    music_mult = MUSIC_POOL_MULTIPLIER[plan.music_source]
    # Compliant baseline uses original/royalty-free multiplier if current music is blocked
    potential_music_mult = music_mult if music_mult > 0 else 1.0

    monthly_engaged_thousands = (daily_engaged * 30) / 1000.0
    gross_creator_monthly = monthly_engaged_thousands * rpm_cfg["base_rpm"] * music_mult
    potential_monthly = monthly_engaged_thousands * rpm_cfg["base_rpm"] * potential_music_mult

    tax_leak_rate = 0.0 if plan.w8ben_treaty_claimed else (rpm_cfg["us_share"] * 0.30)
    tax_multiplier = 1.0 - tax_leak_rate

    if monetizable:
        effective_rpm = round(rpm_cfg["base_rpm"] * music_mult * tax_multiplier, 4)
        monthly_net = round(gross_creator_monthly * tax_multiplier, 2)
        low_net = round(
            monthly_engaged_thousands * rpm_cfg["low_rpm"] * music_mult * tax_multiplier, 2
        )
        high_net = round(
            monthly_engaged_thousands * rpm_cfg["high_rpm"] * music_mult * tax_multiplier, 2
        )
        tax_leak_usd = round(gross_creator_monthly * tax_leak_rate, 2)
    else:
        effective_rpm = 0.0
        monthly_net = 0.0
        low_net = 0.0
        high_net = 0.0
        tax_leak_usd = round(potential_monthly * tax_leak_rate, 2)

    return AuditResult(
        monetizable=monetizable,
        engaged_view_ratio=ratio,
        daily_engaged_views=daily_engaged,
        ninety_day_engaged_views=ninety_day_engaged,
        distribution_tier=dist_tier,
        can_reach_ypp_fan_in_90d=ninety_day_engaged >= YPP_FAN_ENGAGED_VIEWS and monetizable,
        can_reach_ypp_ads_in_90d=ninety_day_engaged >= YPP_ADS_ENGAGED_VIEWS and monetizable,
        days_to_ypp_fan=days_fan,
        days_to_ypp_ads=days_ads,
        effective_rpm_usd=effective_rpm,
        monthly_net_usd=monthly_net,
        monthly_range_low_usd=low_net,
        monthly_range_high_usd=high_net,
        potential_monthly_net_usd=round(potential_monthly, 2),
        monthly_tax_leak_usd=tax_leak_usd,
        risks=risks,
    )


def format_markdown_report(plan: AuditInput, result: AuditResult) -> str:
    status_text = "PASS (可正常申请与分账)" if result.monetizable else "BLOCKED (触发红线：零分账或拒审)"
    lines = [
        "# YouTube Shorts 2026 收益精算与 YPP 排雷报告",
        "",
        f"- **过审与变现状态**: {status_text}",
        f"- **每日公开播放 (Public Views)**: {plan.daily_public_views:,}",
        f"- **有效观看折算率**: {result.engaged_view_ratio * 100:.1f}%",
        f"- **每日有效观看 (Engaged Views)**: {result.daily_engaged_views:,}",
        f"- **90 天累计 Engaged Views**: {result.ninety_day_engaged_views:,}",
        f"- **算法分发池层级**: `{result.distribution_tier}`",
        f"- **YPP 300万档预计天数**: {result.days_to_ypp_fan} 天 (90天内达标: {result.can_reach_ypp_fan_in_90d})",
        f"- **YPP 1000万广告分成档预计天数**: {result.days_to_ypp_ads} 天 (90天内达标: {result.can_reach_ypp_ads_in_90d})",
        f"- **预计月度净到手分成 (45% 池)**: ${result.monthly_net_usd:,.2f} (区间 ${result.monthly_range_low_usd:,.2f} - ${result.monthly_range_high_usd:,.2f})",
    ]
    if not result.monetizable:
        lines.append(
            f"- **合规整改后理论月度分成**: ${result.potential_monthly_net_usd:,.2f}"
        )
    if result.monthly_tax_leak_usd > 0:
        lines.append(
            f"- **未填 W-8BEN 月度预扣税损**: ${result.monthly_tax_leak_usd:,.2f}"
        )
    lines.extend(["", "## 逐项风险诊断", ""])
    for item in result.risks:
        lines.append(f"### [{item.severity}] {item.title} (`{item.code}`)")
        lines.append(f"- **原因**: {item.detail}")
        lines.append(f"- **修复动作**: {item.remediation}")
        lines.append("")
    return "\n".join(lines)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Audit 2026 YouTube Shorts Engaged Views, RPM & YPP compliance."
    )
    parser.add_argument("--daily-views", type=int, default=150_000)
    parser.add_argument("--vvsa", type=float, default=0.72)
    parser.add_argument("--duration", type=int, default=45)
    parser.add_argument("--apv", type=float, default=0.78)
    parser.add_argument("--tier", choices=sorted(AUDIENCE_RPM_CONFIG), default="tier1")
    parser.add_argument(
        "--music", choices=sorted(MUSIC_POOL_MULTIPLIER), default="original_or_royalty_free"
    )
    parser.add_argument(
        "--production", choices=sorted(VALID_PRODUCTION_TYPES), default="ai_assisted_original"
    )
    parser.add_argument("--realistic-ai", action="store_true")
    parser.add_argument("--ai-disclosed", action="store_true")
    parser.add_argument("--no-w8ben", action="store_true")
    parser.add_argument("--format", choices=["markdown", "json"], default="markdown")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_arg_parser().parse_args(argv)
    plan = AuditInput(
        daily_public_views=args.daily_views,
        vvsa_rate=args.vvsa,
        duration_seconds=args.duration,
        avg_percentage_viewed=args.apv,
        audience_tier=args.tier,
        music_source=args.music,
        production_type=args.production,
        realistic_ai_media=args.realistic_ai,
        ai_disclosed=args.ai_disclosed,
        w8ben_treaty_claimed=not args.no_w8ben,
    )
    result = audit_channel_plan(plan)
    if args.format == "json":
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    else:
        print(format_markdown_report(plan, result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
