import React, { useRef } from 'react';
import { Play, Pause, Clock, Volume2, VolumeX, Maximize2, Sparkles, Zap, ShieldCheck, Repeat } from 'lucide-react';

export default function VisitorServiceSpotlightCard({
  categoryName,
  serviceName = 'Underarms Laser',
  durationMins = 20,
  price = 1200,
  subtitle = '',
  tag = 'Quick & Effective',
  downtime = '',
  vspBadges = [],
  sessionPlanText = '',
  videoUrl = '',
  heroImage = '',
  gallery = [],
  highlights = [],
  activeMediaTab = 'video',
  onSelectMediaTab,
  videoRef: externalVideoRef,
  isVideoPlaying = true,
  setIsVideoPlaying,
  isVideoMuted = true,
  setIsVideoMuted,
  onTogglePlay,
  onToggleMute,
  isActiveInCart = false,
  onSelectService,
  onOpenTerms,
  maxGalleryThumbnails = 3,
  compact = false
}) {
  const internalVideoRef = useRef(null);
  const videoElRef = externalVideoRef || internalVideoRef;

  const displayedGallery = Array.isArray(gallery)
    ? gallery.slice(0, maxGalleryThumbnails)
    : [];

  const allGalleryPhotos = Array.isArray(gallery) ? gallery : [];

  const handlePlayPause = () => {
    if (onTogglePlay) {
      onTogglePlay();
      return;
    }
    if (videoElRef.current) {
      if (videoElRef.current.paused) {
        videoElRef.current.play().catch(() => {});
        if (setIsVideoPlaying) setIsVideoPlaying(true);
      } else {
        videoElRef.current.pause();
        if (setIsVideoPlaying) setIsVideoPlaying(false);
      }
    }
  };

  const handleMuteToggle = () => {
    if (onToggleMute) {
      onToggleMute();
      return;
    }
    if (setIsVideoMuted) {
      setIsVideoMuted(!isVideoMuted);
    }
    if (videoElRef.current) {
      videoElRef.current.muted = !isVideoMuted;
    }
  };

  const handleFullscreen = () => {
    if (videoElRef.current && videoElRef.current.requestFullscreen) {
      videoElRef.current.requestFullscreen();
    }
  };

  const formattedPrice =
    price !== '' && price !== null && price !== undefined && !Number.isNaN(Number(price))
      ? Number(price).toLocaleString('en-IN')
      : '0';

  const cleanHighlights = Array.isArray(highlights)
    ? highlights.filter((h) => h && String(h).trim().length > 0)
    : [];

  const cleanVspBadges = Array.isArray(vspBadges)
    ? vspBadges.map((b) => String(b || '').trim()).filter(Boolean)
    : [];

  return (
    <div
      className={compact ? undefined : 'card spotlight-card-container'}
      style={{
        borderRadius: compact ? '22px' : '24px',
        border: '1.5px solid #D8BE9B',
        background: '#FFFFFF',
        boxShadow: '0 8px 30px rgba(184, 139, 74, 0.08)',
        overflow: 'hidden',
        padding: 0,
        width: '100%',
        height: 'auto',
        boxSizing: 'border-box'
      }}
    >
      <div
        className={compact ? undefined : 'spotlight-featured-grid'}
        style={
          compact
            ? {
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                boxSizing: 'border-box'
              }
            : undefined
        }
      >
        {/* TOP / LEFT MEDIA SECTION: Main Media Display + Single Row of 4 Thumbnails */}
        <div
          className={compact ? undefined : 'spotlight-media-col'}
          style={
            compact
              ? {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: '12px',
                  background: '#FFFFFF',
                  borderBottom: '1px solid #EDE4D8',
                  padding: '16px',
                  boxSizing: 'border-box'
                }
              : undefined
          }
        >
          {/* Main Media Box */}
          <div
            className={compact ? undefined : 'spotlight-media-main'}
            style={
              compact
                ? {
                    position: 'relative',
                    width: '100%',
                    height: '320px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#1C1917',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }
                : undefined
            }
          >
            {activeMediaTab === 'video' ? (
              <>
                <video
                  ref={videoElRef}
                  key={`vid_${videoUrl}`}
                  src={videoUrl}
                  poster={heroImage || allGalleryPhotos[0]}
                  autoPlay
                  muted={isVideoMuted}
                  loop
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  onPlay={() => setIsVideoPlaying && setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying && setIsVideoPlaying(false)}
                />

                {/* Top Badge Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pointerEvents: 'none',
                    zIndex: 2
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(28, 25, 23, 0.72)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFFFFF',
                      padding: '4px 11px',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      letterSpacing: '0.04em'
                    }}
                  >
                    <Play size={9} fill="#FFFFFF" color="#FFFFFF" />
                    <span>PROCEDURE DEMO • HD</span>
                  </div>

                  <div
                    style={{
                      background: 'rgba(28, 25, 23, 0.72)',
                      backdropFilter: 'blur(8px)',
                      color: '#FAF7F2',
                      padding: '4px 11px',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Clock size={11} color="#D4AF37" />
                    <span>{durationMins || 20} mins</span>
                  </div>
                </div>

                {/* Central Play/Pause Button Overlay */}
                <button
                  type="button"
                  onClick={handlePlayPause}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'rgba(28, 25, 23, 0.65)',
                    backdropFilter: 'blur(6px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.45)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
                    transition: 'transform 0.2s ease',
                    zIndex: 2
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                  }}
                  title={isVideoPlaying ? 'Pause video' : 'Play procedure preview'}
                >
                  {isVideoPlaying ? (
                    <Pause size={18} fill="#FFFFFF" />
                  ) : (
                    <Play size={18} fill="#FFFFFF" style={{ marginLeft: '2px' }} />
                  )}
                </button>

                {/* Bottom-Left Controls Overlay (Sound + Fullscreen) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    zIndex: 2
                  }}
                >
                  <button
                    type="button"
                    onClick={handleMuteToggle}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '7px',
                      background: 'rgba(28, 25, 23, 0.65)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title={isVideoMuted ? 'Unmute video' : 'Mute video'}
                  >
                    {isVideoMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>

                  <button
                    type="button"
                    onClick={handleFullscreen}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '7px',
                      background: 'rgba(28, 25, 23, 0.65)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title="Fullscreen preview"
                  >
                    <Maximize2 size={13} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <img
                  key={`photo_${activeMediaTab}_${allGalleryPhotos[activeMediaTab]}`}
                  src={allGalleryPhotos[activeMediaTab] || heroImage}
                  alt={`${serviceName} clinical preview ${Number(activeMediaTab) + 1}`}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />

                {/* Top Badge Overlay for Photo */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pointerEvents: 'none',
                    zIndex: 2
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(28, 25, 23, 0.78)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFFFFF',
                      padding: '4px 11px',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      letterSpacing: '0.04em'
                    }}
                  >
                    <span>📷</span>
                    <span>
                      CLINICAL PHOTO • {Number(activeMediaTab) + 1} OF {displayedGallery.length || 3}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectMediaTab) onSelectMediaTab('video');
                      if (setIsVideoPlaying) setIsVideoPlaying(true);
                    }}
                    style={{
                      pointerEvents: 'auto',
                      background: 'rgba(184, 139, 74, 0.95)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFFFFF',
                      padding: '4px 11px',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                    }}
                    title="Return to Procedure Demo Video"
                  >
                    <Play size={9} fill="#FFFFFF" />
                    <span>Watch Video</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Single Horizontal Row of Thumbnails Beneath Main Media */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.max(4, displayedGallery.length + 1)}, minmax(0, 1fr))`,
              gap: '10px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* Thumbnail 1: Video */}
            <button
              type="button"
              onClick={() => {
                if (onSelectMediaTab) onSelectMediaTab('video');
                if (setIsVideoPlaying) setIsVideoPlaying(true);
                if (videoElRef.current) {
                  videoElRef.current.play().catch(() => {});
                }
              }}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 10',
                borderRadius: '10px',
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                margin: 0,
                border: activeMediaTab === 'video' ? '2px solid #BA8758' : '1px solid #DAC493',
                boxShadow: activeMediaTab === 'video' ? '0 0 0 2px rgba(186, 135, 88, 0.25)' : 'none',
                background: '#1C1917',
                transition: 'all 0.2s ease'
              }}
              title="Play Procedure Demo Video"
            >
              <img
                key={`vid_thumb_${heroImage || allGalleryPhotos[0] || ''}`}
                src={heroImage || allGalleryPhotos[0]}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.38)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px'
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#BA8758',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Play size={8} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: '1px' }} />
                </div>
                <span style={{ fontSize: '8px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '0.05em' }}>
                  VIDEO
                </span>
              </div>
            </button>

            {/* Thumbnails 2-4: Clinical Photos 1, 2, 3 */}
            {displayedGallery.map((imgUrl, idx) => {
              const isSelected = activeMediaTab === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (onSelectMediaTab) onSelectMediaTab(idx);
                    if (videoElRef.current) {
                      videoElRef.current.pause();
                      if (setIsVideoPlaying) setIsVideoPlaying(false);
                    }
                  }}
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16 / 10',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 0,
                    margin: 0,
                    border: isSelected ? '2px solid #BA8758' : '1px solid #DAC493',
                    boxShadow: isSelected ? '0 0 0 2px rgba(186, 135, 88, 0.25)' : 'none',
                    background: '#FAF6EE',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={`View Clinical Photo ${idx + 1}`}
                >
                  {imgUrl && (
                    <img
                      key={`gal_thumb_${idx}_${imgUrl}`}
                      src={imgUrl}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '3px',
                      right: '4px',
                      background: 'rgba(28, 25, 23, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#FFFFFF',
                      fontSize: '8px',
                      fontWeight: '800',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      letterSpacing: '0.02em',
                      lineHeight: 1.2
                    }}
                  >
                    {idx + 1}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM / RIGHT DETAILS SECTION: Service Info, Benefits & Select Service CTA */}
        <div
          className={compact ? undefined : 'spotlight-details-col'}
          style={
            compact
              ? {
                  padding: '20px 22px 22px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: '#FFFFFF',
                  boxSizing: 'border-box'
                }
              : undefined
          }
        >
          <div>
            {/* Category Name above Service Title */}
            {categoryName && (
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#B88B4A',
                  marginBottom: '4px'
                }}
              >
                {categoryName}
              </div>
            )}

            {/* Service Name */}
            <h2
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: compact ? '21px' : 'clamp(21px, 2vw, 25px)',
                color: '#1C1917',
                lineHeight: 1.25,
                margin: subtitle ? '0 0 4px 0' : '0 0 12px 0',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.02em'
              }}
            >
              {serviceName}
            </h2>

            {/* Subtitle / Tagline */}
            {subtitle && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#78716C',
                  marginBottom: '12px',
                  fontWeight: '500'
                }}
              >
                {subtitle}
              </div>
            )}

            {/* Badges / Specs Pill Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '500',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: '#FAF6EE',
                  color: '#785A35',
                  border: '1px solid #EADBCC',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Clock size={12} color="#9E7437" />
                {durationMins || 20} Mins Session
              </span>

              {tag && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '500',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: '#FAF6EE',
                    color: '#785A35',
                    border: '1px solid #EADBCC',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Sparkles size={12} color="#9E7437" />
                  {tag}
                </span>
              )}

              {downtime && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '500',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: '#FAF6EE',
                    color: '#785A35',
                    border: '1px solid #EADBCC',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Zap size={12} color="#9E7437" />
                  {downtime}
                </span>
              )}

              {cleanVspBadges.map((vspBadge, vIdx) => (
                <span
                  key={`vsp_${vIdx}`}
                  style={{
                    fontSize: '11px',
                    fontWeight: '500',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: '#FAF6EE',
                    color: '#785A35',
                    border: '1px solid #EADBCC',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Sparkles size={12} color="#9E7437" />
                  {vspBadge}
                </span>
              ))}

              {sessionPlanText && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: '#FAF6EE',
                    color: '#8A6D3B',
                    border: '1px solid #EADBCC',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Repeat size={12} color="#9E7437" />
                  {sessionPlanText}
                </span>
              )}
            </div>

            {/* Benefits Section Header */}
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: '600',
                color: '#8A6D3B',
                marginBottom: '8px',
                letterSpacing: '0.02em'
              }}
            >
              Benefits :
            </div>

            {/* Clean Bullet List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {cleanHighlights.map((hl, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    fontSize: '12.5px',
                    color: '#1C1917',
                    lineHeight: 1.45,
                    fontWeight: '500'
                  }}
                >
                  <span
                    style={{
                      color: '#1C1917',
                      fontSize: '13px',
                      lineHeight: 1,
                      marginTop: '2px',
                      flexShrink: 0,
                      fontWeight: '700'
                    }}
                  >
                    -
                  </span>
                  <span>{hl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Price & Select Service CTA */}
          <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '14px' }}>
              <span
                style={{
                  fontSize: '28px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: '500',
                  color: '#8A6D3B',
                  lineHeight: 1,
                  letterSpacing: '0.01em'
                }}
              >
                ₹ {formattedPrice}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: '#B35E44',
                  background: '#FAF0EB',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontWeight: '600'
                }}
              >
                (plus taxes)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onSelectService}
                style={{
                  padding: '12px 38px',
                  borderRadius: '9999px',
                  background: isActiveInCart ? '#8C642D' : '#BA8758',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '12px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#9E6B38';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isActiveInCart ? '#8C642D' : '#BA8758';
                }}
              >
                {isActiveInCart ? '✓ SERVICE ADDED' : 'SELECT SERVICE'}
              </button>

              {isActiveInCart && onOpenTerms && (
                <button
                  type="button"
                  onClick={onOpenTerms}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '9999px',
                    background: '#FAF6EE',
                    color: '#8A6D3B',
                    border: '1px solid #EADBCC',
                    fontWeight: '600',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F2E8DC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FAF6EE';
                  }}
                  title="View Terms & Treatment Session Protocol"
                >
                  <ShieldCheck size={14} color="#8A6D3B" />
                  <span>Terms & Protocol</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
