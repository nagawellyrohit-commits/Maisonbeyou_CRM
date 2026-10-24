import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Validates whether year, month (1-12), and day (1-31) represent a valid real calendar date.
 */
const isValidDate = (y, m, d) => {
  if (!y || !m || !d) return false;
  if (y < 1900 || y > 2150) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const testDate = new Date(y, m - 1, d);
  return testDate.getFullYear() === y && (testDate.getMonth() + 1) === m && testDate.getDate() === d;
};

/**
 * Robust date parser supporting multiple typed formats:
 * - DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
 * - YYYY-MM-DD
 * - 8 continuous digits: DDMMYYYY
 * - Natural text (e.g. 15 Aug 1990)
 * Returns ISO 'YYYY-MM-DD' or null.
 */
const parseAnyDateInput = (str) => {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim();
  if (!s) return null;

  // 1. ISO format: YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (isValidDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 2. Standard Indian/European format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or DD MM YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (isValidDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 3. 2-digit year format: DD/MM/YY or DD-MM-YY (pivot year: >= 30 is 1900s, < 30 is 2000s)
  const dmy2Match = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2})$/);
  if (dmy2Match) {
    const d = parseInt(dmy2Match[1], 10);
    const m = parseInt(dmy2Match[2], 10);
    let y = parseInt(dmy2Match[3], 10);
    y = y >= 30 ? 1900 + y : 2000 + y;
    if (isValidDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 4. 8-digit continuous: DDMMYYYY
  if (/^\d{8}$/.test(s)) {
    const d = parseInt(s.slice(0, 2), 10);
    const m = parseInt(s.slice(2, 4), 10);
    const y = parseInt(s.slice(4, 8), 10);
    if (isValidDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 5. 6-digit continuous: DDMMYY
  if (/^\d{6}$/.test(s)) {
    const d = parseInt(s.slice(0, 2), 10);
    const m = parseInt(s.slice(2, 4), 10);
    let y = parseInt(s.slice(4, 6), 10);
    y = y >= 30 ? 1900 + y : 2000 + y;
    if (isValidDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 6. Natural text like "15 Aug 1990" or "15 August 1990"
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = parsed.getMonth() + 1;
    const d = parsed.getDate();
    if (isValidDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
};

/**
 * Strict date formatter and validator for DD/MM/YYYY keyboard input:
 * - Only numbers allowed (and auto-inserts /).
 * - dd: 01 to 31 (max 2 digits).
 * - mm: 01 to 12 (max 2 digits).
 * - yyyy: up to maxYear (e.g. 2026) (max 4 digits).
 * - Maximum total length: 10 characters (DD/MM/YYYY).
 */
export const formatDateInput = (rawVal, maxYear = 2026) => {
  if (!rawVal) return '';

  // 1. Strip all non-digit and non-slash characters
  let val = rawVal.replace(/[^\d/]/g, '');
  if (!val) return '';

  // If slashes exist (typed or progressive or editing in the middle)
  if (val.includes('/')) {
    const parts = val.split('/');
    let dStr = parts[0] !== undefined ? parts[0].slice(0, 2) : '';
    let mStr = parts[1] !== undefined ? parts[1].slice(0, 2) : '';
    let yStr = parts[2] !== undefined ? parts[2].slice(0, 4) : '';

    // If user typed digits directly after month without typing slash (e.g., "10/012")
    if (parts.length === 2 && parts[1].length > 2) {
      mStr = parts[1].slice(0, 2);
      yStr = parts[1].slice(2, 6);
    }

    // Day: clamp if 2 digits entered
    if (dStr.length === 2) {
      let dNum = parseInt(dStr, 10);
      if (!isNaN(dNum)) {
        if (dNum > 31) dNum = 31;
        if (dNum < 1) dNum = 1;
        dStr = String(dNum).padStart(2, '0');
      }
    } else if (dStr.length === 1 && parseInt(dStr, 10) > 3 && parts.length === 1) {
      dStr = `0${dStr}`;
    }

    // Month: clamp if 2 digits entered
    if (mStr.length === 2) {
      let mNum = parseInt(mStr, 10);
      if (!isNaN(mNum)) {
        if (mNum > 12) mNum = 12;
        if (mNum < 1) mNum = 1;
        mStr = String(mNum).padStart(2, '0');
      }
    }

    // Year: clamp if 4 digits entered
    if (yStr.length === 4) {
      let yNum = parseInt(yStr, 10);
      if (!isNaN(yNum) && yNum > maxYear) {
        yStr = String(maxYear);
      }
    }

    let result = dStr;
    // Auto-append slash after 2-digit Day or if slash exists
    if (parts.length > 1 || dStr.length === 2) {
      result += '/' + mStr;
      // Auto-append slash after 2-digit Month or if second slash exists
      if (parts.length > 2 || mStr.length === 2) {
        result += '/' + yStr;
      }
    }
    return result.slice(0, 10);
  }

  // Pure digits without slashes
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';

  let day = digits.slice(0, 2);
  let month = digits.slice(2, 4);
  let year = digits.slice(4, 8);

  // Day (1 digit): if > 3 (4-9), auto-format to 0X/
  if (digits.length === 1) {
    const d1 = parseInt(digits[0], 10);
    if (d1 > 3) {
      return `0${d1}/`;
    }
    return digits;
  }

  // Day (2 digits): clamp between 01 and 31
  let dNum = parseInt(day, 10);
  if (dNum > 31) dNum = 31;
  if (dNum < 1) dNum = 1;
  const formattedDay = String(dNum).padStart(2, '0');

  if (digits.length === 2) {
    return `${formattedDay}/`;
  }

  // Month (1 digit): if > 1 (2-9), auto-format to 0X/
  if (digits.length === 3) {
    const m1 = parseInt(digits[2], 10);
    if (m1 > 1) {
      return `${formattedDay}/0${m1}/`;
    }
    return `${formattedDay}/${digits[2]}`;
  }

  // Month (2 digits): clamp between 01 and 12
  let mNum = parseInt(month, 10);
  if (mNum > 12) mNum = 12;
  if (mNum < 1) mNum = 1;
  const formattedMonth = String(mNum).padStart(2, '0');

  if (digits.length === 4) {
    return `${formattedDay}/${formattedMonth}/`;
  }

  // Year (up to 4 digits): clamp 4-digit year to maxYear
  if (year.length === 4) {
    let yNum = parseInt(year, 10);
    if (!isNaN(yNum) && yNum > maxYear) {
      year = String(maxYear);
    }
  }

  return `${formattedDay}/${formattedMonth}/${year}`;
};

/**
 * Normalizes complete date (adjusts for Feb 28/29, 30-day months, clamps year).
 */
export const normalizeCompleteDate = (dmyStr, maxYear = 2026) => {
  if (!dmyStr || typeof dmyStr !== 'string') return dmyStr;
  const parts = dmyStr.trim().split('/');
  if (parts.length !== 3) return dmyStr;
  let d = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  let y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return dmyStr;
  if (y > maxYear) y = maxYear;
  if (m > 12) m = 12;
  if (m < 1) m = 1;
  const maxDays = new Date(y, m, 0).getDate();
  if (d > maxDays) d = maxDays;
  if (d < 1) d = 1;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

/**
 * LuxuryDatePicker
 * Specially designed for Date of Birth & Marriage Anniversary dates:
 * - BOTH SELECTABLE (via Calendar Dropdown) AND TYPEABLE (via Keyboard Input).
 * - STRICTLY PREVENTS FUTURE DATES: Clamped to maxDate (defaults to today).
 * - Strictly prevents dates earlier than minDate (e.g. Anniversary cannot be earlier than DOB).
 * - Proper z-index stacking to prevent overlapping inputs from covering the calendar.
 * - Luxury Champagne Gold theme matching Maison BeYou CRM aesthetic.
 */
export default function LuxuryDatePicker({
  label,
  value,
  onChange,
  maxDate,
  minDate,
  required = false,
  placeholder = 'DD/MM/YYYY or select date',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const cursorRef = useRef(null);

  // Compute today's date string YYYY-MM-DD
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const effectiveMaxStr = maxDate || todayStr;
  const effectiveMinStr = minDate || '1920-01-01';

  const parseDateParts = (str) => {
    if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
    const [y, m, d] = str.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  };

  const formatDisplay = (val) => {
    if (!val) return '';
    const parts = parseDateParts(val);
    if (!parts) return val;
    return `${String(parts.day).padStart(2, '0')}/${String(parts.month + 1).padStart(2, '0')}/${parts.year}`;
  };

  // Local state for typeable text inside input box
  const [inputText, setInputText] = useState(() => formatDisplay(value));

  const maxParts = parseDateParts(effectiveMaxStr) || { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  const minParts = parseDateParts(effectiveMinStr) || { year: 1920, month: 0, day: 1 };

  // Current view state (year and month in the calendar popover)
  const initialParts = parseDateParts(value) || maxParts;
  const [viewYear, setViewYear] = useState(initialParts.year);
  const [viewMonth, setViewMonth] = useState(initialParts.month);

  // Synchronize input text and calendar view when prop 'value' changes
  useEffect(() => {
    if (value) {
      const p = parseDateParts(value);
      if (p) {
        setInputText(`${String(p.day).padStart(2, '0')}/${String(p.month + 1).padStart(2, '0')}/${p.year}`);
        setViewYear(p.year);
        setViewMonth(p.month);
      } else {
        setInputText(value);
      }
    } else {
      setInputText('');
      setViewYear(maxParts.year);
      setViewMonth(maxParts.month);
    }
  }, [value, effectiveMaxStr, effectiveMinStr]);

  // Restore cursor position whenever input text changes (prevents cursor jumping to end when editing middle)
  useEffect(() => {
    if (cursorRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
      cursorRef.current = null;
    }
  }, [inputText]);

  // Click outside listener to close calendar popover
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Generate Year options: strictly from maxYear down to minYear (NO FUTURE YEARS EVER)
  const years = [];
  for (let y = maxParts.year; y >= minParts.year; y--) {
    years.push(y);
  }

  // Month navigation guards
  const isAtMaxMonth = viewYear === maxParts.year && viewMonth >= maxParts.month;
  const isAtMinMonth = viewYear === minParts.year && viewMonth <= minParts.month;

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (isAtMinMonth) return;
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (isAtMaxMonth) return;
    if (viewMonth === 11) {
      if (viewYear + 1 <= maxParts.year) {
        setViewYear(y => y + 1);
        setViewMonth(0);
      }
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleYearChange = (e) => {
    const newYear = Number(e.target.value);
    setViewYear(newYear);
    let targetMonth = viewMonth;
    if (newYear === maxParts.year && viewMonth > maxParts.month) {
      targetMonth = maxParts.month;
      setViewMonth(maxParts.month);
    }
    if (newYear === minParts.year && viewMonth < minParts.month) {
      targetMonth = minParts.month;
      setViewMonth(minParts.month);
    }

    // Immediately update selected date when Year is changed in dropdown
    if (value) {
      const parts = parseDateParts(value);
      if (parts) {
        const maxDaysInMonth = new Date(newYear, targetMonth + 1, 0).getDate();
        const adjustedDay = Math.min(parts.day, maxDaysInMonth);
        const newIso = `${newYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;
        if (newIso <= effectiveMaxStr && newIso >= effectiveMinStr) {
          setInputText(`${String(adjustedDay).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${newYear}`);
          onChange(newIso);
        }
      }
    }
  };

  const handleMonthChange = (e) => {
    const newMonth = Number(e.target.value);
    setViewMonth(newMonth);

    // Immediately update selected date when Month is changed in dropdown
    if (value) {
      const parts = parseDateParts(value);
      if (parts) {
        const maxDaysInNewMonth = new Date(parts.year, newMonth + 1, 0).getDate();
        const adjustedDay = Math.min(parts.day, maxDaysInNewMonth);
        const newIso = `${parts.year}-${String(newMonth + 1).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;
        if (newIso <= effectiveMaxStr && newIso >= effectiveMinStr) {
          setInputText(`${String(adjustedDay).padStart(2, '0')}/${String(newMonth + 1).padStart(2, '0')}/${parts.year}`);
          onChange(newIso);
        }
      }
    }
  };

  // Generate days for grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Selecting a day from the calendar popover
  const handleSelectDay = (day) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateStr > effectiveMaxStr) {
      alert(`Date cannot be in the future (max allowed: ${formatDisplay(effectiveMaxStr)})`);
      return;
    }
    if (dateStr < effectiveMinStr) {
      alert(`Date cannot be earlier than ${formatDisplay(effectiveMinStr)}`);
      return;
    }
    setInputText(`${String(day).padStart(2, '0')}/${String(viewMonth + 1).padStart(2, '0')}/${viewYear}`);
    onChange(dateStr);
    setIsOpen(false);
  };

  // Intercept KeyDown to strictly block non-numeric characters, handle in-place edits and Backspace
  const handleKeyDown = (e) => {
    const input = inputRef.current;

    // 1. Backspace handling: allow smooth deletion of digits anywhere
    if (e.key === 'Backspace') {
      if (!input) return;
      const { selectionStart, selectionEnd, value: curVal } = input;
      // If cursor is right after a slash '/' (e.g. at pos 3 or 6) with no selection
      if (selectionStart === selectionEnd && selectionStart > 0 && curVal[selectionStart - 1] === '/') {
        e.preventDefault();
        const newVal = curVal.slice(0, selectionStart - 2) + curVal.slice(selectionStart);
        const formatted = formatDateInput(newVal, maxParts.year);
        setInputText(formatted);
        const nextPos = Math.max(0, selectionStart - 2);
        cursorRef.current = nextPos;
        setTimeout(() => {
          if (inputRef.current) inputRef.current.setSelectionRange(nextPos, nextPos);
        }, 0);
        return;
      }
      return; // allow normal backspace
    }

    // 2. Allow control & navigation keys
    if (
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    ) {
      return;
    }

    // 3. Digit keys 0-9:
    if (/^[0-9]$/.test(e.key)) {
      if (!input) return;
      const { selectionStart, selectionEnd, value: curVal } = input;

      // In-place overwrite when cursor is placed inside an already complete 10-char date (e.g. changing month or day)
      if (selectionStart === selectionEnd && curVal.length >= 10 && selectionStart < 10) {
        let pos = selectionStart;
        if (curVal[pos] === '/') {
          pos += 1; // skip slash
        }
        if (pos < 10) {
          e.preventDefault();
          const newVal = curVal.slice(0, pos) + e.key + curVal.slice(pos + 1);
          const formatted = formatDateInput(newVal, maxParts.year);
          setInputText(formatted);
          let nextPos = pos + 1;
          if (nextPos === 2 || nextPos === 5) nextPos += 1;
          cursorRef.current = nextPos;
          setTimeout(() => {
            if (inputRef.current) inputRef.current.setSelectionRange(nextPos, nextPos);
          }, 0);

          if (formatted.length === 10) {
            const parsedIso = parseAnyDateInput(formatted);
            if (parsedIso && parsedIso <= effectiveMaxStr && parsedIso >= effectiveMinStr) {
              const parts = parseDateParts(parsedIso);
              if (parts) {
                setViewYear(parts.year);
                setViewMonth(parts.month);
              }
              onChange(parsedIso);
            }
          }
          return;
        }
      }
      return;
    }

    // 4. Allow forward slash '/'
    if (e.key === '/') {
      return;
    }

    // 5. BLOCK all other keys (letters, symbols, punctuation)
    e.preventDefault();
  };

  // Intercept Paste to sanitize any non-digits from clipboard
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text') || '';
    const formatted = formatDateInput(pastedText, maxParts.year);
    setInputText(formatted);

    if (formatted.length === 10) {
      const normalized = normalizeCompleteDate(formatted, maxParts.year);
      setInputText(normalized);
      const parsedIso = parseAnyDateInput(normalized);
      if (parsedIso && parsedIso <= effectiveMaxStr && parsedIso >= effectiveMinStr) {
        const parts = parseDateParts(parsedIso);
        if (parts) {
          setViewYear(parts.year);
          setViewMonth(parts.month);
        }
        onChange(parsedIso);
      }
    }
  };

  // Typing directly into the input field: formats on-the-fly and syncs
  const handleInputChange = (e) => {
    const input = e.target;
    const typed = input.value;
    const cursor = input.selectionStart;

    const formatted = formatDateInput(typed, maxParts.year);
    setInputText(formatted);

    // Advance cursor past auto-inserted slash so user can immediately type the next segment
    if (formatted.length > typed.length && cursor === typed.length && formatted.endsWith('/')) {
      cursorRef.current = formatted.length;
    } else {
      cursorRef.current = cursor;
    }

    if (!formatted.trim()) {
      onChange('');
      return;
    }

    // When full 10-char date is entered (DD/MM/YYYY)
    if (formatted.length === 10) {
      const normalized = normalizeCompleteDate(formatted, maxParts.year);
      if (normalized !== formatted) {
        setInputText(normalized);
      }
      const parsedIso = parseAnyDateInput(normalized);
      if (parsedIso) {
        if (parsedIso <= effectiveMaxStr && parsedIso >= effectiveMinStr) {
          const parts = parseDateParts(parsedIso);
          if (parts) {
            setViewYear(parts.year);
            setViewMonth(parts.month);
          }
          onChange(parsedIso);
        }
      }
    }
  };

  // On blur of the typed input: validate, adjust days in month, alert if out of range, format nicely
  const handleInputBlur = () => {
    if (!inputText.trim()) {
      if (value) onChange('');
      return;
    }

    let dateToValidate = inputText;
    if (dateToValidate.includes('/') && dateToValidate.length >= 8) {
      dateToValidate = normalizeCompleteDate(dateToValidate, maxParts.year);
    }

    const parsedIso = parseAnyDateInput(dateToValidate);
    if (parsedIso) {
      const parts = parseDateParts(parsedIso);
      if (parts) {
        const maxDaysInMonth = new Date(parts.year, parts.month + 1, 0).getDate();
        if (parts.day > maxDaysInMonth) {
          parts.day = maxDaysInMonth;
        }
        const clampedIso = `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;

        if (clampedIso > effectiveMaxStr) {
          alert(`Date cannot be in the future (max allowed: ${formatDisplay(effectiveMaxStr)})`);
          if (value) {
            const p = parseDateParts(value);
            setInputText(`${String(p.day).padStart(2, '0')}/${String(p.month + 1).padStart(2, '0')}/${p.year}`);
          } else {
            setInputText('');
            onChange('');
          }
          return;
        }

        if (clampedIso < effectiveMinStr) {
          alert(`Date cannot be earlier than ${formatDisplay(effectiveMinStr)}`);
          if (value) {
            const p = parseDateParts(value);
            setInputText(`${String(p.day).padStart(2, '0')}/${String(p.month + 1).padStart(2, '0')}/${p.year}`);
          } else {
            setInputText('');
            onChange('');
          }
          return;
        }

        setInputText(`${String(parts.day).padStart(2, '0')}/${String(parts.month + 1).padStart(2, '0')}/${parts.year}`);
        setViewYear(parts.year);
        setViewMonth(parts.month);
        onChange(clampedIso);
        return;
      }
    }

    // Incomplete or invalid date entered: restore previous value or clear
    if (value) {
      const p = parseDateParts(value);
      setInputText(`${String(p.day).padStart(2, '0')}/${String(p.month + 1).padStart(2, '0')}/${p.year}`);
    } else {
      setInputText('');
      onChange('');
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setInputText('');
    onChange('');
  };

  const selectedParts = parseDateParts(value);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        zIndex: isOpen ? 99999 : 'auto',
        ...style
      }}
    >
      {label && (
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
          {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
        </label>
      )}

      {/* Input Field Display: Both Typeable & Selectable */}
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: 'var(--radius-md)',
          border: isOpen ? '1.5px solid #B88B4A' : '1.5px solid var(--border-color)',
          background: 'var(--bg-card-subtle)',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(184, 139, 74, 0.15)' : 'none'
        }}
      >
        {/* Left Clickable Calendar Icon button to toggle calendar dropdown */}
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          title="Open calendar picker"
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#B88B4A',
            zIndex: 2
          }}
        >
          <Calendar size={17} color="#B88B4A" />
        </button>

        {/* Real Typeable Text Input - strictly numbers & DD/MM/YYYY format */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={10}
          autoComplete="off"
          value={inputText}
          onClick={() => setIsOpen(true)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={handleInputChange}
          onPaste={handlePaste}
          onBlur={handleInputBlur}
          placeholder={placeholder || 'DD/MM/YYYY'}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 64px 12px 38px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '14px',
            fontWeight: inputText ? '600' : '400',
            color: 'var(--text-main)',
            letterSpacing: '0.04em',
            fontVariantNumeric: 'tabular-nums',
            cursor: 'text'
          }}
        />

        {/* Right Action Icons (Clear X & Dropdown Chevron) */}
        <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 2 }}>
          {inputText && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear date"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '50%'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            title="Toggle calendar dropdown"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <ChevronDown
              size={15}
              style={{
                transition: 'transform 0.2s ease',
                transform: isOpen ? 'rotate(180deg)' : 'none'
              }}
            />
          </button>
        </div>
      </div>

      {/* Luxury Calendar Popover */}
      {isOpen && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 99999,
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1.5px solid #DAC493',
            boxShadow: '0 18px 45px rgba(28, 25, 23, 0.22), 0 4px 14px rgba(0,0,0,0.08)',
            padding: '16px',
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            boxSizing: 'border-box'
          }}
        >
          {/* Header: Month & Year Selectors with Next/Prev Arrows */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '6px' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isAtMinMonth}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: isAtMinMonth ? '#F5F5F4' : '#FFFFFF',
                color: isAtMinMonth ? '#D6D3D1' : '#1C1917',
                cursor: isAtMinMonth ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Month & Year Dropdowns */}
            <div style={{ display: 'flex', gap: '6px', flex: 1, justifyContent: 'center' }}>
              {/* Month Selector */}
              <select
                value={viewMonth}
                onChange={handleMonthChange}
                style={{
                  padding: '5px 8px',
                  borderRadius: '8px',
                  border: '1px solid #DAC493',
                  background: '#FAF6EE',
                  color: '#1C1917',
                  fontSize: '13px',
                  fontWeight: '700',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {MONTH_NAMES.map((name, idx) => {
                  const isFutureMonth = (viewYear === maxParts.year && idx > maxParts.month);
                  const isPastMonth = (viewYear === minParts.year && idx < minParts.month);
                  if (isFutureMonth || isPastMonth) return null;
                  return (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  );
                })}
              </select>

              {/* Year Selector - STRICTLY DESCENDING FROM CURRENT YEAR (NO FUTURE YEARS) */}
              <select
                value={viewYear}
                onChange={handleYearChange}
                style={{
                  padding: '5px 8px',
                  borderRadius: '8px',
                  border: '1px solid #DAC493',
                  background: '#FAF6EE',
                  color: '#1C1917',
                  fontSize: '13px',
                  fontWeight: '700',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {years.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isAtMaxMonth}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: isAtMaxMonth ? '#F5F5F4' : '#FFFFFF',
                color: isAtMaxMonth ? '#D6D3D1' : '#1C1917',
                cursor: isAtMaxMonth ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px', textAlign: 'center' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ fontSize: '11px', fontWeight: '700', color: '#B88B4A', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
            {/* Empty slots before first day of month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Month Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isFuture = dateStr > effectiveMaxStr;
              const isBeforeMin = dateStr < effectiveMinStr;
              const isDisabled = isFuture || isBeforeMin;
              const isSelected = selectedParts && selectedParts.year === viewYear && selectedParts.month === viewMonth && selectedParts.day === day;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  style={{
                    height: '32px',
                    borderRadius: '8px',
                    border: isToday && !isSelected ? '1.5px solid #B88B4A' : 'none',
                    background: isSelected
                      ? 'linear-gradient(135deg, #B88B4A 0%, #A37637 100%)'
                      : (isDisabled ? 'transparent' : 'transparent'),
                    color: isSelected
                      ? '#FFFFFF'
                      : (isDisabled ? '#D6D3D1' : '#1C1917'),
                    fontSize: '12.5px',
                    fontWeight: isSelected || isToday ? '700' : '500',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 6px rgba(184, 139, 74, 0.35)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.background = '#FAF6EE';
                      e.currentTarget.style.color = '#B88B4A';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#1C1917';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Footer */}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F0ECE4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Max allowed: <strong style={{ color: '#B88B4A' }}>{maxParts.day} {MONTH_NAMES_SHORT[maxParts.month]} {maxParts.year}</strong>
            </span>
            {todayStr <= effectiveMaxStr && todayStr >= effectiveMinStr && (
              <button
                type="button"
                onClick={() => handleSelectDay(now.getDate())}
                style={{
                  fontSize: '11.5px',
                  fontWeight: '700',
                  color: '#B88B4A',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 6px'
                }}
              >
                Select Today
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
