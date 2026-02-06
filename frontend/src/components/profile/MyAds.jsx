import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiActivity, FiClock, FiDollarSign, FiBarChart2, FiGlobe, FiCpu, FiMessageCircle, FiMonitor } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const MyAds = ({ ads, onNavigate, onRefresh }) => {
    const { t } = useTranslation();
    const [expandedId, setExpandedId] = useState(null);

    if (!ads || ads.length === 0) {
        return (
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '24px',
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                marginTop: '10px'
            }}>
                <div style={{
                    width: '60px', height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '24px'
                }}>
                    📢
                </div>
                <h3 style={{ color: 'var(--text-main)', margin: '0 0 8px', fontSize: '18px' }}>{t('profile.noAds')}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 24px', maxWidth: '80%', display: 'inline-block' }}>
                    Start promoting your channel or project today and reach thousands of users.
                </p>
                <button
                    onClick={() => onNavigate('postAds')}
                    style={{
                        background: 'linear-gradient(90deg, #3b82f6, #9333ea)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '16px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                        transition: 'transform 0.2s'
                    }}
                >
                    {t('profile.postAds')}
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {t('profile.ads')}
                    <span style={{
                        fontSize: '12px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#60a5fa',
                        padding: '2px 8px',
                        borderRadius: '12px'
                    }}>{ads.length}</span>
                </h3>
                <button
                    onClick={() => onNavigate('postAds')}
                    style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        border: 'none',
                        width: '32px', height: '32px',
                        borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {ads.map((ad, i) => (
                    <AdCard key={ad.id || i} ad={ad} isExpanded={expandedId === ad.id} onToggle={() => setExpandedId(expandedId === ad.id ? null : ad.id)} />
                ))}
            </div>
        </div>
    );
};

const AdCard = ({ ad, isExpanded, onToggle }) => {
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
            onClick={onToggle}
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
                        boxShadow: `0 4px 12px ${subjectConfig.color}20`
                    }}>
                        <SubjectIcon />
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', color: 'white', fontSize: '16px', fontWeight: '700' }}>
                            {ad.title}
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
                                {subjectConfig.label}
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
                            <button style={{
                                flex: 1, height: '40px', borderRadius: '12px', border: 'none',
                                background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', fontWeight: '500', cursor: 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}>
                                <FiBarChart2 /> Stats
                            </button>
                            <button style={{
                                flex: 1, height: '40px', borderRadius: '12px', border: 'none',
                                background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', fontWeight: '500', cursor: 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}>
                                <FiActivity /> Results
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default MyAds;
