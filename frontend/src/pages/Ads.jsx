import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { useApi } from '../auth/useApi';
import styles from './Ads.module.css';
import { useTranslation } from 'react-i18next';
import AdCard from '../components/AdCard';
import { AnimatePresence, motion } from 'framer-motion';

const Ads = ({ activePage }) => {
    const { t } = useTranslation();
    const index = 1;
    const { get } = useApi();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAd, setSelectedAd] = useState(null);

    useEffect(() => {
        const fetchAds = async () => {
            try {
                const data = await get('/ads'); // Public ads endpoint
                // Response is array directly
                setCampaigns(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchAds();
    }, []);

    // Calculate Stats from Real Data
    const totalSpend = campaigns.reduce((acc, curr) => acc + (parseFloat(curr.budget) || 0), 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

    const stats = [
        { label: t('ads.totalSpend'), value: `${totalSpend.toFixed(1)} TON`, change: "+12%", bg: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(196, 181, 253, 0.05))" },
        { label: t('ads.activeAds'), value: activeCampaigns.toString(), change: "+5%", bg: "linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(251, 207, 232, 0.05))" },
        { label: t('ads.impressions'), value: "0", change: "-", bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(191, 219, 254, 0.05))" },
    ];

    const getStatusColor = (status) => {
        if (status === 'active') return '#10b981'; // Green
        if (status === 'completed') return '#9ca3af'; // Gray
        return '#f59e0b'; // Amber (pending)
    };

    const getStatusText = (status) => {
        return status ? status.toUpperCase() : 'UNKNOWN';
    };

    return (
        <PageContainer id="ads" activePage={activePage} index={index}>
            <div className={styles.page}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>{t('ads.title')}</h1>
                        <p className={styles.subtitle}>{t('ads.subtitle')}</p>
                    </div>
                </div>

                {/* Stats Row */}
                <div className={styles.statsGrid}>
                    {stats.map((stat, i) => (
                        <div key={i} className={`glass ${styles.statsCard}`} style={{ background: stat.bg }}>
                            <span className={styles.statsLabel}>{stat.label}</span>
                            <span className={styles.statsValue}>{stat.value}</span>
                            <span className={styles.statsChange} style={{ color: stat.change.startsWith('+') ? '#10b981' : '#f43f5e' }}>{stat.change}</span>
                        </div>
                    ))}
                </div>

                {/* Active Campaigns */}
                <h2 className={styles.activityTitle}>{t('ads.recent')}</h2>
                <div className={styles.campaignList}>
                    {loading && <div className={styles.loading}>{t('ads.loading')}</div>}
                    {!loading && campaigns.length === 0 && <div className={styles.emptyState}>{t('ads.empty')}</div>}

                    {campaigns.map(camp => (
                        <AdCard
                            key={camp.id}
                            ad={camp}
                            variant="public"
                            isExpanded={false} // No expansion, just click to open details
                            onToggle={() => setSelectedAd(camp)}
                        />
                    ))}
                </div>

                {/* Ad Details Slide-Up Page */}
                <AnimatePresence>
                    {selectedAd && (
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{
                                position: 'fixed',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: '#000', // Match theme background
                                zIndex: 100,
                                padding: '20px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {/* Header with Back Button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <button
                                    onClick={() => setSelectedAd(null)}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                                        width: 40, height: 40, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                </button>
                                <h2 style={{ margin: 0, fontSize: 20 }}>Ad Details</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Large Featured Image */}
                                {selectedAd.mediaPreview ? (
                                    <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                                        <img src={selectedAd.mediaPreview} style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'cover' }} />
                                    </div>
                                ) : (
                                    <div style={{ width: '100%', height: '150px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px' }}>
                                        📢
                                    </div>
                                )}

                                <div>
                                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{selectedAd.title}</h1>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '4px 10px', borderRadius: '8px', fontSize: '13px' }}>
                                            {selectedAd.subject?.toUpperCase() || 'CAMPAIGN'}
                                        </span>
                                        <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '4px 10px', borderRadius: '8px', fontSize: '13px' }}>
                                            {selectedAd.status?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {/* Description */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '10px', marginTop: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>About this Campaign</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {selectedAd.description || 'No description provided.'}
                                    </p>
                                </div>

                                {/* Stats Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '4px' }}>Duration</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedAd.duration} Days</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '4px' }}>Total Budget</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4ade80' }}>
                                            {selectedAd.budget} TON
                                        </div>
                                    </div>
                                </div>

                                {/* Link Action */}
                                {selectedAd.link && (
                                    <button
                                        style={{
                                            width: '100%', padding: '16px', borderRadius: '16px',
                                            background: 'linear-gradient(90deg, #3b82f6, #9333ea)',
                                            border: 'none', color: 'white',
                                            fontWeight: '600', fontSize: '16px', cursor: 'pointer',
                                            marginTop: '10px',
                                            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)'
                                        }}
                                        onClick={() => window.open(selectedAd.link, '_blank')}
                                    >
                                        Visit Project / Channel
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageContainer>
    );
};
export default Ads;
