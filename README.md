# yt-shorts-2026

**2026 YouTube Shorts Algorithm, Engaged Views Ledger & YPP Compliance Agent Skill**

Live Interactive Calculator & Compliance Auditor: **https://yt-shorts-2026.xiaoyouzi2010.workers.dev**

---

## Install Agent Skill (Claude Code / Codex / Cursor / Antigravity)

```bash
npx -y skills add LJMStark/yt-shorts-2026 -g --all
```

Or install into the current workspace only:

```bash
npx -y skills add LJMStark/yt-shorts-2026
```

---

## Core 2026 Rules & High-Frequency Pitfalls

Understanding YouTube's current monetization and ranking mechanics prevents zero-revenue channels and instant global blocks:

| Dimension | High-Frequency Creator Pitfall | 2026 Verified Platform Standard |
| :--- | :--- | :--- |
| **View Counting & YPP** | Hit 10M public views in 90 days to unlock ad share. | Since **March 31, 2025**, public `Views` count every start/loop without a minimum watch threshold. YPP eligibility (3M / 10M) and ad payouts rely **100% on `Engaged Views`** inside Studio Advanced Analytics. |
| **AI & YPP Review** | Generate 25 static AI pet images with pan/zoom transitions or slap a corner avatar on reuploads. | Since **July 15, 2025**, YouTube upgraded Repetitious Content into **`Inauthentic Content`**, rejecting mass-produced static slideshows, fake animal rescues, and unedited TTS-over-gameplay slop. |
| **1-3 Min Shorts Music** | Extract BGM from viral channels or attach commercial pop songs to 2-minute Shorts. | Vertical/square videos up to **180s** qualify as Shorts, but **61-180s Shorts with any active Content ID music claim are Blocked Worldwide** ($0 revenue, zero impressions). |
| **Feed Ranking Gate** | Optimize thumbnail CTR and keyword stuffing in tags. | The Shorts feed has no thumbnail CTR. Gate #1 is **`Viewed vs. Swiped Away` (`VVSA >= 70%`)**; Gate #2 is duration-adjusted **APV / Loop rate** (`>=85%` under 30s, `>=55%` over 60s). |
| **Multi-Language Scale** | Manually run 6 separate regional channels with external TTS re-uploads. | Native Gemini-powered **YouTube Auto-Dubbing** attaches multi-language audio tracks (ES, PT, DE, JA, FR) onto a single flagship video, consolidating global `Engaged Views`. |

---

## What Is Included

```text
yt-shorts-2026/
├── skills/yt-shorts-2026/
│   ├── SKILL.md                                     # Core Agent Skill workflows & routing
│   ├── scripts/audit_shorts.py                      # Deterministic Engaged Views, RPM & YPP auditor CLI
│   └── references/
│       ├── 01-algorithm-and-engaged-views.md        # VVSA gates, Views vs Engaged Views, Auto-Dubbing
│       ├── 02-ypp-inauthentic-and-copyright.md      # July 2025 Inauthentic Content, synthetic labels, 61-180s music block
│       ├── 03-niche-and-script-playbook.md          # 4-Green benchmark method & Forward/Reverse script engineering
│       └── 04-adsense-tax-and-payout.md             # 45% Creator Pool math, AdSense PIN address trick & W-8BEN 0% treaty
├── web/                                             # Single-page interactive ledger (bilingual ZH/EN)
├── src/worker.js                                    # Cloudflare Worker edge static server + /api/audit JSON endpoint
└── tests/test_audit_shorts.py                       # Pytest suite (96% coverage)
```

---

## Deterministic CLI Usage

Run the zero-dependency Python auditor directly to inspect `Engaged Views` conversion, 90-day YPP countdown, 45% net revenue after music pool deductions, W-8BEN tax leakage, and policy blockers:

```bash
python3 skills/yt-shorts-2026/scripts/audit_shorts.py \
  --daily-views 200000 \
  --vvsa 0.76 \
  --duration 45 \
  --apv 0.82 \
  --tier tier1 \
  --music original_or_royalty_free \
  --production ai_assisted_original \
  --format markdown
```

JSON output for automated agent pipelines:

```bash
python3 skills/yt-shorts-2026/scripts/audit_shorts.py --daily-views 200000 --vvsa 0.76 --format json
```

## Edge JSON API

```bash
curl "https://yt-shorts-2026.xiaoyouzi2010.workers.dev/api/audit?dailyViews=200000&vvsa=0.76&duration=45&apv=0.82&tier=tier1"
```

## Run Tests & Deploy Your Own Worker

```bash
uv run --with pytest --with pytest-cov pytest --cov=skills/yt-shorts-2026/scripts
npx wrangler deploy
```

## License

MIT
