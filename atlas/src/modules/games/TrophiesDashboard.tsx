import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Trophy, 
  Calendar, 
  Layers, 
  Eye, 
  EyeOff, 
  Info, 
  CheckCircle, 
  FileText,
  Clock,
  TrendingUp,
  Tag
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { GameTrophyEntry } from '../../types';

interface TrophiesDashboardProps {
  trophyEntries: GameTrophyEntry[];
  onBack: () => void;
}

type TrophyTypeFilter = 'platina' | 'ouro' | 'prata' | 'bronze' | 'total';

export default function TrophiesDashboard({ trophyEntries, onBack }: TrophiesDashboardProps) {
  // Filters for charts
  const [timeTrophyType, setTimeTrophyType] = useState<TrophyTypeFilter>('platina');
  const [garapaTrophyType, setGarapaTrophyType] = useState<TrophyTypeFilter>('platina');

  const platformsList = ['PS3', 'PSVita', 'PS4', 'PS5'] as const;

  // --- 1. TABLE: TROPHIES BY PLATFORM ---
  const platformTableData = useMemo(() => {
    return platformsList.map(platform => {
      let platina = 0;
      let ouro = 0;
      let prata = 0;
      let bronze = 0;
      let gameCount = 0;

      trophyEntries.forEach(entry => {
        if (entry.platforms?.includes(platform)) {
          platina += entry.platina || 0;
          ouro += entry.ouro || 0;
          prata += entry.prata || 0;
          bronze += entry.bronze || 0;
          gameCount++;
        }
      });

      const total = platina + ouro + prata + bronze;

      return {
        platform,
        platina,
        ouro,
        prata,
        bronze,
        total,
        gameCount
      };
    });
  }, [trophyEntries]);

  // --- 2. MONTHLY COLUMN CHART & YEARLY COLUMN CHART ---
  const timeChartsData = useMemo(() => {
    const startYear = 2015;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0-11

    // Generate month-by-month keys & labels
    const months: { key: string; label: string; year: number }[] = [];
    for (let y = startYear; y <= currentYear; y++) {
      const endM = y === currentYear ? currentMonthIdx : 11;
      for (let m = 0; m <= endM; m++) {
        const mStr = String(m + 1).padStart(2, '0');
        months.push({
          key: `${y}-${mStr}`,
          label: `${mStr}/${String(y).slice(2)}`,
          year: y
        });
      }
    }

    // Generate years
    const years: number[] = [];
    for (let y = startYear; y <= currentYear; y++) {
      years.push(y);
    }

    // Initialize counts
    const monthlyCounts = months.map(m => ({
      key: m.key,
      label: m.label,
      year: m.year,
      platina: 0,
      ouro: 0,
      prata: 0,
      bronze: 0,
      total: 0
    }));

    const yearlyCounts = years.map(y => ({
      year: y,
      label: String(y),
      platina: 0,
      ouro: 0,
      prata: 0,
      bronze: 0,
      total: 0
    }));

    // Populate data
    trophyEntries.forEach(entry => {
      if (!entry.dataPlatina) return;
      // entry.dataPlatina expected in YYYY-MM-DD
      const parts = entry.dataPlatina.split('-');
      if (parts.length < 2) return;
      const y = parseInt(parts[0], 10);
      const mStr = parts[1].padStart(2, '0');
      const monthKey = `${y}-${mStr}`;

      const p = entry.platina || 0;
      const o = entry.ouro || 0;
      const s = entry.prata || 0;
      const b = entry.bronze || 0;
      const tot = p + o + s + b;

      // Find monthly bin
      const mBin = monthlyCounts.find(bin => bin.key === monthKey);
      if (mBin) {
        mBin.platina += p;
        mBin.ouro += o;
        mBin.prata += s;
        mBin.bronze += b;
        mBin.total += tot;
      }

      // Find yearly bin
      const yBin = yearlyCounts.find(bin => bin.year === y);
      if (yBin) {
        yBin.platina += p;
        yBin.ouro += o;
        yBin.prata += s;
        yBin.bronze += b;
        yBin.total += tot;
      }
    });

    return {
      monthly: monthlyCounts,
      yearly: yearlyCounts
    };
  }, [trophyEntries]);

  // Map chosen trophy type to values
  const monthlyChartFiltered = useMemo(() => {
    return timeChartsData.monthly.map(item => ({
      name: item.label,
      quantidade: item[timeTrophyType]
    }));
  }, [timeChartsData, timeTrophyType]);

  const yearlyChartFiltered = useMemo(() => {
    return timeChartsData.yearly.map(item => ({
      name: item.label,
      quantidade: item[timeTrophyType]
    }));
  }, [timeChartsData, timeTrophyType]);

  // Color map for selected trophy type
  const trophyColor = {
    platina: '#22d3ee', // Cyan
    ouro: '#fbbf24',    // Gold
    prata: '#d4d4d8',   // Silver
    bronze: '#ea580c',  // Orange/Bronze
    total: '#a855f7'    // Purple
  }[timeTrophyType];

  const garapaTrophyColor = {
    platina: '#22d3ee',
    ouro: '#fbbf24',
    prata: '#d4d4d8',
    bronze: '#ea580c',
    total: '#a855f7'
  }[garapaTrophyType];

  // --- 3. PLATFORM CHART (RECHARTS GROUPED COLUMN) ---
  const platformChartData = useMemo(() => {
    return platformsList.map(platform => {
      let platina = 0;
      let ouro = 0;
      let prata = 0;
      let bronze = 0;

      trophyEntries.forEach(entry => {
        if (entry.platforms?.includes(platform)) {
          platina += entry.platina || 0;
          ouro += entry.ouro || 0;
          prata += entry.prata || 0;
          bronze += entry.bronze || 0;
        }
      });

      return {
        name: platform,
        Platina: platina,
        Ouro: ouro,
        Prata: prata,
        Bronze: bronze
      };
    });
  }, [trophyEntries]);

  // --- 4. PIE CHART: GARAPAS VS COMUNS ---
  const garapaPieData = useMemo(() => {
    let garapaVal = 0;
    let comumVal = 0;

    trophyEntries.forEach(entry => {
      const isGarapa = entry.garapa;
      const p = entry.platina || 0;
      const o = entry.ouro || 0;
      const s = entry.prata || 0;
      const b = entry.bronze || 0;
      const tot = p + o + s + b;

      const count = 
        garapaTrophyType === 'platina' ? p :
        garapaTrophyType === 'ouro' ? o :
        garapaTrophyType === 'prata' ? s :
        garapaTrophyType === 'bronze' ? b : tot;

      if (isGarapa) {
        garapaVal += count;
      } else {
        comumVal += count;
      }
    });

    return [
      { name: 'Garapas', value: garapaVal, color: '#f97316' }, // Orange
      { name: 'Comuns', value: comumVal, color: '#3b82f6' }    // Blue
    ];
  }, [trophyEntries, garapaTrophyType]);

  const totalGarapaPieValue = garapaPieData.reduce((acc, curr) => acc + curr.value, 0);

  // --- 5. PIE CHART: HAS PLATINUM VS NO PLATINUM (BY GAMES COUNT) ---
  const platinumGamesPieData = useMemo(() => {
    let hasPlat = 0;
    let noPlat = 0;

    trophyEntries.forEach(entry => {
      if ((entry.platina || 0) > 0) {
        hasPlat++;
      } else {
        noPlat++;
      }
    });

    return [
      { name: 'Possuem Platina', value: hasPlat, color: '#06b6d4' }, // Cyan
      { name: 'Não Possuem Platina', value: noPlat, color: '#64748b' } // Slate
    ];
  }, [trophyEntries]);

  const totalPlatinumGamesCount = platinumGamesPieData.reduce((acc, curr) => acc + curr.value, 0);

  // --- 6. TABLE: HIDDEN VS VISIBLE TROPHIES ---
  const visibilityTableData = useMemo(() => {
    let visiblePlat = 0, visibleOuro = 0, visiblePrata = 0, visibleBronze = 0;
    let hiddenPlat = 0, hiddenOuro = 0, hiddenPrata = 0, hiddenBronze = 0;

    trophyEntries.forEach(entry => {
      const isHidden = entry.hide;
      const p = entry.platina || 0;
      const o = entry.ouro || 0;
      const s = entry.prata || 0;
      const b = entry.bronze || 0;

      if (isHidden) {
        hiddenPlat += p;
        hiddenOuro += o;
        hiddenPrata += s;
        hiddenBronze += b;
      } else {
        visiblePlat += p;
        visibleOuro += o;
        visiblePrata += s;
        visibleBronze += b;
      }
    });

    return [
      {
        status: 'Visíveis',
        platina: visiblePlat,
        ouro: visibleOuro,
        prata: visiblePrata,
        bronze: visibleBronze,
        total: visiblePlat + visibleOuro + visiblePrata + visibleBronze,
        className: 'text-emerald-400'
      },
      {
        status: 'Ocultos',
        platina: hiddenPlat,
        ouro: hiddenOuro,
        prata: hiddenPrata,
        bronze: hiddenBronze,
        total: hiddenPlat + hiddenOuro + hiddenPrata + hiddenBronze,
        className: 'text-red-400'
      }
    ];
  }, [trophyEntries]);

  // --- 7. RANKINGS: TOP 10 DAYS & TOP 10 MONTHS WITH MOST PLATINUMS ---
  const rankingsData = useMemo(() => {
    const dayCounts: { [day: string]: number } = {};
    const monthCounts: { [month: string]: number } = {};

    trophyEntries.forEach(entry => {
      const platCount = entry.platina || 0;
      if (platCount <= 0 || !entry.dataPlatina) return;

      const dateStr = entry.dataPlatina; // YYYY-MM-DD
      const parts = dateStr.split('-');
      if (parts.length < 3) return;

      const y = parts[0];
      const m = parts[1];
      const d = parts[2];

      const formattedDay = `${d}/${m}/${y}`;
      const formattedMonth = `${m}/${y}`;

      dayCounts[formattedDay] = (dayCounts[formattedDay] || 0) + platCount;
      monthCounts[formattedMonth] = (monthCounts[formattedMonth] || 0) + platCount;
    });

    const topDays = Object.entries(dayCounts)
      .map(([day, count]) => ({ item: day, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topMonths = Object.entries(monthCounts)
      .map(([month, count]) => ({ item: month, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      topDays,
      topMonths
    };
  }, [trophyEntries]);

  return (
    <div className="space-y-8 pb-12" id="trophies-dashboard-view">

      {/* SECTION 1: TROPHIES BY PLATFORM TABLE & HIDDEN/VISIBLE TROPHIES TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Table: Trophies by Platform */}
        <div className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between" id="dashboard-platform-table-card">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-outline-variant/15 pb-3">
              <Layers size={18} className="text-brand-primary" />
              <h3 className="font-display font-black text-white text-sm uppercase tracking-wider">Troféus por Plataforma</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" id="dashboard-platform-table">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-text-muted text-[10px] font-black tracking-wider uppercase">
                    <th className="py-2.5">Plataforma</th>
                    <th className="py-2.5 text-center">Jogos</th>
                    <th className="py-2.5 text-center text-cyan-400">Platina</th>
                    <th className="py-2.5 text-center text-amber-400">Ouro</th>
                    <th className="py-2.5 text-center text-zinc-300">Prata</th>
                    <th className="py-2.5 text-center text-orange-500">Bronze</th>
                    <th className="py-2.5 text-right text-brand-primary">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 font-mono">
                  {platformTableData.map(row => (
                    <tr key={row.platform} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 font-display font-black text-white text-xs">{row.platform}</td>
                      <td className="py-3 text-center text-text-muted">{row.gameCount}</td>
                      <td className="py-3 text-center font-bold text-cyan-400">{row.platina}</td>
                      <td className="py-3 text-center font-bold text-amber-400">{row.ouro}</td>
                      <td className="py-3 text-center font-bold text-zinc-300">{row.prata}</td>
                      <td className="py-3 text-center font-bold text-orange-500">{row.bronze}</td>
                      <td className="py-3 text-right font-black text-white">{row.total}</td>
                    </tr>
                  ))}
                  {/* Footer sum row removed */}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Table: Hidden vs Visible */}
        <div className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between" id="dashboard-visibility-table-card">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-outline-variant/15 pb-3">
              <Eye size={18} className="text-brand-primary" />
              <h3 className="font-display font-black text-white text-sm uppercase tracking-wider">Troféus Ocultos vs Visíveis</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" id="dashboard-visibility-table">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-text-muted text-[10px] font-black tracking-wider uppercase">
                    <th className="py-2.5">Status do Jogo</th>
                    <th className="py-2.5 text-center text-cyan-400">Platina</th>
                    <th className="py-2.5 text-center text-amber-400">Ouro</th>
                    <th className="py-2.5 text-center text-zinc-300">Prata</th>
                    <th className="py-2.5 text-center text-orange-500">Bronze</th>
                    <th className="py-2.5 text-right text-brand-primary">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 font-mono">
                  {visibilityTableData.map(row => (
                    <tr key={row.status} className="hover:bg-white/5 transition-colors">
                      <td className={`py-3 font-display font-black text-xs ${row.className}`}>{row.status}</td>
                      <td className="py-3 text-center font-bold text-cyan-400">{row.platina}</td>
                      <td className="py-3 text-center font-bold text-amber-400">{row.ouro}</td>
                      <td className="py-3 text-center font-bold text-zinc-300">{row.prata}</td>
                      <td className="py-3 text-center font-bold text-orange-500">{row.bronze}</td>
                      <td className="py-3 text-right font-black text-white">{row.total}</td>
                    </tr>
                  ))}
                  {/* Footer sum row */}
                  <tr className="border-t border-outline-variant/40 font-bold bg-bg-surface-med/20">
                    <td className="py-3 font-display font-black text-white text-xs">TOTAL</td>
                    <td className="py-3 text-center text-cyan-400 font-black">{visibilityTableData.reduce((sum, r) => sum + r.platina, 0)}</td>
                    <td className="py-3 text-center text-amber-400 font-black">{visibilityTableData.reduce((sum, r) => sum + r.ouro, 0)}</td>
                    <td className="py-3 text-center text-zinc-300 font-black">{visibilityTableData.reduce((sum, r) => sum + r.prata, 0)}</td>
                    <td className="py-3 text-center text-orange-500 font-black">{visibilityTableData.reduce((sum, r) => sum + r.bronze, 0)}</td>
                    <td className="py-3 text-right text-brand-primary font-black">{visibilityTableData.reduce((sum, r) => sum + r.total, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Info card removed */}
          </div>
        </div>

      </div>

      {/* FILTERS PANEL FOR TIME CHARTS */}
      <div className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-xl space-y-6" id="dashboard-time-charts-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/15 pb-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-brand-primary" />
            <div>
              <h3 className="font-display font-black text-white text-sm uppercase tracking-wider">Histórico Temporal de Conquistas</h3>
            </div>
          </div>
          
          {/* Trophy Type Selector */}
          <div className="flex flex-wrap items-center gap-1 bg-bg-surface-med/40 border border-outline-variant/20 rounded-xl p-1">
            {(['platina', 'ouro', 'prata', 'bronze', 'total'] as TrophyTypeFilter[]).map(type => (
              <button
                key={type}
                onClick={() => setTimeTrophyType(type)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-display font-black tracking-wider uppercase cursor-pointer transition-all ${
                  timeTrophyType === type 
                    ? 'bg-brand-primary text-black' 
                    : 'text-text-muted hover:text-text-high'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 2. MONTHLY COLUMN CHART */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <h4 className="text-xs font-display font-black text-white uppercase tracking-wider">Troféus por Mês (Janeiro/2015 - Atual)</h4>
          </div>
          <div className="bg-bg-surface-med/20 border border-outline-variant/10 rounded-2xl p-4">
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartFiltered} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={9} 
                    fontFamily="monospace"
                    tickLine={false} 
                    interval={11}
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={10} 
                    fontFamily="monospace"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                    labelStyle={{ color: '#ffffff', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}
                    itemStyle={{ color: trophyColor, fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Bar dataKey="quantidade" fill={trophyColor} radius={[4, 4, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 3. YEARLY COLUMN CHART */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-12 space-y-3">
            <h4 className="text-xs font-display font-black text-white uppercase tracking-wider">Evolução Anual (2015 - Atual)</h4>
            <div className="bg-bg-surface-med/20 border border-outline-variant/10 rounded-2xl p-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyChartFiltered} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={10} 
                    fontFamily="monospace"
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={10} 
                    fontFamily="monospace"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                    labelStyle={{ color: '#ffffff', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}
                    itemStyle={{ color: trophyColor, fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Bar dataKey="quantidade" fill={trophyColor} radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 3: PLATFORM CHART & PIE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 4. Column chart: Trophies by Platform */}
        <div className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between lg:col-span-1" id="platform-grouped-chart-card">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-outline-variant/15 pb-3">
              <Layers size={18} className="text-brand-primary" />
              <h3 className="font-display font-black text-white text-sm uppercase tracking-wider">Troféus por Console</h3>
            </div>
            
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={10} fontFamily="monospace" tickLine={false} />
                  <YAxis stroke="#888888" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                    labelStyle={{ color: '#ffffff', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '11px', fontFamily: 'monospace', color: '#ffffff' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ 
                      position: 'relative',
                      marginTop: '10px',
                      fontSize: '11px', 
                      fontFamily: 'var(--font-sans)',
                      color: 'var(--text-mid)'
                    }} 
                  />
                  <Bar dataKey="Platina" fill="#22d3ee" maxBarSize={8} />
                  <Bar dataKey="Ouro" fill="#fbbf24" maxBarSize={8} />
                  <Bar dataKey="Prata" fill="#d4d4d8" maxBarSize={8} />
                  <Bar dataKey="Bronze" fill="#ea580c" maxBarSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 5. Pie Chart: Garapas vs Comuns */}
        <div className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between lg:col-span-1" id="garapa-pie-chart-card">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/15 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-brand-primary" />
                <h3 className="font-display font-black text-white text-sm uppercase tracking-wider">Garapas vs Comuns</h3>
              </div>
              
              {/* Mini selector */}
              <select
                value={garapaTrophyType}
                onChange={e => setGarapaTrophyType(e.target.value as TrophyTypeFilter)}
                className="bg-bg-surface-med/50 border border-outline-variant/30 rounded-lg px-2 py-1 text-[10px] text-text-high font-mono focus:outline-none"
              >
                <option value="platina">Platina</option>
                <option value="ouro">Ouro</option>
                <option value="prata">Prata</option>
                <option value="bronze">Bronze</option>
                <option value="total">Total</option>
              </select>
            </div>

            {totalGarapaPieValue === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-text-muted font-mono text-center">
                Sem registros de troféus para o tipo selecionado.
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-[180px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={garapaPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {garapaPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                        labelStyle={{ color: '#ffffff', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '11px', fontFamily: 'monospace', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Absolute Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-mono text-text-muted uppercase">Total</span>
                    <span className="text-lg font-display font-black text-white">{totalGarapaPieValue}</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-2 font-mono text-[10px]">
                  {garapaPieData.map(item => {
                    const percentage = totalGarapaPieValue > 0 ? ((item.value / totalGarapaPieValue) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-white font-bold">{item.name}:</span>
                        <span className="text-text-muted">{item.value} ({percentage}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 6. Pie Chart: Has Platinum vs No Platinum */}
        <div className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between lg:col-span-1" id="platinum-donut-chart-card">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-outline-variant/15 pb-3">
              <Trophy size={18} className="text-cyan-400" />
              <h3 className="font-display font-black text-white text-sm uppercase tracking-wider">Jogos Com vs Sem Platina</h3>
            </div>

            {totalPlatinumGamesCount === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-text-muted font-mono text-center">
                Adicione jogos na lista para ver os gráficos.
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-[180px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platinumGamesPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {platinumGamesPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                        labelStyle={{ color: '#ffffff', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '11px', fontFamily: 'monospace', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Absolute Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-mono text-text-muted uppercase">Jogos</span>
                    <span className="text-lg font-display font-black text-white">{totalPlatinumGamesCount}</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-2 font-mono text-[10px]">
                  {platinumGamesPieData.map(item => {
                    const percentage = totalPlatinumGamesCount > 0 ? ((item.value / totalPlatinumGamesCount) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-white font-bold">{item.name}:</span>
                        <span className="text-text-muted">{item.value} ({percentage}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 4: RANKINGS (TOP 10 DAYS & MONTHS WITH MOST PLATINUMS) */}
      <div className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-xl" id="dashboard-rankings-panel">
        <div className="flex items-center gap-2 mb-6 border-b border-outline-variant/15 pb-3">
          <Clock size={18} className="text-cyan-400" />
          <div>
            <h3 className="font-display font-black text-white text-sm uppercase tracking-wider">Top 10 Recordes de Platinas</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Top 10 Days */}
          <div className="space-y-4" id="dashboard-rank-days-card">
            <h4 className="text-xs font-display font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle size={14} />
              <span>Dias Campeões de Platina</span>
            </h4>
            
            {rankingsData.topDays.length === 0 ? (
              <p className="text-xs text-text-muted font-mono py-4">Nenhum dado com data registrada para platinas.</p>
            ) : (
              <div className="space-y-2.5">
                {rankingsData.topDays.map((row, index) => (
                  <div 
                    key={row.item} 
                    className="flex items-center justify-between p-3 rounded-2xl bg-bg-surface-med/30 border border-outline-variant/10 hover:border-outline-variant/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg font-display font-black text-xs flex items-center justify-center ${
                        index === 0 ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20' :
                        index === 1 ? 'bg-zinc-300 text-black' :
                        index === 2 ? 'bg-amber-700 text-white' : 'bg-bg-surface-med text-text-muted border border-outline-variant/10'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-xs text-white font-mono font-bold">{row.item}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="font-black text-cyan-400">{row.count}</span>
                      <span className="text-text-muted text-[10px]">Plat{row.count > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 10 Months */}
          <div className="space-y-4" id="dashboard-rank-months-card">
            <h4 className="text-xs font-display font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle size={14} />
              <span>Meses Campeões de Platina</span>
            </h4>
            
            {rankingsData.topMonths.length === 0 ? (
              <p className="text-xs text-text-muted font-mono py-4">Nenhum dado com data registrada para platinas.</p>
            ) : (
              <div className="space-y-2.5">
                {rankingsData.topMonths.map((row, index) => (
                  <div 
                    key={row.item} 
                    className="flex items-center justify-between p-3 rounded-2xl bg-bg-surface-med/30 border border-outline-variant/10 hover:border-outline-variant/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg font-display font-black text-xs flex items-center justify-center ${
                        index === 0 ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20' :
                        index === 1 ? 'bg-zinc-300 text-black' :
                        index === 2 ? 'bg-amber-700 text-white' : 'bg-bg-surface-med text-text-muted border border-outline-variant/10'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-xs text-white font-mono font-bold">{row.item}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="font-black text-cyan-400">{row.count}</span>
                      <span className="text-text-muted text-[10px]">Plat{row.count > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
