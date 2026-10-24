import React, { useState, useEffect } from 'react';
import {
  X, Check, ShieldCheck, AlertCircle, Calendar, Sparkles, Clock, CheckCircle2, ChevronRight, Info
} from 'lucide-react';
import { formatDate } from '../utils/api';

/**
 * Helper to add days to a 'YYYY-MM-DD' date string safely
 */
function addDays(dateStr, daysToAdd) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return dateStr;
    date.setDate(date.getDate() + daysToAdd);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Curated Terms & Protocol Configuration
 */
function getTermsContent(service) {
  const name = service?.service_name || 'Hydration Facial';
  const isHydration = /hydration|hydra/i.test(name);
  const isClearSkin = /clear skin|acne|purify/i.test(name);
  const isGoldOrPeel = /gold|peel|carbon/i.test(name);
  const isLaser = /laser/i.test(name);

  if (isHydration) {
    return {
      title: 'Hydration Facial',
      tagline: 'Refresh. Replenish. Rejuvenate.',
      section1Title: '01. What is a Hydration Facial?',
      section1P1: 'A gentle skincare treatment designed to replenish moisture, soften dry skin and restore a fresh, healthy-looking glow.',
      section1P2: 'The facial uses hydrating skincare products to help your skin feel smoother, softer and comfortably moisturised.',
      section2Title: '02. Aftercare – Keep Your Glow',
      aftercare: [
        { label: 'Moisturise', desc: 'Keep your skin hydrated with a gentle moisturiser.' },
        { label: 'Sun Protection', desc: 'Apply broad-spectrum SPF 30 or higher daily.' },
        { label: 'Be Gentle', desc: 'Avoid harsh scrubs, exfoliating acids and retinoids for 24–48 hours, particularly if exfoliation was performed.' },
        { label: 'Avoid Excessive Heat', desc: 'Limit direct sun exposure, saunas and steam for the first 24 hours.' }
      ],
      section3Title: '03. Word of Caution',
      cautionsIntro: 'Please inform your skin therapist before the treatment if you have:',
      cautions: [
        'Skin allergies, sensitivities or active infections.',
        'Sunburn, open wounds or significant skin irritation.',
        'Recently undergone a chemical peel, laser treatment or other skin procedure.',
        'Used prescription acne medication or strong exfoliating skincare products.'
      ],
      cautionsFootnote1: 'Temporary redness or sensitivity may occur. Results vary depending on individual skin conditions.',
      cautionsFootnote2: 'If you experience severe or persistent irritation, seek medical advice.',
      section4Title: '04. Agree to Proceed',
      consentIntro: 'By proceeding, I confirm that:',
      consentPoints: [
        'I have disclosed relevant skin concerns, allergies, medications and recent treatments.',
        'I understand the nature of the facial, possible skin reactions and recommended aftercare.',
        'I voluntarily consent to the treatment and understand that I may request it to stop at any time.'
      ],
      agreeCheckboxLabel: 'I have read, understood and agree to proceed with the Hydration Facial.',
      session1Desc: 'Initial Moisture Saturation & Barrier Infusion',
      session2Desc: 'Hydration Lock & Cellular Retention',
      session3Desc: 'Deep Collagen Rejuvenation & Long-term Glow'
    };
  }

  // Generically tailored terms for other clinical services
  return {
    title: name,
    tagline: isClearSkin ? 'Clarify. Purify. Rebalance.' : isGoldOrPeel ? 'Illuminate. Firm. Radiate.' : isLaser ? 'Smooth. Precise. Permanent.' : 'Restore. Nourish. Elevate.',
    section1Title: `01. What is ${name}?`,
    section1P1: `A specialized clinical skincare ritual designed to address targeted dermal needs, elevate skin health, and reveal an immediate, luminous complexion.`,
    section1P2: `The treatment combines professional-grade aesthetic products and therapeutic techniques to restore natural skin vitality and barrier harmony.`,
    section2Title: '02. Aftercare – Keep Your Glow',
    aftercare: [
      { label: 'Moisturise', desc: 'Keep your skin deeply nourished with a gentle, non-comedogenic moisturiser.' },
      { label: 'Sun Protection', desc: 'Apply broad-spectrum mineral SPF 30 or 50+ daily to preserve results.' },
      { label: 'Be Gentle', desc: 'Avoid harsh chemical exfoliants, AHA/BHAs, and retinoids for 48–72 hours.' },
      { label: 'Avoid Heat & Sweat', desc: 'Refrain from vigorous exercise, hot saunas, steam, and direct sun for 24 hours.' }
    ],
    section3Title: '03. Word of Caution',
    cautionsIntro: 'Please inform your skin therapist before the treatment if you have:',
    cautions: [
      'Active skin infections, cold sores, or severe dermatitis.',
      'Open cuts, recent sunburn, or localized skin trauma.',
      'Recent chemical peels, laser sessions, or cosmetic injectables in the last 14 days.',
      'Active oral or topical isotretinoin / prescription acne regimens.'
    ],
    cautionsFootnote1: 'Mild temporary erythema or slight tingling may occur post-procedure. Results depend on personal skin physiology.',
    cautionsFootnote2: 'If you experience unexpected or lingering irritation, consult your aesthetician or medical professional.',
    section4Title: '04. Agree to Proceed',
    consentIntro: 'By proceeding, I confirm that:',
    consentPoints: [
      'I have disclosed all relevant medical, allergy, skincare, and treatment histories accurately.',
      'I understand the procedure protocol, prospective skin responses, and post-treatment maintenance.',
      'I grant informed consent for this treatment and acknowledge that I may pause the session at any time.'
    ],
    agreeCheckboxLabel: `I have read, understood and agree to proceed with the ${name}.`,
    session1Desc: 'Initial Treatment & Dermal Preparation',
    session2Desc: 'Targeted Correction & Structural Reinforcement',
    session3Desc: 'Cellular Consolidation & Sustained Results'
  };
}

