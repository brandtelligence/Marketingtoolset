/**
 * TenantAIBudgetCard — Read-only AI token budget gauge for the Tenant Admin.
 *
 * Placed at the top of the AI Content Studio section in TenantUsagePage.
 * Intentionally read-only — limit changes are a Super Admin capability.
 *
 * Visual structure:
 *   ┌──────────────────────────────────────────┐
 *   │  [Header strip — title, period, badges]  │
 *   ├──────────────────────────────────────────┤
 *   │  [SVG arc gauge]  │  [Stats 2×3 grid]    │
 *   ├──────────────────────────────────────────┤
 *   │  [Alert / nudge banner  (if needed)]     │
 *   ├──────────────────────────────────────────┤
 *   │  [Footer — period · days remaining]      │
 *   └──────────────────────────────────────────┘
 */

import { useMemo } from 'react';
import {
  Sparkles, Zap, Calendar, TrendingUp, AlertTriangle, Mail, Info,
} from 'lucide-react';
import { type TenantAIBudget } from '../../utils/apiClient';
import { useDashboardTheme } from './DashboardThemeContext';

// ─── Gauge geometry ───────────────────────────────────────────────────────────

const R        = 75;                             // arc radius
const CX       = 100;
const CY       = 100;
const CIRC     = 2 * Math.PI * R;               // ≈ 471.24
const ARC_DEG  = 240;                            // visible sweep  (240° = "speedometer")
const FULL_ARC = CIRC * (ARC_DEG / 360);        // ≈ 314.16
const GAP_ARC  = CIRC - FULL_ARC;               // ≈ 157.08  (the bottom 120° notch)
const ROTATE   = 150;                            // start at bottom-left  (150° from 3 o'clock)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function fmtN(n: number): string {
  return n.toLocaleString('en-MY');
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  budget:   TenantAIBudget;
  loading?: boolean;
}

