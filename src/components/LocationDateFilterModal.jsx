import React, { useState } from 'react';
import {
  Calendar, Clock, X, Check, ChevronRight, ChevronLeft,
  Sparkles, Filter, ArrowRight, RotateCcw
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const formatISO = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatDisplayDate = (dateInput) => {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function LocationDateFilterModal({
  isOpen,
  onClose,
  currentFilter,
  onApply
}) {
  if (!isOpen) return null;

  const now = new Date();
  const todayISO = formatISO(now);

  // Tab State: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'
  const [activeTab, setActiveTab] = useState(currentFilter?.mode || 'today');

  // Week Options
  const [weekSubMode, setWeekSubMode] = useState('current'); // 'current' | 'custom'
  const [weekYear, setWeekYear] = useState(now.getFullYear());
  const [weekMonth, setWeekMonth] = useState(now.getMonth());
  const [weekNumber, setWeekNumber] = useState(1); // 1 to 5

  // Month Options
  const [monthSubMode, setMonthSubMode] = useState('current'); // 'current' | 'custom'
  const [monthYear, setMonthYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // Year Options
  const [yearSubMode, setYearSubMode] = useState('current'); // 'current' | 'custom'
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Custom Range
  const [customStart, setCustomStart] = useState(currentFilter?.startDate || todayISO);
  const [customEnd, setCustomEnd] = useState(currentFilter?.endDate || todayISO);

  // Calculate Range for any tab
  const getCalculatedRange = (tab = activeTab) => {
    if (tab === 'today') {
      return {
        mode: 'today',
        title: 'Today',
        startDate: todayISO,
        endDate: todayISO,
        pillLabel: `Date :- Today (${formatDisplayDate(todayISO)})`,
        rangeDescription: `${formatDisplayDate(todayISO)} (1 day)`
      };
    }

    if (tab === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestISO = formatISO(yest);
      return {
        mode: 'yesterday',
        title: 'Yesterday',
        startDate: yestISO,
        endDate: yestISO,
        pillLabel: `Date :- Yesterday (${formatDisplayDate(yestISO)})`,
        rangeDescription: `${formatDisplayDate(yestISO)} (1 day)`
      };
    }

    if (tab === 'week') {
      if (weekSubMode === 'current') {
        const day = (now.getDay() + 6) % 7; // Monday = 0
        const monday = new Date(now);
        monday.setDate(now.getDate() - day);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const sISO = formatISO(monday);
        const eISO = formatISO(sunday);
        return {
          mode: 'week',
          title: 'This Week',
          startDate: sISO,
          endDate: eISO,
          pillLabel: `Date :- This Week (${formatDisplayDate(sISO)} – ${formatDisplayDate(eISO)})`,
          rangeDescription: `${formatDisplayDate(sISO)} to ${formatDisplayDate(eISO)} (7 days)`
        };
      } else {
        // Specific Week of Year & Month
        const daysInMonth = new Date(weekYear, weekMonth + 1, 0).getDate();
        const startDay = Math.min(daysInMonth, (weekNumber - 1) * 7 + 1);
        const endDay = Math.min(daysInMonth, weekNumber === 5 ? daysInMonth : weekNumber * 7);
        const sDate = new Date(weekYear, weekMonth, startDay);
        const eDate = new Date(weekYear, weekMonth, endDay);
        const sISO = formatISO(sDate);
        const eISO = formatISO(eDate);
        return {
          mode: 'week',
          title: `Week ${weekNumber}, ${MONTH_NAMES_SHORT[weekMonth]} ${weekYear}`,
          startDate: sISO,
          endDate: eISO,
          pillLabel: `Date :- W${weekNumber} ${MONTH_NAMES_SHORT[weekMonth]} (${formatDisplayDate(sISO)} – ${formatDisplayDate(eISO)})`,
          rangeDescription: `${formatDisplayDate(sISO)} to ${formatDisplayDate(eISO)} (${endDay - startDay + 1} days)`
        };
      }
    }

    if (tab === 'month') {
      if (monthSubMode === 'current') {
        const sDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const eDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const sISO = formatISO(sDate);
        const eISO = formatISO(eDate);
        return {
          mode: 'month',
          title: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
          startDate: sISO,
          endDate: eISO,
          pillLabel: `Date :- ${MONTH_NAMES_SHORT[now.getMonth()]} ${now.getFullYear()} (${formatDisplayDate(sISO)} – ${formatDisplayDate(eISO)})`,
          rangeDescription: `${formatDisplayDate(sISO)} to ${formatDisplayDate(eISO)} (${eDate.getDate()} days)`
        };
      } else {
        const sDate = new Date(monthYear, selectedMonth, 1);
        const eDate = new Date(monthYear, selectedMonth + 1, 0);
        const sISO = formatISO(sDate);
        const eISO = formatISO(eDate);
        return {
          mode: 'month',
          title: `${MONTH_NAMES[selectedMonth]} ${monthYear}`,
          startDate: sISO,
          endDate: eISO,
          pillLabel: `Date :- ${MONTH_NAMES_SHORT[selectedMonth]} ${monthYear} (${formatDisplayDate(sISO)} – ${formatDisplayDate(eISO)})`,
          rangeDescription: `${formatDisplayDate(sISO)} to ${formatDisplayDate(eISO)} (${eDate.getDate()} days)`
        };
      }
    }

    if (tab === 'year') {
      const targetYear = yearSubMode === 'current' ? now.getFullYear() : selectedYear;
      const sDate = new Date(targetYear, 0, 1);
      const eDate = new Date(targetYear, 11, 31);
      const sISO = formatISO(sDate);
      const eISO = formatISO(eDate);
      return {
        mode: 'year',
        title: `Year ${targetYear}`,
        startDate: sISO,
        endDate: eISO,
        pillLabel: `Date :- Year ${targetYear} (${formatDisplayDate(sISO)} – ${formatDisplayDate(eISO)})`,
        rangeDescription: `01 Jan ${targetYear} to 31 Dec ${targetYear} (Full Year)`
      };
    }

    if (tab === 'custom') {
      let s = customStart || todayISO;
      let e = customEnd || todayISO;
      if (s > e) {
        const temp = s;
        s = e;
        e = temp;
      }
      const d1 = new Date(s + 'T00:00:00');
      const d2 = new Date(e + 'T00:00:00');
      const diffDays = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
      return {
        mode: 'custom',
        title: 'Custom Range',
        startDate: s,
        endDate: e,
        pillLabel: `Date :- Custom (${formatDisplayDate(s)} – ${formatDisplayDate(e)})`,
        rangeDescription: `${formatDisplayDate(s)} to ${formatDisplayDate(e)} (${diffDays} day${diffDays > 1 ? 's' : ''})`
      };
    }

    return {
      mode: 'today',
      title: 'Today',
      startDate: todayISO,
      endDate: todayISO,
      pillLabel: `Date :- Today (${formatDisplayDate(todayISO)})`,
      rangeDescription: `${formatDisplayDate(todayISO)} (1 day)`
    };
  };

  const currentCalculated = getCalculatedRange(activeTab);

  const handleApply = () => {
    onApply(currentCalculated);
    onClose();
  };

  // Quick shortcut helper for custom range
  const setQuickRangeDays = (days) => {
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    setCustomStart(formatISO(start));
    setCustomEnd(formatISO(end));
    setActiveTab('custom');
  };

  const TABS = [
    { id: 'today', label: 'Today', desc: 'Current Day' },
    { id: 'yesterday', label: 'Yesterday', desc: 'Previous Day' },
    { id: 'week', label: 'Week', desc: 'Current or Selected Week' },
    { id: 'month', label: 'Month', desc: 'Current or Selected Month' },
    { id: 'year', label: 'Year', desc: 'Current or Selected Year' },
    { id: 'custom', label: 'Custom Range', desc: 'Pick From – To Dates' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'rgba(28, 25, 23, 0.65)',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        border: '1.5px solid #DAC493',
        width: '100%',
        maxWidth: '680px',
        boxShadow: '0 25px 60px -15px rgba(28, 25, 23, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'scaleUp 0.24s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '22px 28px',
          borderBottom: '1px solid #F0E8DD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#FFFFFF',
              border: '1.5px solid #DAC493',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B88B4A',
              boxShadow: '0 2px 6px rgba(184, 139, 74, 0.15)'
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '800',
                color: '#1C1917',
                margin: 0,
                letterSpacing: '-0.01em'
              }}>
                Filter Branch Performance by Date
              </h2>
              <p style={{
                fontSize: '12.5px',
                color: '#78716C',
                margin: '2px 0 0 0'
              }}>
                Select a period to update Daily Income and Return stats across all branches.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid #EAE0D2',
              color: '#78716C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1C1917';
              e.currentTarget.style.borderColor = '#DAC493';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#78716C';
              e.currentTarget.style.borderColor = '#EAE0D2';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation (6 Options) */}
        <div style={{
          padding: '16px 28px 0',
          borderBottom: '1px solid #F0E8DD',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '8px',
          background: '#FFFFFF'
        }}>
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 8px',
                  borderRadius: '10px 10px 0 0',
                  borderBottom: `3px solid ${isSelected ? '#B88B4A' : 'transparent'}`,
                  background: isSelected ? '#FAF6EE' : 'transparent',
                  color: isSelected ? '#B88B4A' : '#78716C',
                  fontSize: '13px',
                  fontWeight: isSelected ? '800' : '600',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body / Tab Content */}
        <div style={{ padding: '24px 28px', minHeight: '260px', background: '#FAFAF9' }}>
          {/* TAB 1: TODAY */}
          {activeTab === 'today' && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #DAC493',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#059669',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                <span>Live Active Daily Totals</span>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', margin: '0 0 6px 0' }}>
                Today: {formatDisplayDate(todayISO)}
              </h3>
              <p style={{ fontSize: '13.5px', color: '#78716C', margin: '0 auto', maxWidth: '420px', lineHeight: 1.5 }}>
                Displays real-time Revenue (Cash, UPI & Card) and Membership Credits Redeemed across today's studio visits.
              </p>
            </div>
          )}

          {/* TAB 2: YESTERDAY */}
          {activeTab === 'yesterday' && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #DAC493',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                color: '#D97706',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px'
              }}>
                <Clock size={12} color="#D97706" />
                <span>Completed Business Day</span>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', margin: '0 0 6px 0' }}>
                Yesterday: {(() => {
                  const y = new Date(now);
                  y.setDate(y.getDate() - 1);
                  return formatDisplayDate(formatISO(y));
                })()}
              </h3>
              <p style={{ fontSize: '13.5px', color: '#78716C', margin: '0 auto', maxWidth: '420px', lineHeight: 1.5 }}>
                Displays finalized day-closing collections for yesterday across all branches.
              </p>
            </div>
          )}

          {/* TAB 3: WEEK */}
          {activeTab === 'week' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setWeekSubMode('current')}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    border: `1.5px solid ${weekSubMode === 'current' ? '#B88B4A' : '#E7E5E4'}`,
                    background: weekSubMode === 'current' ? '#FAF6EE' : '#FFFFFF',
                    color: weekSubMode === 'current' ? '#9F7335' : '#57534E',
                    cursor: 'pointer'
                  }}
                >
                  Current Week (Mon – Sun)
                </button>
                <button
                  type="button"
                  onClick={() => setWeekSubMode('custom')}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    border: `1.5px solid ${weekSubMode === 'custom' ? '#B88B4A' : '#E7E5E4'}`,
                    background: weekSubMode === 'custom' ? '#FAF6EE' : '#FFFFFF',
                    color: weekSubMode === 'custom' ? '#9F7335' : '#57534E',
                    cursor: 'pointer'
                  }}
                >
                  Select Week of Month & Year
                </button>
              </div>

              {weekSubMode === 'custom' && (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E7E5E4',
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#78716C', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Year
                    </label>
                    <select
                      value={weekYear}
                      onChange={(e) => setWeekYear(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #DAC493',
                        background: '#FAF6EE',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#1C1917'
                      }}
                    >
                      {[2024, 2025, 2026, 2027, 2028].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#78716C', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Month
                    </label>
                    <select
                      value={weekMonth}
                      onChange={(e) => setWeekMonth(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #DAC493',
                        background: '#FAF6EE',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#1C1917'
                      }}
                    >
                      {MONTH_NAMES.map((m, idx) => (
                        <option key={m} value={idx}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#78716C', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Week Number
                    </label>
                    <select
                      value={weekNumber}
                      onChange={(e) => setWeekNumber(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #DAC493',
                        background: '#FAF6EE',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#1C1917'
                      }}
                    >
                      <option value={1}>Week 1 (Days 1–7)</option>
                      <option value={2}>Week 2 (Days 8–14)</option>
                      <option value={3}>Week 3 (Days 15–21)</option>
                      <option value={4}>Week 4 (Days 22–28)</option>
                      <option value={5}>Week 5 (Days 29–End)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Range Preview Box */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#FAF6EE',
                border: '1px solid #DAC493',
                fontSize: '13px',
                color: '#9F7335',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Calendar size={16} color="#B88B4A" />
                <span>Calculated Range: <strong>{currentCalculated.rangeDescription}</strong></span>
              </div>
            </div>
          )}

          {/* TAB 4: MONTH */}
          {activeTab === 'month' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMonthSubMode('current')}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    border: `1.5px solid ${monthSubMode === 'current' ? '#B88B4A' : '#E7E5E4'}`,
                    background: monthSubMode === 'current' ? '#FAF6EE' : '#FFFFFF',
                    color: monthSubMode === 'current' ? '#9F7335' : '#57534E',
                    cursor: 'pointer'
                  }}
                >
                  Current Month ({MONTH_NAMES[now.getMonth()]} {now.getFullYear()})
                </button>
                <button
                  type="button"
                  onClick={() => setMonthSubMode('custom')}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    border: `1.5px solid ${monthSubMode === 'custom' ? '#B88B4A' : '#E7E5E4'}`,
                    background: monthSubMode === 'custom' ? '#FAF6EE' : '#FFFFFF',
                    color: monthSubMode === 'custom' ? '#9F7335' : '#57534E',
                    cursor: 'pointer'
                  }}
                >
                  Pick Month & Year
                </button>
              </div>

              {monthSubMode === 'custom' && (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E7E5E4',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#78716C' }}>Select Year:</span>
                    <select
                      value={monthYear}
                      onChange={(e) => setMonthYear(Number(e.target.value))}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #DAC493',
                        background: '#FAF6EE',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#1C1917'
                      }}
                    >
                      {[2024, 2025, 2026, 2027, 2028].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '8px'
                  }}>
                    {MONTH_NAMES_SHORT.map((m, idx) => {
                      const isSelected = selectedMonth === idx;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSelectedMonth(idx)}
                          style={{
                            padding: '8px 4px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            border: `1.5px solid ${isSelected ? '#B88B4A' : '#E7E5E4'}`,
                            background: isSelected ? 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#44403C',
                            cursor: 'pointer'
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Range Preview Box */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#FAF6EE',
                border: '1px solid #DAC493',
                fontSize: '13px',
                color: '#9F7335',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Calendar size={16} color="#B88B4A" />
                <span>Calculated Range: <strong>{currentCalculated.rangeDescription}</strong></span>
              </div>
            </div>
          )}

          {/* TAB 5: YEAR */}
          {activeTab === 'year' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setYearSubMode('current')}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    border: `1.5px solid ${yearSubMode === 'current' ? '#B88B4A' : '#E7E5E4'}`,
                    background: yearSubMode === 'current' ? '#FAF6EE' : '#FFFFFF',
                    color: yearSubMode === 'current' ? '#9F7335' : '#57534E',
                    cursor: 'pointer'
                  }}
                >
                  Current Year ({now.getFullYear()})
                </button>
                <button
                  type="button"
                  onClick={() => setYearSubMode('custom')}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    border: `1.5px solid ${yearSubMode === 'custom' ? '#B88B4A' : '#E7E5E4'}`,
                    background: yearSubMode === 'custom' ? '#FAF6EE' : '#FFFFFF',
                    color: yearSubMode === 'custom' ? '#9F7335' : '#57534E',
                    cursor: 'pointer'
                  }}
                >
                  Select Specific Year
                </button>
              </div>

              {yearSubMode === 'custom' && (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E7E5E4',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}>
                  {[2024, 2025, 2026, 2027, 2028].map(y => {
                    const isSelected = selectedYear === y;
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setSelectedYear(y)}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: '800',
                          border: `1.5px solid ${isSelected ? '#B88B4A' : '#E7E5E4'}`,
                          background: isSelected ? 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : '#44403C',
                          cursor: 'pointer'
                        }}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Range Preview Box */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#FAF6EE',
                border: '1px solid #DAC493',
                fontSize: '13px',
                color: '#9F7335',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Calendar size={16} color="#B88B4A" />
                <span>Calculated Range: <strong>{currentCalculated.rangeDescription}</strong></span>
              </div>
            </div>
          )}

          {/* TAB 6: CUSTOM RANGE */}
          {activeTab === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#78716C', textTransform: 'uppercase' }}>
                  Quick Shortcuts:
                </span>
                <button
                  type="button"
                  onClick={() => setQuickRangeDays(7)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    background: '#FFFFFF',
                    border: '1px solid #DAC493',
                    color: '#9F7335',
                    cursor: 'pointer'
                  }}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRangeDays(14)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    background: '#FFFFFF',
                    border: '1px solid #DAC493',
                    color: '#9F7335',
                    cursor: 'pointer'
                  }}
                >
                  Last 14 Days
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRangeDays(30)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    background: '#FFFFFF',
                    border: '1px solid #DAC493',
                    color: '#9F7335',
                    cursor: 'pointer'
                  }}
                >
                  Last 30 Days
                </button>
              </div>

              {/* Dual Inputs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E7E5E4',
                padding: '16px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                    From Date (Start):
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #DAC493',
                      background: '#FAF6EE',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      color: '#1C1917',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                    To Date (End):
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #DAC493',
                      background: '#FAF6EE',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      color: '#1C1917',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Range Preview Box */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#FAF6EE',
                border: '1px solid #DAC493',
                fontSize: '13px',
                color: '#9F7335',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Calendar size={16} color="#B88B4A" />
                <span>Calculated Range: <strong>{currentCalculated.rangeDescription}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Bar */}
        <div style={{
          padding: '18px 28px',
          borderTop: '1px solid #F0E8DD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FFFFFF'
        }}>
          {/* Active Preview Pill */}
          <div style={{
            fontSize: '12.5px',
            color: '#78716C',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>Applying:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              borderRadius: '6px',
              background: '#FAF6EE',
              border: '1px solid #DAC493',
              color: '#9F7335',
              fontWeight: '800'
            }}>
              {currentCalculated.title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#57534E',
                background: '#F5F5F4',
                border: '1px solid #E7E5E4',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                fontSize: '13px',
                fontWeight: '700'
              }}
            >
              <Check size={16} />
              <span>Apply Date Filter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