export default function ServiceTermsModal({
  isOpen,
  service,
  onClose,
  onAgreeAndSelect,
  visitDate,
  clientHistory,
  client,
  isAlreadyInCart = false
}) {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [showErrorHighlight, setShowErrorHighlight] = useState(false);

  // Reset agreement checkbox when modal opens or service changes
  useEffect(() => {
    if (isOpen) {
      setHasAgreed(isAlreadyInCart);
      setShowErrorHighlight(false);
    }
  }, [isOpen, service?.service_id, isAlreadyInCart]);

  if (!isOpen || !service) return null;

  const content = getTermsContent(service);

  // Session Schedule Calculation
  const totalSessions = service.total_sessions || 3;
  const intervalDays = service.session_interval || 15;
  const currentDateStr = visitDate || new Date().toISOString().split('T')[0];

  // Check if client has an existing active course for this service
  const existingCourse = clientHistory?.treatment_courses?.find(
    c => c.service_id === service.service_id && c.status === 'active'
  );
  const completedCount = existingCourse?.completed_sessions || existingCourse?.completed_sessions_count || 0;
  const currentSessionNumber = existingCourse ? Math.min(totalSessions, completedCount + 1) : 1;

  // Compute Session Dates
  let session1Date = currentDateStr;
  let session2Date = addDays(currentDateStr, intervalDays);
  let session3Date = addDays(currentDateStr, intervalDays * 2);

  // If returning client on Session 2
  if (currentSessionNumber === 2) {
    session1Date = existingCourse?.sessions?.[0]?.session_date || addDays(currentDateStr, -intervalDays);
    session2Date = currentDateStr;
    session3Date = addDays(currentDateStr, intervalDays);
  } else if (currentSessionNumber >= 3) {
    session1Date = existingCourse?.sessions?.[0]?.session_date || addDays(currentDateStr, -intervalDays * 2);
    session2Date = existingCourse?.sessions?.[1]?.session_date || addDays(currentDateStr, -intervalDays);
    session3Date = currentDateStr;
  }

  // Summary sentence matching user's exact specification
  let sessionSummaryText = '';
  if (currentSessionNumber === 1) {
    sessionSummaryText = `Today is your first session (Session 1 of ${totalSessions}). You will be having your next Session 2 after ${intervalDays} days (${formatDate(session2Date)}), and Session 3 after next ${intervalDays} days (${formatDate(session3Date)}).`;
  } else if (currentSessionNumber === 2) {
    sessionSummaryText = `Today is your Session 2 of ${totalSessions}. You completed Session 1 on ${formatDate(session1Date)}. Your next Session 3 will be after ${intervalDays} days (${formatDate(session3Date)}).`;
  } else {
    sessionSummaryText = `Today is your Session 3 of ${totalSessions} (Final Planned Session). Completed Session 1 on ${formatDate(session1Date)} and Session 2 on ${formatDate(session2Date)}.`;
  }

  const handleConfirm = () => {
    if (!hasAgreed) {
      setShowErrorHighlight(true);
      return;
    }
    if (onAgreeAndSelect) {
      onAgreeAndSelect(service);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(18, 15, 12, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 10050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(28, 25, 23, 0.35), 0 0 0 1px rgba(186, 135, 88, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
      >
        {/* Subtle Luxury Top Accent Bar */}
        <div style={{
          height: '6px',
          width: '100%',
          background: 'linear-gradient(90deg, #8A6D3B 0%, #BA8758 50%, #D4AF37 100%)'
        }} />

        {/* Modal Header */}
        <div style={{
          padding: '24px 28px 18px 28px',
          borderBottom: '1px solid #F1E7DC',
          backgroundColor: '#FCFAF7',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div>
            {/* Pill Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: '#FAF2E6',
              border: '1px solid #E6D2BD',
              color: '#8A6D3B',
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              <ShieldCheck size={13} color="#8A6D3B" />
              <span>Terms & Condition • Treatment Consent</span>
            </div>

            {/* Service Title */}
            <h1 style={{
              margin: '0 0 4px 0',
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(24px, 2.5vw, 30px)',
              fontWeight: '600',
              color: '#1C1917',
              letterSpacing: '0.01em',
              lineHeight: 1.2
            }}>
              {content.title}
            </h1>

            {/* Tagline */}
            <p style={{
              margin: 0,
              fontStyle: 'italic',
              color: '#9E7437',
              fontSize: '14px',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}>
              {content.tagline}
            </p>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#FAF5EE',
              border: '1px solid #E6D8C8',
              color: '#78716C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EADBCC';
              e.currentTarget.style.color = '#1C1917';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FAF5EE';
              e.currentTarget.style.color = '#78716C';
            }}
            title="Close"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div style={{
          padding: '24px 28px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          backgroundColor: '#FFFFFF',
          fontSize: '13.5px',
          lineHeight: '1.6',
          color: '#332E2B'
        }}>

          {/* SECTION 01: What is a Hydration Facial? */}
          <div style={{
            backgroundColor: '#FCFAF7',
            padding: '18px 20px',
            borderRadius: '16px',
            border: '1px solid #F1E7DC'
          }}>
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '14.5px',
              fontWeight: '700',
              color: '#1C1917',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#8A6D3B' }}>{content.section1Title.slice(0, 3)}</span>
              <span>{content.section1Title.slice(4)}</span>
            </h3>
            <p style={{ margin: '0 0 8px 0', color: '#44403C' }}>
              {content.section1P1}
            </p>
            <p style={{ margin: 0, color: '#44403C' }}>
              {content.section1P2}
            </p>
          </div>

          {/* SECTION 02: Aftercare – Keep Your Glow */}
          <div style={{
            backgroundColor: '#FCFAF7',
            padding: '18px 20px',
            borderRadius: '16px',
            border: '1px solid #F1E7DC'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '14.5px',
              fontWeight: '700',
              color: '#1C1917',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#8A6D3B' }}>{content.section2Title.slice(0, 3)}</span>
              <span>{content.section2Title.slice(4)}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {content.aftercare.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#8A6D3B',
                    marginTop: '8px',
                    flexShrink: 0
                  }} />
                  <div style={{ color: '#44403C' }}>
                    <strong style={{ color: '#1C1917', fontWeight: '600' }}>{item.label}:</strong> {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 03: Word of Caution */}
          <div style={{
            backgroundColor: '#FFFBF5',
            padding: '18px 20px',
            borderRadius: '16px',
            border: '1px solid #F6E2C9',
            borderLeft: '4px solid #D97706'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <AlertCircle size={18} color="#D97706" />
              <h3 style={{
                margin: 0,
                fontSize: '14.5px',
                fontWeight: '700',
                color: '#92400E',
                letterSpacing: '0.02em'
              }}>
                {content.section3Title}
              </h3>
            </div>

            <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#78350F' }}>
              {content.cautionsIntro}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {content.cautions.map((caution, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#D97706',
                    marginTop: '8px',
                    flexShrink: 0
                  }} />
                  <span style={{ color: '#78350F' }}>{caution}</span>
                </div>
              ))}
            </div>

            <div style={{
              fontSize: '12.5px',
              color: '#92400E',
              borderTop: '1px dashed #F3DFC6',
              paddingTop: '10px',
              lineHeight: 1.5
            }}>
              <div>{content.cautionsFootnote1}</div>
              <div style={{ marginTop: '4px', fontWeight: '600' }}>{content.cautionsFootnote2}</div>
            </div>
          </div>

          {/* SECTION 04: Agree to Proceed */}
          <div style={{
            backgroundColor: '#FCFAF7',
            padding: '18px 20px',
            borderRadius: '16px',
            border: '1px solid #F1E7DC'
          }}>
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '14.5px',
              fontWeight: '700',
              color: '#1C1917',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#8A6D3B' }}>{content.section4Title.slice(0, 3)}</span>
              <span>{content.section4Title.slice(4)}</span>
            </h3>
            <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#44403C' }}>
              {content.consentIntro}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {content.consentPoints.map((point, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#8A6D3B',
                    marginTop: '8px',
                    flexShrink: 0
                  }} />
                  <span style={{ color: '#44403C' }}>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RECOMMENDED TREATMENT SCHEDULE & PROTOCOL (Requested Feature) */}
          <div style={{
            backgroundColor: '#FAF6EE',
            padding: '20px',
            borderRadius: '18px',
            border: '1px solid #EADBCC',
            boxShadow: 'inset 0 1px 3px rgba(186, 135, 88, 0.08)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={17} color="#8A6D3B" />
                <span style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#8A6D3B',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                }}>
                  Treatment Session Protocol ({totalSessions} Sessions)
                </span>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#785A35',
                backgroundColor: '#FFFFFF',
                padding: '3px 10px',
                borderRadius: '9999px',
                border: '1px solid #E2D2BF'
              }}>
                Interval: Every {intervalDays} Days
              </span>
            </div>

            {/* Banner Statement */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '1px solid #E8DACB',
              marginBottom: '16px',
              fontSize: '13.5px',
              fontWeight: '600',
              color: '#1C1917',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Sparkles size={18} color="#BA8758" style={{ flexShrink: 0 }} />
              <div>{sessionSummaryText}</div>
            </div>

            {/* 3-Step Visual Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              {/* Card 1: Session 1 */}
              <div style={{
                backgroundColor: currentSessionNumber === 1 ? '#FFFFFF' : '#F7F3EB',
                border: currentSessionNumber === 1 ? '2px solid #BA8758' : '1px solid #E5D5C2',
                borderRadius: '14px',
                padding: '14px',
                position: 'relative',
                boxShadow: currentSessionNumber === 1 ? '0 4px 12px rgba(186, 135, 88, 0.15)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: currentSessionNumber === 1 ? '#8A6D3B' : '#78716C'
                  }}>
                    SESSION 01
                  </span>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: currentSessionNumber === 1 ? '#BA8758' : '#E8DED1',
                    color: currentSessionNumber === 1 ? '#FFFFFF' : '#57534E'
                  }}>
                    {currentSessionNumber === 1 ? 'TODAY' : 'COMPLETED'}
                  </span>
                </div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#1C1917',
                  marginBottom: '4px'
                }}>
                  {formatDate(session1Date)}
                </div>
                <div style={{ fontSize: '11.5px', color: '#57534E', lineHeight: 1.35 }}>
                  {content.session1Desc}
                </div>
              </div>

              {/* Card 2: Session 2 */}
              <div style={{
                backgroundColor: currentSessionNumber === 2 ? '#FFFFFF' : '#F7F3EB',
                border: currentSessionNumber === 2 ? '2px solid #BA8758' : '1px solid #E5D5C2',
                borderRadius: '14px',
                padding: '14px',
                position: 'relative',
                boxShadow: currentSessionNumber === 2 ? '0 4px 12px rgba(186, 135, 88, 0.15)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: currentSessionNumber === 2 ? '#8A6D3B' : '#78716C'
                  }}>
                    SESSION 02
                  </span>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: currentSessionNumber === 2 ? '#BA8758' : '#EFE8DE',
                    color: currentSessionNumber === 2 ? '#FFFFFF' : '#8A6D3B'
                  }}>
                    {currentSessionNumber === 2 ? 'TODAY' : `+${intervalDays} DAYS`}
                  </span>
                </div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#1C1917',
                  marginBottom: '4px'
                }}>
                  {formatDate(session2Date)}
                </div>
                <div style={{ fontSize: '11.5px', color: '#57534E', lineHeight: 1.35 }}>
                  {content.session2Desc}
                </div>
              </div>

              {/* Card 3: Session 3 */}
              <div style={{
                backgroundColor: currentSessionNumber === 3 ? '#FFFFFF' : '#F7F3EB',
                border: currentSessionNumber === 3 ? '2px solid #BA8758' : '1px solid #E5D5C2',
                borderRadius: '14px',
                padding: '14px',
                position: 'relative',
                boxShadow: currentSessionNumber === 3 ? '0 4px 12px rgba(186, 135, 88, 0.15)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: currentSessionNumber === 3 ? '#8A6D3B' : '#78716C'
                  }}>
                    SESSION 03
                  </span>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: currentSessionNumber === 3 ? '#BA8758' : '#EFE8DE',
                    color: currentSessionNumber === 3 ? '#FFFFFF' : '#8A6D3B'
                  }}>
                    {currentSessionNumber === 3 ? 'TODAY (FINAL)' : `+${intervalDays} DAYS`}
                  </span>
                </div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#1C1917',
                  marginBottom: '4px'
                }}>
                  {formatDate(session3Date)}
                </div>
                <div style={{ fontSize: '11.5px', color: '#57534E', lineHeight: 1.35 }}>
                  {content.session3Desc}
                </div>
              </div>
            </div>
          </div>

          {/* TICK BOX: I have read, understood and agree to proceed with the Hydration Facial */}
          <div
            onClick={() => {
              setHasAgreed(!hasAgreed);
              if (showErrorHighlight) setShowErrorHighlight(false);
            }}
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              backgroundColor: hasAgreed ? '#F9F6F0' : '#FFFDFB',
              border: showErrorHighlight
                ? '2px solid #DC2626'
                : hasAgreed
                  ? '2px solid #BA8758'
                  : '1.5px solid #E2D2BF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              transition: 'all 0.2s ease',
              boxShadow: hasAgreed ? '0 4px 14px rgba(186, 135, 88, 0.12)' : 'none'
            }}
          >
            {/* Custom Checkbox Square */}
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: hasAgreed ? '#BA8758' : '#FFFFFF',
              border: hasAgreed ? '2px solid #BA8758' : '2px solid #C4A482',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}>
              {hasAgreed && <Check size={16} strokeWidth={3} color="#FFFFFF" />}
            </div>

            {/* Checkbox Text */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1C1917',
                lineHeight: 1.4
              }}>
                {content.agreeCheckboxLabel}
              </div>
              <div style={{
                fontSize: '11.5px',
                color: showErrorHighlight ? '#DC2626' : '#78716C',
                marginTop: '2px',
                fontWeight: showErrorHighlight ? '600' : '400'
              }}>
                {showErrorHighlight
                  ? '⚠ Please click the tick box to confirm consent before proceeding'
                  : 'Mandatory clinical acknowledgement to proceed with service selection'}
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #F1E7DC',
          backgroundColor: '#FCFAF7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '14px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 24px',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
              border: '1px solid #D5C5B5',
              color: '#57534E',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F5ECE1';
              e.currentTarget.style.color = '#1C1917';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#57534E';
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '12px 32px',
              borderRadius: '9999px',
              backgroundColor: hasAgreed ? '#BA8758' : '#D1BC9F',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: hasAgreed ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: hasAgreed ? '0 4px 16px rgba(186, 135, 88, 0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (hasAgreed) e.currentTarget.style.backgroundColor = '#9E6B38';
            }}
            onMouseLeave={(e) => {
              if (hasAgreed) e.currentTarget.style.backgroundColor = '#BA8758';
            }}
          >
            <Check size={16} strokeWidth={2.6} />
            <span>{isAlreadyInCart ? 'Confirm & Keep in Visit' : 'Agree & Select Service'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
