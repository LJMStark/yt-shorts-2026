const AUDIENCE_RPM = Object.freeze({
  tier1: { base: 0.14, usShare: 0.60 },
  mixed: { base: 0.06, usShare: 0.35 },
  tier3: { base: 0.015, usShare: 0.10 },
});

const MUSIC_MULT = Object.freeze({
  original_or_royalty_free: 1.0,
  shorts_commercial_1track: 0.5,
  shorts_commercial_2tracks: 0.33,
  unlicensed_bgm: 0.0,
});

const INAUTHENTIC_SET = new Set([
  "static_slideshow_ai",
  "reupload_fake_avatar",
  "tts_reddit_slop",
]);

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function addSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function computeEdgeAudit(params) {
  const dailyViews = Math.max(0, Number(params.dailyViews ?? 180000));
  const vvsa = clamp(Number(params.vvsa ?? 0.75), 0, 1);
  const duration = Math.max(1, Number(params.duration ?? 45));
  const apv = clamp(Number(params.apv ?? 0.8), 0.05, 3.0);
  const tier = AUDIENCE_RPM[params.tier] ? params.tier : "tier1";
  const music = MUSIC_MULT[params.music] !== undefined ? params.music : "original_or_royalty_free";
  const production = String(params.production ?? "ai_assisted_original");
  const w8ben = params.w8ben !== "false" && params.w8ben !== false;

  const retentionFactor = Math.min(1.0, 0.65 + apv * 0.35);
  const engagedRatio = Number(clamp(vvsa * retentionFactor, 0.15, 0.95).toFixed(4));
  const dailyEngaged = Math.round(dailyViews * engagedRatio);
  const ninetyDayEngaged = dailyEngaged * 90;

  const blockers = [];
  if (duration > 180) blockers.push("DURATION_EXCEEDS_SHORTS_LIMIT");
  if (duration > 60 && music !== "original_or_royalty_free") blockers.push("MUSIC_BLOCK_OVER_60S");
  if (music === "unlicensed_bgm") blockers.push("UNLICENSED_BGM_CLAIM");
  if (INAUTHENTIC_SET.has(production)) blockers.push("INAUTHENTIC_CONTENT_YPP_REJECT");

  const monetizable = blockers.length === 0;
  const rpmCfg = AUDIENCE_RPM[tier];
  const musicMult = MUSIC_MULT[music];
  const taxKeep = w8ben ? 1.0 : 1.0 - rpmCfg.usShare * 0.3;
  const monthlyNetUsd = monetizable
    ? Number((((dailyEngaged * 30) / 1000) * rpmCfg.base * musicMult * taxKeep).toFixed(2))
    : 0;

  return {
    version: "2026.11",
    monetizable,
    engagedRatio,
    dailyEngagedViews: dailyEngaged,
    ninetyDayEngagedViews: ninetyDayEngaged,
    canReachYppAds90d: monetizable && ninetyDayEngaged >= 10000000,
    monthlyNetUsd,
    blockers,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return addSecurityHeaders(
        Response.json({ ok: true, service: "yt-shorts-2026", version: "2026.11" })
      );
    }

    if (url.pathname === "/api/audit") {
      let payload = Object.fromEntries(url.searchParams.entries());
      if (request.method === "POST") {
        try {
          payload = { ...payload, ...(await request.json()) };
        } catch {
          return addSecurityHeaders(
            Response.json({ error: "Invalid JSON payload" }, { status: 400 })
          );
        }
      }
      return addSecurityHeaders(Response.json(computeEdgeAudit(payload)));
    }

    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      return addSecurityHeaders(assetRes);
    }

    return addSecurityHeaders(new Response("Not Found", { status: 404 }));
  },
};
