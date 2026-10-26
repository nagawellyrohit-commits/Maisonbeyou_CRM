import React from 'react';
import { CheckCircle2, Circle, ShieldCheck, RefreshCw, HelpCircle } from 'lucide-react';

/**
 * Reusable Login Preference Selection Control
 * Used across:
 * - Branch Registration (Firm & Stakeholder details)
 * - Franchise Registration (Firm & Stakeholder details)
 * - New Visitor Form (Client contact details)
 */
export default function LoginPreferenceSelector({
  isSelected = false,
  isDisabled = false,
  onSelect,
  onChangePreference,
  type = 'phone', // 'phone' | 'email'
  itemValue = '',
  customLabel = null
}) {
  const isPhone = type === 'phone';
  const categoryLabel = isPhone ? 'Phone Number' : 'Email Address';
  const primaryTitle = isPhone ? 'Primary Login Number' : 'Primary Login Email';

  const tooltipText = isSelected
    ? `This ${categoryLabel.toLowerCase()} is authorized for primary dashboard login access. Click 'Change' to pick another.`
    : isDisabled
      ? `Only one ${categoryLabel.toLowerCase()} can be selected as the primary login preference. Click 'Change' on the selected preference to pick this one.`
      : `Click to authorize this ${categoryLabel.toLowerCase()} as the primary login credential for dashboard access.`;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        flexShrink: 0
      }}
      title={tooltipText}
    >
      {isSelected ? (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
            border: '1.5px solid #B88B4A',
            color: '#8C6228',
            padding: '7px 12px',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '12px',
            fontWeight: '700',
            boxShadow: '0 2px 6px rgba(184, 139, 74, 0.18)',
            letterSpacing: '0.02em',
            transition: 'all 0.18s ease'
          }}
        >
          <CheckCircle2 size={14} color="#16A34A" style={{ flexShrink: 0 }} />
          <span>{customLabel || primaryTitle}</span>
          {onChangePreference && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChangePreference();
              }}
              style={{
                marginLeft: '4px',
                padding: '2px 6px',
                background: '#FFFFFF',
                border: '1px solid #DAC493',
                borderRadius: '4px',
                color: '#9F7335',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#9F7335';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.color = '#9F7335';
              }}
              title="Change login preference"
            >
              <RefreshCw size={10} />
              Change
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onSelect) onSelect();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isDisabled ? 'var(--bg-surface, #F5F5F4)' : '#FFFFFF',
            border: `1.5px ${isDisabled ? 'solid #E7E5E4' : 'dashed #DAC493'}`,
            color: isDisabled ? 'var(--text-muted, #A8A29E)' : '#8C6228',
            padding: '7px 12px',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? 0.5 : 1,
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.background = '#FAF6EE';
              e.currentTarget.style.borderColor = '#B88B4A';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#DAC493';
            }
          }}
          disabled={isDisabled}
          title={tooltipText}
        >
          <Circle size={13} color="currentColor" style={{ flexShrink: 0 }} />
          <span>Set as Login Preference</span>
        </button>
      )}
    </div>
  );
}
