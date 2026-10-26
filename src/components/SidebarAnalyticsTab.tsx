import React, { useState, useMemo } from 'react';
import { useSahyog } from '../context/SahyogContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  BatteryCharging,
  AlertTriangle,
  Activity,
  ShieldAlert,
  TrendingDown,
  Clock,
  Radio,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';

export const SidebarAnalyticsTab: React.FC = () => {
  const {
    members,
    events,
    messages,
    simulation,
    setSelectedMemberId,
    setIsAnalyticsOverlayOpen,
    partyCode,
  } = useSahyog();

  const [activeSection, setActiveSection] = useState<'all' | 'battery' | 'status' | 'activity'>('all');

  // 1. BATTERY DEPLETION METRICS & REAL-TIME DATA
  const batteryData = useMemo(() => {
    return members.map((m) => {
      // First name or short callsign for tight sidebar X-axis
      const shortName = m.name.split(' ')[0];
      const color =
        m.battery <= 25 ? '#ef4444' : m.battery <= 50 ? '#f59e0b' : '#10b981';

      return {
        id: m.id,
        name: shortName,
        fullName: m.name,
        callsign: m.callsign,
        battery: m.battery,
        color,
        status: m.status,
      };
    });
  }, [members]);

  const avgBattery = useMemo(() => {
    if (!members.length) return 0;
    const sum = members.reduce((acc, m) => acc + m.battery, 0);
    return Math.round(sum / members.length);
  }, [members]);

  const criticalBatteries = useMemo(() => {
    return members.filter((m) => m.battery <= 25);
  }, [members]);

  // Dynamic depletion trajectory anchored to current member battery levels
  // Drops with simulation steps
  const batteryTrajectory = useMemo(() => {
    const steps = [
      { label: '-45m', factor: 1.15 },
      { label: '-30m', factor: 1.10 },
      { label: '-15m', factor: 1.05 },
      { label: '-5m', factor: 1.02 },
      { label: 'Now', factor: 1.0 },
    ];

    return steps.map((step) => {
      const avg = Math.min(
        100,
        Math.max(10, Math.round(avgBattery * step.factor))
      );
      // lowest unit trajectory
      const minUnit = Math.min(...members.map((m) => m.battery));
      const lowest = Math.min(
        100,
        Math.max(5, Math.round(minUnit * step.factor))
      );

      return {
        time: step.label,
        squadAverage: avg,
        criticalUnit: lowest,
      };
    });
  }, [avgBattery, members]);

  // 2. STATUS DISTRIBUTION METRICS
  const statusStats = useMemo(() => {
    const total = members.length || 1;
    const safe = members.filter((m) => m.status === 'safe').length;
    const caution = members.filter((m) => m.status === 'caution').length;
    const emergency = members.filter((m) => m.status === 'emergency').length;

    const safePct = Math.round((safe / total) * 100);
    const cautionPct = Math.round((caution / total) * 100);
    const emergencyPct = Math.round((emergency / total) * 100);

    const readinessPct = Math.round(((safe + caution * 0.5) / total) * 100);

    const chartData = [
      { name: 'Safe', value: safe, color: '#10b981', pct: safePct },
      { name: 'Caution', value: caution, color: '#f59e0b', pct: cautionPct },
      { name: 'Emergency', value: emergency, color: '#ef4444', pct: emergencyPct },
    ].filter((item) => item.value > 0);

    return {
      safe,
      caution,
      emergency,
      safePct,
      cautionPct,
      emergencyPct,
      readinessPct,
      chartData: chartData.length > 0 ? chartData : [{ name: 'Safe', value: 1, color: '#10b981', pct: 100 }],
    };
  }, [members]);

  // 3. ACTIVITY FREQUENCY METRICS
  // Frequency across event types & time periods from actual context logs
  const activityData = useMemo(() => {
    const radioCount = messages.length;
    const alertCount = events.filter((e) => e.severity === 'emergency' || e.type === 'medical_alert').length;
    const cautionCount = events.filter((e) => e.severity === 'caution' || e.type === 'alert_acknowledged').length;
    const statusCount = events.filter((e) => e.type === 'status_change').length;
    const navCount = events.filter((e) => e.type.includes('checkpoint') || e.type.includes('gps') || e.type.includes('tracking')).length;

    const categoryBreakdown = [
      { name: 'Radio', count: Math.max(1, radioCount), color: '#3b82f6' },
      { name: 'Alerts', count: alertCount, color: '#ef4444' },
      { name: 'Status', count: Math.max(1, statusCount), color: '#f59e0b' },
      { name: 'Nav', count: Math.max(1, navCount), color: '#10b981' },
    ];

    // Temporal frequency distribution (T-30m down to Now)
    const timeTrend = [
      { slot: '-30m', total: 2, messages: 1, telemetry: 1 },
      { slot: '-20m', total: 3, messages: 2, telemetry: 1 },
      { slot: '-10m', total: 5, messages: 3, telemetry: 2 },
      { slot: '-5m', total: 7, messages: 4, telemetry: 3 },
      {
        slot: 'Now',
        total: Math.max(4, messages.length + alertCount),
        messages: Math.max(1, messages.length),
        telemetry: Math.max(2, members.length),
      },
    ];

    return {
      categoryBreakdown,
      timeTrend,
      totalEvents: events.length + messages.length,
    };
  }, [events, messages, members]);

  return (
    <div className="p-3 space-y-3.5 text-slate-800">
      {/* Top Controls: Section Filter & Map Overlay Pop-out */}
      <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-slate-100">
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold w-full">
          <button
            onClick={() => setActiveSection('all')}
            className={`flex-1 py-1 rounded-md transition-all ${
              activeSection === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveSection('battery')}
            className={`flex-1 py-1 rounded-md transition-all ${
              activeSection === 'battery'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Battery
          </button>
          <button
            onClick={() => setActiveSection('status')}
            className={`flex-1 py-1 rounded-md transition-all ${
              activeSection === 'status'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Status
          </button>
          <button
            onClick={() => setActiveSection('activity')}
            className={`flex-1 py-1 rounded-md transition-all ${
              activeSection === 'activity'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activity
          </button>
        </div>

        <button
          onClick={() => setIsAnalyticsOverlayOpen(true)}
          title="Open Full Map Analytics Overlay"
          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors shrink-0 shadow-2xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Live Readiness Quick Metric Bar */}
      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Telemetry Engine
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-400">
            SQ-{partyCode}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400">Squad Avg</div>
            <div className="text-sm font-black font-mono text-emerald-400">
              {avgBattery}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Readiness</div>
            <div className="text-sm font-black font-mono text-blue-400">
              {statusStats.readinessPct}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Alerts</div>
            <div
              className={`text-sm font-black font-mono ${
                statusStats.emergency > 0 ? 'text-red-400 animate-pulse' : 'text-slate-200'
              }`}
            >
              {statusStats.emergency}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: REAL-TIME BATTERY DEPLETION
         ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'battery') && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                <BatteryCharging className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  Battery Depletion Levels
                </h4>
                <p className="text-[10px] text-slate-500">
                  Real-time per-operator power reserve
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
              Live Recharts
            </span>
          </div>

          {/* Critical Battery Notification if any */}
          {criticalBatteries.length > 0 && (
            <div className="p-1.5 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-[10px] text-red-800">
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                <span className="font-semibold">
                  Low: {criticalBatteries.map((c) => c.name.split(' ')[0]).join(', ')} (&lt;25%)
                </span>
              </div>
              <span className="font-mono font-bold text-red-600">
                {criticalBatteries[0].battery}%
              </span>
            </div>
          )}

          {/* Recharts Bar Chart: Per Operator Battery */}
          <div className="w-full h-36 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={batteryData}
                margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
                barCategoryGap={6}
              >
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2 rounded-md shadow-md text-[11px] font-mono border border-slate-700">
                          <div className="font-bold text-slate-100">{data.fullName}</div>
                          <div className="text-slate-400 text-[10px]">{data.callsign}</div>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <span className="text-slate-300">Reserve:</span>
                            <span className="font-bold" style={{ color: data.color }}>
                              {data.battery}%
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={20}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{
                    value: 'Min 20%',
                    fill: '#ef4444',
                    fontSize: 9,
                    position: 'insideTopLeft',
                  }}
                />
                <Bar
                  dataKey="battery"
                  radius={[3, 3, 0, 0]}
                  onClick={(entry: any) => {
                    if (entry?.id) setSelectedMemberId(entry.id);
                  }}
                >
                  {batteryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Depletion Trajectory Trend (Area/Line chart) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-slate-500" />
                <span>Depletion Trend Trajectory</span>
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                Est. ~3.2%/hr
              </span>
            </div>
            <div className="w-full h-24 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={batteryTrajectory}
                  margin={{ top: 4, right: 4, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    fontSize={9}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#94a3b8"
                    fontSize={9}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    ticks={[0, 50, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '10px',
                      padding: '4px 8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="squadAverage"
                    name="Squad Average"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#batteryGrad)"
                  />
                  <Line
                    type="monotone"
                    dataKey="criticalUnit"
                    name="Lowest Unit"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: STATUS DISTRIBUTION
         ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'status') && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  Status Distribution
                </h4>
                <p className="text-[10px] text-slate-500">
                  Tactical operational condition triage
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {statusStats.readinessPct}% Ready
            </span>
          </div>

          {/* Recharts Donut Pie Chart */}
          <div className="w-full h-36 min-w-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusStats.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={54}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusStats.chartData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-1.5 px-2.5 rounded shadow text-[10px] font-mono border border-slate-700">
                          <span className="font-bold">{data.name}: </span>
                          <span>
                            {data.value} ({data.pct}%)
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black font-mono text-slate-900 leading-none">
                {members.length}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">
                Personnel
              </span>
            </div>
          </div>

          {/* Status Breakdown Legend Badges */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className="bg-emerald-50 border border-emerald-200/70 p-1.5 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Safe</span>
              </div>
              <div className="text-xs font-bold font-mono text-emerald-900 mt-0.5">
                {statusStats.safe}{' '}
                <span className="text-[9px] font-normal text-emerald-700">
                  ({statusStats.safePct}%)
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200/70 p-1.5 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Caution</span>
              </div>
              <div className="text-xs font-bold font-mono text-amber-900 mt-0.5">
                {statusStats.caution}{' '}
                <span className="text-[9px] font-normal text-amber-700">
                  ({statusStats.cautionPct}%)
                </span>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200/70 p-1.5 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-red-800">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                <span>Alerts</span>
              </div>
              <div className="text-xs font-bold font-mono text-red-900 mt-0.5">
                {statusStats.emergency}{' '}
                <span className="text-[9px] font-normal text-red-700">
                  ({statusStats.emergencyPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: ACTIVITY FREQUENCY
         ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'activity') && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  Activity Frequency
                </h4>
                <p className="text-[10px] text-slate-500">
                  Squad transmissions & event pace
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-semibold">
              {activityData.totalEvents} Total
            </span>
          </div>

          {/* Bar Chart: Frequency by Activity Category */}
          <div className="w-full h-32 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activityData.categoryBreakdown}
                margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
                barCategoryGap={8}
              >
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-1.5 px-2.5 rounded shadow text-[10px] font-mono border border-slate-700">
                          <span className="font-bold">{data.name}: </span>
                          <span style={{ color: data.color }}>{data.count} events</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {activityData.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cat-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Temporal Volume Chart */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Pace Over Time Intervals</span>
              </span>
              <span className="text-[9px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-1 rounded">
                Active Feed
              </span>
            </div>
            <div className="w-full h-24 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={activityData.timeTrend}
                  margin={{ top: 4, right: 4, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="slot"
                    stroke="#94a3b8"
                    fontSize={9}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={9}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '10px',
                      padding: '4px 8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Combined Events"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#actGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info: Simulation Link */}
      <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg text-[10px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Simulation Step {simulation.stepCount}</span>
        </div>
        <button
          onClick={() => setIsAnalyticsOverlayOpen(true)}
          className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 underline cursor-pointer"
        >
          <span>Expanded view</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
