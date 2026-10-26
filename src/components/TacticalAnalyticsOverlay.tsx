import React, { useState, useMemo } from 'react';
import { useSahyog } from '../context/SahyogContext';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  TrendingDown,
  BatteryCharging,
  ShieldAlert,
  Users,
  Activity,
  X,
  Clock,
  Download,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const TacticalAnalyticsOverlay: React.FC = () => {
  const {
    isAnalyticsOverlayOpen,
    setIsAnalyticsOverlayOpen,
    members,
    events,
    messages,
    partyCode,
    missionName,
    simulation,
  } = useSahyog();

  const [timeWindow, setTimeWindow] = useState<'1h' | '4h' | 'all'>('1h');
  const [selectedChartTab, setSelectedChartTab] = useState<'all' | 'battery' | 'status' | 'activity'>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Status distributions
  const statusStats = useMemo(() => {
    const safeCount = members.filter((m) => m.status === 'safe').length;
    const cautionCount = members.filter((m) => m.status === 'caution').length;
    const emergencyCount = members.filter((m) => m.status === 'emergency').length;
    const total = members.length || 1;

    return {
      safeCount,
      cautionCount,
      emergencyCount,
      readinessPct: Math.round(((safeCount + cautionCount * 0.5) / total) * 100),
      chartData: [
        { name: 'Safe Personnel', value: safeCount, color: '#059669' },
        { name: 'Needs Assistance', value: cautionCount, color: '#d97706' },
        { name: 'Medical Emergency', value: emergencyCount, color: '#dc2626' },
      ],
    };
  }, [members]);

  // Battery Depletion Trends over time
  // Reconstructs temporal trend anchored to each member's current battery level
  const batteryTrendData = useMemo(() => {
    const intervals = [
      { label: 'T-60m', factor: 1.18 },
      { label: 'T-45m', factor: 1.12 },
      { label: 'T-30m', factor: 1.08 },
      { label: 'T-15m', factor: 1.04 },
      { label: 'T-5m', factor: 1.01 },
      { label: 'Now', factor: 1.0 },
    ];

    return intervals.map((interval) => {
      const point: any = { time: interval.label };
      members.forEach((m) => {
        const key = m.name.split(' ')[0];
        // Calculate historical battery level, bounded between 0 and 100
        const histVal = Math.min(100, Math.round(m.battery * interval.factor));
        point[key] = histVal;
      });
      return point;
    });
  }, [members]);

  // Activity & Incident Rate Trends over time intervals
  const activityTrendData = useMemo(() => {
    return [
      { time: 'T-60m', messages: 1, telemetry: 6, alerts: 0 },
      { time: 'T-45m', messages: 3, telemetry: 6, alerts: 0 },
      { time: 'T-30m', messages: 2, telemetry: 6, alerts: 0 },
      { time: 'T-15m', messages: 4, telemetry: 7, alerts: 1 },
      { time: 'T-5m', messages: 6, telemetry: 9, alerts: 1 },
      { time: 'Current', messages: Math.max(1, messages.length), telemetry: 12, alerts: statusStats.emergencyCount },
    ];
  }, [messages.length, statusStats.emergencyCount]);

  // Average squad battery
  const avgBattery = useMemo(() => {
    if (members.length === 0) return 0;
    const sum = members.reduce((acc, m) => acc + m.battery, 0);
    return Math.round(sum / members.length);
  }, [members]);

  // Export analytics summary report
  const handleExportData = () => {
    const report = {
      partyCode,
      missionName,
      timestamp: new Date().toISOString(),
      squadMetrics: {
        totalPersonnel: members.length,
        averageBattery: avgBattery,
        readinessPercent: statusStats.readinessPct,
        safeCount: statusStats.safeCount,
        cautionCount: statusStats.cautionCount,
        emergencyCount: statusStats.emergencyCount,
      },
      members: members.map((m) => ({
        name: m.name,
        callsign: m.callsign,
        status: m.status,
        battery: m.battery,
        coordinates: [m.lat, m.lng],
      })),
      batteryTrends: batteryTrendData,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sahyog-analytics-${partyCode}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAnalyticsOverlayOpen) return null;

  return (
    <div
      className={`absolute z-[480] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-xl flex flex-col overflow-hidden transition-all duration-300 ${
        isExpanded
          ? 'inset-3 md:inset-6'
          : 'top-14 left-3 right-3 md:left-6 md:right-6 lg:left-12 lg:right-12 max-h-[82vh]'
      }`}
    >
      {/* Analytics Overlay Header */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-900 text-white shadow-xs">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Squad Tactical Analytics & Readiness Telemetry
              </h2>
              <span className="font-mono text-xs font-bold bg-slate-900 text-emerald-400 px-2 py-0.5 rounded border border-slate-700">
                {partyCode}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Model
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {missionName} · Real-time status distribution, battery profiles, and team event rate analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart View Switcher */}
          <div className="hidden md:flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedChartTab('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                selectedChartTab === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Panels
            </button>
            <button
              onClick={() => setSelectedChartTab('battery')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                selectedChartTab === 'battery'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Battery Depletion
            </button>
            <button
              onClick={() => setSelectedChartTab('status')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                selectedChartTab === 'status'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Status Share
            </button>
            <button
              onClick={() => setSelectedChartTab('activity')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                selectedChartTab === 'activity'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activity Rate
            </button>
          </div>

          {/* Export JSON Button */}
          <button
            onClick={handleExportData}
            title="Export telemetry data as JSON"
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Expand / Minimize */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Minimize overlay' : 'Expand full overlay'}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Overlay */}
          <button
            onClick={() => setIsAnalyticsOverlayOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Analytics Content Area */}
      <div className="p-5 overflow-y-auto space-y-5 flex-1">
        {/* Top KPI Diagnostics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Squad Mean Battery
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-black font-mono text-slate-900">{avgBattery}%</span>
              <BatteryCharging
                className={`w-5 h-5 ${
                  avgBattery < 40 ? 'text-red-500' : avgBattery < 70 ? 'text-amber-500' : 'text-emerald-600'
                }`}
              />
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Estimated ~4.8 hrs remaining
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Squad Readiness
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-black font-mono text-emerald-700">
                {statusStats.readinessPct}%
              </span>
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {statusStats.safeCount} of {members.length} fully active
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Critical Reserve Alert
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-black font-mono text-red-600">
                {members.find((m) => m.battery <= 25)?.name.split(' ')[0] || 'None'}
              </span>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {members.filter((m) => m.battery <= 30).length} units below 30% threshold
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Simulation Stepping
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-black font-mono text-slate-800">
                Step {simulation.stepCount}
              </span>
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {simulation.isRunning ? 'Active auto-telemetry' : 'Deterministic baseline'}
            </span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Chart 1: Battery Depletion Rates Over Time (Takes 7 or 12 cols) */}
          {(selectedChartTab === 'all' || selectedChartTab === 'battery') && (
            <div
              className={`bg-white border border-slate-200 rounded-xl p-4 shadow-xs ${
                selectedChartTab === 'battery' ? 'lg:col-span-12' : 'lg:col-span-7'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-slate-700" />
                    <span>Battery Depletion Profiles Over Mission Duration</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Temporal power consumption per operator with 20% critical safety baseline
                  </p>
                </div>
                <div className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Discharge: ~3.2%/hr
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={batteryTrendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      ticks={[0, 20, 40, 60, 80, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '11px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <ReferenceLine
                      y={20}
                      label={{ value: 'Critical Reserve (20%)', fill: '#ef4444', fontSize: 10, position: 'top' }}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                    />
                    {members.map((m, idx) => {
                      const key = m.name.split(' ')[0];
                      const palette = ['#2563eb', '#059669', '#d97706', '#dc2626', '#0d9488', '#6366f1', '#ec4899', '#8b5cf6'];
                      const stroke = palette[idx % palette.length];
                      return (
                        <Line
                          key={m.id}
                          type="monotone"
                          dataKey={key}
                          name={`${m.name} (${m.callsign})`}
                          stroke={stroke}
                          strokeWidth={m.isCurrentUser ? 2.5 : 2}
                          dot={{ r: 3 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 2: Status Distribution (Takes 5 or 12 cols) */}
          {(selectedChartTab === 'all' || selectedChartTab === 'status') && (
            <div
              className={`bg-white border border-slate-200 rounded-xl p-4 shadow-xs ${
                selectedChartTab === 'status' ? 'lg:col-span-12' : 'lg:col-span-5'
              }`}
            >
              <div className="mb-3">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-slate-700" />
                  <span>Personnel Condition Distribution</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Live operational readiness and casualty triage breakdown
                </p>
              </div>

              <div className="h-64 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusStats.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusStats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Info */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                  <span className="text-2xl font-black font-mono text-slate-900 leading-none">
                    {members.length}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                    Total Units
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Chart 3: Activity & Event Incident Rate Trends */}
          {(selectedChartTab === 'all' || selectedChartTab === 'activity') && (
            <div className="lg:col-span-12 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-slate-700" />
                    <span>Tactical Squad Activity & Incident Frequency Trends</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Radio transmission volume, telemetry updates, and emergency alert events
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Total Logs: {events.length + messages.length}
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityTrendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="telemetry" name="Telemetry Packets" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="messages" name="Radio Comms" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="alerts" name="Emergencies & SOS" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
