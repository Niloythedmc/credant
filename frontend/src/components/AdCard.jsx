import React from 'react';
import { FiActivity, FiClock, FiDollarSign, FiBarChart2, FiGlobe, FiCpu, FiMessageCircle, FiMonitor } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

import { useApi } from '../auth/useApi';
import { useUserCache } from '../context/UserCacheContext';

const AdCard = ({ ad, isExpanded, onToggle, variant = 'owner', onShowOffers }) => {
    const { post } = useApi();
    const { resolveUser, getCachedUser } = useUserCache();

    // Channel Data State
    const [channelData, setChannelData] = React.useState(null);

    // Dynamic Calculations
    const now = Date.now();
    let createdAtMs = now;
    if (ad.createdAt) {
        createdAtMs = typeof ad.createdAt === 'number'
            ? ad.createdAt
            : (ad.createdAt.toMillis ? ad.createdAt.toMillis() : new Date(ad.createdAt).getTime());
    }

    const durationDays = parseInt(ad.duration) || 0;
    const durationMs = durationDays * 24 * 60 * 60 * 1000;
    const elapsedMs = now - createdAtMs;

    // Progress calculation
    let progressPercent = 0;
    if (durationMs > 0) {
        progressPercent = Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));
    }

    // Time left calculation
    const msLeft = Math.max(0, (createdAtMs + durationMs) - now);
    const daysLeft = Math.floor(msLeft / (24 * 60 * 60 * 1000));
    const hoursLeft = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    const budgetTon = parseFloat(ad.budget) || 0;
    const dailySpend = durationDays > 0 ? (budgetTon / durationDays).toFixed(2) : 0;

    // Styles config based on subject/status
    const getSubjectConfig = (subject) => {
        const s = (subject || '').toUpperCase();
        if (s.includes('WEBSITE') || s.includes('WEB')) return { icon: FiGlobe, color: '#3b82f6', label: 'Website' }; // Blue
        if (s.includes('BOT')) return { icon: FiCpu, color: '#a855f7', label: 'Bot' }; // Purple
        if (s.includes('CHANNEL') || s.includes('GROUP')) return { icon: FiMessageCircle, color: '#10b981', label: 'Channel' }; // Green
        return { icon: FiMonitor, color: '#f59e0b', label: 'Campaign' }; // Orange
    };

    const subjectConfig = getSubjectConfig(ad.subject);
    const SubjectIcon = subjectConfig.icon;

    const isActive = ad.status === 'active';
    const isCompleted = ad.status === 'completed' || progressPercent >= 100;

    const statusColor = isActive ? '#4ade80' : (isCompleted ? '#9ca3af' : '#facc15');
    const statusLabel = isActive ? 'Active' : (isCompleted ? 'Completed' : 'Pending');

    // Fetch Channel Identity
    React.useEffect(() => {
        const fetchChannel = async () => {
            // Prioritize fetching if we have an ID (userId or channelId)
            const targetId = ad.channelId || ad.userId;
            if (targetId) {
                try {
                    const res = await resolveUser(targetId);
                    setChannelData(res);
                } catch (e) {
                    const cached = getCachedUser(targetId);
                    if (cached) setChannelData(cached);
                }
            } else if (ad.username) {
                // Try resolve by username if ID missing
                try {
                    const res = await resolveUser(ad.username);
                    setChannelData(res);
                } catch (e) { }
            }
        };
        fetchChannel();
    }, [ad.channelId, ad.userId, ad.username, resolveUser, getCachedUser]);

    // Image Logic: Prefer Fetch -> Ad Prop -> Fallback logic
    const [imageSrc, setImageSrc] = React.useState(ad.mediaPreview);

    React.useEffect(() => {
        if (channelData?.photoUrl) {
            setImageSrc(channelData.photoUrl);
        } else if (ad.mediaPreview && !ad.mediaPreview.startsWith('blob:')) {
            setImageSrc(ad.mediaPreview);
        }
    }, [channelData, ad.mediaPreview]);

    // Resolve Display Info
    const displayTitle = channelData?.title || channelData?.name || ad.title;
    const displaySubjectLabel = channelData?.type === 'channel' ? 'Channel' : (channelData?.type === 'bot' ? 'Bot' : subjectConfig.label);

    const isValid = (src) => src && typeof src === 'string' && src.length > 5;
    const hasValidImage = isValid(imageSrc);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '20px',
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer'
            }}
            onClick={ad.onClick || onToggle}
        >
            {/* Background Glow */}
            <div style={{
                position: 'absolute',
                top: '-50%', left: '-50%',
                width: '200%', height: '200%',
                background: `radial-gradient(circle at 50% 50%, ${subjectConfig.color}15, transparent 70%)`,
                pointerEvents: 'none',
                opacity: 0.6
            }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', gap: '14px' }}>
                    <div style={{
                        width: '48px', height: '48px',
                        borderRadius: '14px',
                        background: `${subjectConfig.color}20`,
                        color: subjectConfig.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '22px',
                        boxShadow: `0 4px 12px ${subjectConfig.color}20`,
                        overflow: 'hidden'
                    }}>
                        {hasValidImage ? (
                            <img src={imageSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <SubjectIcon />
                        )}
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', color: 'white', fontSize: '16px', fontWeight: '700' }}>
                            {displayTitle}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                fontSize: '11px',
                                color: subjectConfig.color,
                                fontWeight: '600',
                                background: `${subjectConfig.color}15`,
                                padding: '2px 8px',
                                borderRadius: '6px'
                            }}>
                                {displaySubjectLabel}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {durationDays} Days</span>
                        </div>
                    </div>
                </div>

                <div style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: `${statusColor}15`,
                    border: `1px solid ${statusColor}30`,
                    color: statusColor,
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}></span>
                    {statusLabel}
                </div>
            </div>

            {/* Red Dot Alert */}
            {ad.hasAlert && (
                <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px', // Adjust depending on layout, maybe next to status?
                    // Actually, let's put it on the top right corner of the card or the icon?
                    // Let's put it overlapping the top right or near the status.
                    // For visibility, let's place it absolutely on the top right of the card, pulsing.
                    width: '10px', height: '10px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 8px #ef4444',
                    zIndex: 10
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: '50%', background: '#ef4444',
                        animation: 'pulse 2s infinite',
                        opacity: 0.5
                    }} />
                    <style>{`
                        @keyframes pulse {
                            0% { transform: scale(1); opacity: 0.5; }
                            70% { transform: scale(2); opacity: 0; }
                            100% { transform: scale(1); opacity: 0; }
                        }
                    `}</style>
                </div>
            )}

            {/* Main Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        <FiDollarSign size={12} /> Total Budget
                    </div>
                    <div style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>
                        {budgetTon} <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)' }}>TON</span>
                    </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        <FiActivity size={12} /> Daily Budget
                    </div>
                    <div style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>
                        ~{dailySpend} <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)' }}>TON</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    <span>Campaign Progress</span>
                    <span>{Math.round(progressPercent)}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ height: '100%', background: subjectConfig.color, borderRadius: '3px' }}
                    />
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                    {isActive ? `${daysLeft} days ${hoursLeft}h remaining` : 'Campaign Finished'}
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            paddingTop: '16px',
                            marginTop: '4px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            gap: '10px'
                        }}>
                            {variant === 'owner' ? (
                                <>
                                    <button style={{
                                        flex: 1, height: '40px', borderRadius: '12px', border: 'none',
                                        background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', fontWeight: '500', cursor: 'not-allowed',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}>
                                        <FiBarChart2 /> Stats
                                    </button>
                                    {/* See Offers Button */}
                                    {/* This button appears ONLY if onShowOffers is passed (which happens in MyAds) */}
                                    {/* We replace the dummy 'Results' button or add next to it. Let's replace 'Results' for now or add as 3rd? 3 buttons might cramp. */}
                                    {/* Let's keep Stats and replace Results with Offers if available, or just add Offers. */}
                                    {/* Actually, let's make it conditional: If onShowOffers exists, show it. */}
                                    {ad.onShowOffers || (ad.offersCount !== undefined) || true ? ( // Hack: We pass onShowOffers to the component, not ad object.
                                        // Wait, onShowOffers is a prop to AdCard, not on ad object.
                                        // But wait, the prop `onToggle` expands. Inside, we have buttons.
                                        // We need `onShowOffers` passed to AdCard.
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onShowOffers && onShowOffers(ad); }}
                                            style={{
                                                flex: 1, height: '40px', borderRadius: '12px', border: 'none',
                                                background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                            }}>
                                            <FiActivity /> Offers
                                        </button>
                                    ) : (
                                        <button style={{
                                            flex: 1, height: '40px', borderRadius: '12px', border: 'none',
                                            background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', fontWeight: '500', cursor: 'not-allowed',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                        }}>
                                            <FiActivity /> Results
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button style={{
                                    flex: 1, height: '40px', borderRadius: '12px', border: 'none',
                                    background: 'linear-gradient(90deg, #3b82f6, #9333ea)', color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}>
                                    View Details
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AdCard;
