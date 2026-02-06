import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { useApi } from '../auth/useApi';
import styles from './Ads.module.css';
import { useTranslation } from 'react-i18next';
import AdCard from '../components/AdCard';
import Modal from '../components/Modal'; import { useTranslation } from 'react-i18next';

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
                    {/* Create button hidden here, usually accessed from Profile -> My Ads */}
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
                            isExpanded={selectedAd?.id === camp.id}
                            onToggle={() => setSelectedAd(selectedAd?.id === camp.id ? null : camp)}
                        />
                    ))}
                </div>

                {/* Ad Details Modal */}
                <Modal
                    isOpen={!!selectedAd}
                    onClose={() => setSelectedAd(null)}
                    title={selectedAd?.title || 'Ad Details'}
                >
                    {selectedAd && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Large Featured Image */}
                            {selectedAd.mediaPreview ? (
                                <img src={selectedAd.mediaPreview} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                                    📢
                                </div>
                            )}

                            {/* Description */}
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                                <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px', marginTop: 0 }}>Description</h3>
                                <p style={{ color: 'white', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                                    {selectedAd.description || 'No description provided.'}
                                </p>
                            </div>

                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>Duration</div>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{selectedAd.duration} Days</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>Total Budget</div>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4ade80' }}>
                                        {selectedAd.budget} TON
                                    </div>
                                </div>
                            </div>

                            {/* Link */}
                            {selectedAd.link && (
                                <button
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '12px',
                                        background: 'linear-gradient(90deg, #3b82f6, #9333ea)', border: 'none', color: 'white',
                                        fontWeight: '600', cursor: 'pointer', marginTop: '8px'
                                    }}
                                    onClick={() => window.open(selectedAd.link, '_blank')}
                                >
                                    Visit Link
                                </button>
                            )}
                        </div>
                    )}
                </Modal>
            </div>
        </PageContainer>
    );
};

export default Ads;
