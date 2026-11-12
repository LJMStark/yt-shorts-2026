import json
import subprocess
import sys
from dataclasses import FrozenInstanceError
from pathlib import Path

import pytest

SCRIPT_DIR = (
    Path(__file__).resolve().parent.parent
    / "skills"
    / "yt-shorts-2026"
    / "scripts"
)
sys.path.insert(0, str(SCRIPT_DIR))

from audit_shorts import (  # noqa: E402
    AuditInput,
    AuditResult,
    audit_channel_plan,
    format_markdown_report,
    main,
)


def make_default_input(**overrides) -> AuditInput:
    base = {
        "daily_public_views": 180_000,
        "vvsa_rate": 0.75,
        "duration_seconds": 45,
        "avg_percentage_viewed": 0.78,
        "audience_tier": "tier1",
        "music_source": "original_or_royalty_free",
        "production_type": "ai_assisted_original",
        "realistic_ai_media": False,
        "ai_disclosed": False,
        "w8ben_treaty_claimed": True,
    }
    return AuditInput(**{**base, **overrides})


def test_input_and_result_are_immutable():
    plan = make_default_input()
    result = audit_channel_plan(plan)

    with pytest.raises(FrozenInstanceError):
        plan.daily_public_views = 999  # type: ignore[misc]

    with pytest.raises(FrozenInstanceError):
        result.monetizable = False  # type: ignore[misc]


def test_compliant_tier1_plan_reaches_ypp_and_earns_full_share():
    plan = make_default_input(
        daily_public_views=200_000,
        vvsa_rate=0.76,
        duration_seconds=42,
        avg_percentage_viewed=0.80,
    )
    result = audit_channel_plan(plan)

    assert isinstance(result, AuditResult)
    assert result.monetizable is True
    assert result.distribution_tier == "viral_explore_pool"
    assert result.daily_engaged_views < plan.daily_public_views
    assert result.daily_engaged_views > 100_000
    assert result.can_reach_ypp_fan_in_90d is True
    assert result.can_reach_ypp_ads_in_90d is True
    assert result.days_to_ypp_ads <= 90
    assert result.monthly_net_usd > 300.0
    assert result.monthly_tax_leak_usd == 0.0
    assert all(r.severity != "BLOCKER" for r in result.risks)


def test_long_shorts_with_commercial_music_triggers_worldwide_block():
    plan = make_default_input(
        duration_seconds=95,
        music_source="shorts_commercial_1track",
    )
    result = audit_channel_plan(plan)

    assert result.monetizable is False
    assert result.monthly_net_usd == 0.0
    assert result.potential_monthly_net_usd > 0.0
    codes = {r.code for r in result.risks if r.severity == "BLOCKER"}
    assert "MUSIC_BLOCK_OVER_60S" in codes


def test_duration_over_180s_flagged_as_not_shorts():
    plan = make_default_input(duration_seconds=195)
    result = audit_channel_plan(plan)

    codes = {r.code for r in result.risks if r.severity == "BLOCKER"}
    assert "DURATION_EXCEEDS_SHORTS_LIMIT" in codes


@pytest.mark.parametrize(
    "bad_production",
    [
        "static_slideshow_ai",
        "reupload_fake_avatar",
        "tts_reddit_slop",
    ],
)
def test_inauthentic_content_policies_reject_ypp(bad_production: str):
    plan = make_default_input(production_type=bad_production)
    result = audit_channel_plan(plan)

    assert result.monetizable is False
    assert result.monthly_net_usd == 0.0
    codes = {r.code for r in result.risks if r.severity == "BLOCKER"}
    assert "INAUTHENTIC_CONTENT_YPP_REJECT" in codes


def test_undisclosed_realistic_ai_triggers_warning():
    plan = make_default_input(realistic_ai_media=True, ai_disclosed=False)
    result = audit_channel_plan(plan)

    codes = {r.code for r in result.risks if r.severity == "WARNING"}
    assert "UNDISCLOSED_SYNTHETIC_MEDIA" in codes


def test_disclosed_realistic_ai_has_no_disclosure_warning():
    plan = make_default_input(realistic_ai_media=True, ai_disclosed=True)
    result = audit_channel_plan(plan)

    codes = {r.code for r in result.risks}
    assert "UNDISCLOSED_SYNTHETIC_MEDIA" not in codes


def test_low_vvsa_rate_classified_as_dead_pool():
    plan = make_default_input(vvsa_rate=0.42, daily_public_views=50_000)
    result = audit_channel_plan(plan)

    assert result.distribution_tier == "dead_pool"
    codes = {r.code for r in result.risks if r.severity == "WARNING"}
    assert "VVSA_BELOW_SURVIVAL_LINE" in codes


def test_missing_w8ben_causes_us_tax_withholding_leak():
    with_treaty = audit_channel_plan(make_default_input(w8ben_treaty_claimed=True))
    without_treaty = audit_channel_plan(make_default_input(w8ben_treaty_claimed=False))

    assert without_treaty.monthly_tax_leak_usd > 0.0
    assert without_treaty.monthly_net_usd < with_treaty.monthly_net_usd
    codes = {r.code for r in without_treaty.risks if r.severity == "WARNING"}
    assert "W8BEN_TAX_LEAK" in codes


def test_commercial_music_under_60s_halves_creator_pool():
    royalty_free = audit_channel_plan(
        make_default_input(duration_seconds=45, music_source="original_or_royalty_free")
    )
    one_track = audit_channel_plan(
        make_default_input(duration_seconds=45, music_source="shorts_commercial_1track")
    )

    assert one_track.monetizable is True
    assert one_track.monthly_net_usd == pytest.approx(
        royalty_free.monthly_net_usd * 0.5, rel=0.02
    )


def test_validation_rejects_invalid_inputs():
    with pytest.raises(ValueError, match="vvsa_rate"):
        audit_channel_plan(make_default_input(vvsa_rate=1.2))

    with pytest.raises(ValueError, match="audience_tier"):
        audit_channel_plan(make_default_input(audience_tier="mars"))


def test_cli_json_and_markdown_output():
    script_path = SCRIPT_DIR / "audit_shorts.py"
    proc = subprocess.run(
        [
            sys.executable,
            str(script_path),
            "--daily-views",
            "150000",
            "--vvsa",
            "0.74",
            "--duration",
            "50",
            "--apv",
            "0.75",
            "--tier",
            "tier1",
            "--format",
            "json",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    payload = json.loads(proc.stdout)
    assert payload["monetizable"] is True
    assert payload["daily_engaged_views"] > 0

    md = format_markdown_report(make_default_input(), audit_channel_plan(make_default_input()))
    assert "Engaged Views" in md
    assert "YPP" in md


def test_main_direct_invocation_and_edge_branches(capsys):
    rc = main(
        [
            "--daily-views",
            "80000",
            "--vvsa",
            "0.62",
            "--duration",
            "35",
            "--apv",
            "0.50",
            "--music",
            "unlicensed_bgm",
            "--no-w8ben",
            "--format",
            "markdown",
        ]
    )
    assert rc == 0
    out = capsys.readouterr().out
    assert "UNLICENSED_BGM_CLAIM" in out
    assert "W-8BEN" in out

    zero_plan = make_default_input(daily_public_views=0, vvsa_rate=0.75, avg_percentage_viewed=0.40)
    zero_res = audit_channel_plan(zero_plan)
    assert zero_res.days_to_ypp_ads == 9999
    assert zero_res.distribution_tier == "hook_strong_retention_weak"