export function TenantAIBudgetCard({ budget, loading }: Props) {
  const th = useDashboardTheme();

  // ── Gauge colours ──────────────────────────────────────────────────────────
  const pct        = Math.min((budget.tokensUsed / budget.limit) * 100, 100);
  const gaugeColor = pct > 85 ? '#ef4444' : pct > 65 ? '#F47A20' : '#0BA4AA';
  const trackColor = th.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const usedLen    = FULL_ARC * (pct / 100);

  // ── Burn-rate projections (computed once per render) ──────────────────────
  const {
    dailyBurn, daysRemaining, projectedTotal,
    projectedPct, projWillExceed, monthLabel,
  } = useMemo(() => {
    const now          = new Date();
    const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth   = Math.max(now.getDate(), 1);
    const daysRemain   = Math.max(0, daysInMonth - dayOfMonth);
    const daily        = Math.round(budget.tokensUsed / dayOfMonth);
    const projected    = budget.tokensUsed + daily * daysRemain;
    const projPct      = Math.min((projected / budget.limit) * 100, 100);
    const label        = now.toLocaleString('en-MY', { month: 'long', year: 'numeric' });
    return {
      dailyBurn:       daily,
      daysRemaining:   daysRemain,
      projectedTotal:  projected,
      projectedPct:    projPct,
      projWillExceed:  projected > budget.limit,
      monthLabel:      label,
    };
  }, [budget]);

  const tokensRemaining = Math.max(0, budget.limit - budget.tokensUsed);
  const projColor       = projWillExceed ? '#ef4444' : projectedPct > 85 ? '#F47A20' : '#10b981';

  // ── Stats grid data ────────────────────────────────────────────────────────
  const stats = [
    {
      label: 'Tokens Used',
      value: fmtN(budget.tokensUsed),
      color: gaugeColor,
      sub:   undefined as string | undefined,
    },
    {
      label: 'Monthly Limit',
      value: fmtN(budget.limit),
      color: undefined as string | undefined,
      sub:   budget.isCustom ? `Default: ${fmtK(budget.defaultLimit)}` : 'Platform default',
    },
    {
      label: 'Remaining',
      value: fmtK(tokensRemaining),
      color: undefined,
      sub:   `${(100 - pct).toFixed(0)}% of budget left`,
    },
    {
      label: 'Requests',
      value: String(budget.requests),
      color: undefined,
      sub:   'generations this month',
    },
    {
      label: 'Daily Burn Rate',
      value: `${fmtK(dailyBurn)}/day`,
      color: undefined,
      sub:   undefined,
    },
    {
      label: daysRemaining === 0 ? 'Projected (end today)' : 'Projected EOMonth',
      value: fmtK(projectedTotal),
      color: projColor,
      sub:   projWillExceed
        ? `⚠ +${fmtK(projectedTotal - budget.limit)} over limit`
        : `${daysRemaining}d remaining`,
    },
  ];

  return (
    <div className={`rounded-2xl border ${th.border} overflow-hidden`}
      style={{ background: th.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>

      {/* ── Header strip ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{
          borderColor: 'rgba(11,164,170,0.2)',
          background: 'rgba(11,164,170,0.05)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(11,164,170,0.12)', border: '1px solid rgba(11,164,170,0.25)' }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#0BA4AA' }} />
          </div>
          <div>
            <p className={`${th.text} text-sm font-semibold leading-tight`}>
              Monthly AI Token Budget
            </p>
            <p className={`${th.textFaint} text-xs`}>{monthLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <span className="w-4 h-4 rounded-full border-2 border-[#0BA4AA] border-t-transparent animate-spin" />
          )}

          {/* Custom vs default badge */}
          {budget.isCustom ? (
            <span
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
              style={{
                background:   'rgba(62,60,112,0.12)',
                borderColor:  'rgba(62,60,112,0.35)',
                color:        '#a78bfa',
              }}
            >
              <Zap className="w-2.5 h-2.5" />
              Custom limit
            </span>
          ) : (
            <span
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
              style={{
                background:   th.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                borderColor:  th.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                color:        th.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
              }}
            >
              <Info className="w-2.5 h-2.5" />
              Platform default
            </span>
          )}
        </div>
      </div>

      {/* ── Gauge + stats ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-6 px-5 py-6">

        {/* Circular arc gauge */}
        <div className="relative flex-shrink-0">
          <svg viewBox="0 0 200 165" width="192" height="158">
            {/* Soft glow halo behind the used arc */}
            {pct > 0 && (
              <circle
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={gaugeColor}
                strokeWidth="22"
                strokeOpacity="0.10"
                strokeDasharray={`${usedLen} ${CIRC - usedLen}`}
                transform={`rotate(${ROTATE}, ${CX}, ${CY})`}
              />
            )}

            {/* Track arc — full 240° in muted gray */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={trackColor}
              strokeWidth="14"
              strokeDasharray={`${FULL_ARC} ${GAP_ARC}`}
              strokeLinecap="round"
              transform={`rotate(${ROTATE}, ${CX}, ${CY})`}
            />

            {/* Used arc — colored */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={gaugeColor}
              strokeWidth="14"
              strokeDasharray={`${usedLen} ${CIRC - usedLen}`}
              strokeLinecap="round"
              transform={`rotate(${ROTATE}, ${CX}, ${CY})`}
            />

            {/* Tick marks at 0%, 25%, 50%, 75%, 100% of the arc */}
            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
              // angle in radians from SVG x-axis: rotate start + arc fraction
              const angleDeg = ROTATE + f * ARC_DEG;
              const angleRad = (angleDeg * Math.PI) / 180;
              const inner = R - 10;
              const outer = R + 2;
              return (
                <line
                  key={i}
                  x1={CX + inner * Math.cos(angleRad)}
                  y1={CY + inner * Math.sin(angleRad)}
                  x2={CX + outer * Math.cos(angleRad)}
                  y2={CY + outer * Math.sin(angleRad)}
                  stroke={gaugeColor}
                  strokeOpacity={f === 0 || f === 1 ? 0.6 : 0.25}
                  strokeWidth={f === 0 || f === 1 ? 2 : 1}
                />
              );
            })}
          </svg>

          {/* Center text overlay — HTML for theme-aware colours */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pb-5">
            <p
              className={`${th.text} font-bold leading-none tabular-nums`}
              style={{ fontSize: '1.6rem' }}
            >
              {fmtK(budget.tokensUsed)}
            </p>
            <p className={`${th.textFaint} text-xs mt-0.5`}>of {fmtK(budget.limit)}</p>
            <p
              className="text-sm font-bold mt-1.5 tabular-nums"
              style={{ color: gaugeColor }}
            >
              {pct.toFixed(1)}%
            </p>
          </div>

          {/* 0% / 100% arc endpoint labels */}
          <span
            className={`absolute text-[9px] font-medium tabular-nums`}
            style={{
              color: th.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
              bottom: '14px', left: '16px',
            }}
          >
            0%
          </span>
          <span
            className={`absolute text-[9px] font-medium tabular-nums`}
            style={{
              color: th.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
              bottom: '14px', right: '16px',
            }}
          >
            100%
          </span>
        </div>

        {/* Stats grid 2×3 */}
        <div className="flex-1 grid grid-cols-2 gap-2.5 w-full">
          {stats.map(item => (
            <div
              key={item.label}
              className={`${th.s1} rounded-xl p-3 border ${th.border}`}
            >
              <p className={`${th.textFaint} text-[10px] uppercase tracking-wider mb-1 leading-none`}>
                {item.label}
              </p>
              <p
                className={`text-sm font-bold tabular-nums leading-tight ${!item.color ? th.text : ''}`}
                style={item.color ? { color: item.color } : undefined}
              >
                {item.value}
              </p>
              {item.sub && (
                <p className={`${th.textFaint} text-[10px] mt-0.5 leading-tight`}>
                  {item.sub}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Alert banners ─────────────────────────────────────────────────── */}

      {/* Critical: > 85% */}
      {pct > 85 && (
        <div
          className="flex items-start gap-3 mx-5 mb-5 px-4 py-3 rounded-xl border"
          style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}
        >
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-red-400 text-xs font-semibold">
              Token budget nearly exhausted
            </p>
            <p className={`${th.textFaint} text-xs mt-0.5`}>
              {pct.toFixed(0)}% used — {fmtN(tokensRemaining)} tokens remain. Contact your
              Brandtelligence account manager to increase your monthly limit before AI
              content generation is paused.
            </p>
          </div>
          <a
            href="mailto:support@brandtelligence.my"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-opacity hover:opacity-80"
            style={{
              background:  'rgba(239,68,68,0.15)',
              color:       '#fca5a5',
              border:      '1px solid rgba(239,68,68,0.3)',
            }}
          >
            <Mail className="w-3 h-3" />
            Contact us
          </a>
        </div>
      )}

      {/* Warning: 65–85% */}
      {pct > 65 && pct <= 85 && (
        <div
          className="flex items-center gap-3 mx-5 mb-5 px-4 py-2.5 rounded-xl border"
          style={{ background: 'rgba(244,122,32,0.06)', borderColor: 'rgba(244,122,32,0.2)' }}
        >
          <TrendingUp className="w-4 h-4 shrink-0" style={{ color: '#F47A20' }} />
          <p className="text-xs" style={{ color: '#F47A20' }}>
            <span className="font-semibold">Moderate usage</span> —{' '}
            {fmtN(tokensRemaining)} tokens remaining this month.
            {projWillExceed && ' At this burn rate, your quota may be exceeded before month end.'}
            {!projWillExceed && ` Projected month-end usage: ${fmtK(projectedTotal)} tokens.`}
          </p>
        </div>
      )}

      {/* ── Footer strip ──────────────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between px-5 py-2.5 border-t ${th.border}`}
        style={{ background: th.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}
      >
        <div className="flex items-center gap-1.5">
          <Calendar className={`w-3 h-3 ${th.textFaint}`} />
          <span className={`${th.textFaint} text-xs`}>Period: {budget.period}</span>
        </div>
        <span className={`${th.textFaint} text-xs`}>
          {daysRemaining === 0
            ? 'Last day of billing period'
            : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
        </span>
      </div>
    </div>
  );
}
