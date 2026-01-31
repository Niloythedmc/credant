import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { useApi } from '../auth/useApi';
import styles from './Ads.module.css';
import { useTranslation } from 'react-i18next';

const Ads = ({ activePage }) => {
    const { t } = useTranslation();
    const index = 1;
    const { get } = useApi();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDeals = async () => {
            try {
                const data = await get('/deals');
                setCampaigns(data.deals || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchDeals();
    }, []);

    // Calculate Stats from Real Data
    const totalSpend = campaigns.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'posted' || c.status === 'approved').length;

    const stats = [
        { label: t('ads.totalSpend'), value: `${totalSpend} TON`, change: "+12%", bg: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(196, 181, 253, 0.05))" },
        { label: t('ads.activeAds'), value: activeCampaigns.toString(), change: "+5%", bg: "linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(251, 207, 232, 0.05))" },
        { label: t('ads.impressions'), value: "0", change: "-", bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(191, 219, 254, 0.05))" },
    ];

    const getStatusColor = (status) => {
        if (status === 'posted') return '#10b981'; // Green
        if (status === 'approved') return '#f59e0b'; // Amber
        if (status === 'pending') return '#9ca3af'; // Gray
        return '#6366f1';
    };

    const getStatusText = (status) => {
        return t(`ads.status.${status}`) || status;
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
                    <button className={styles.plusButton}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
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
                        <div key={camp.id} className={`glass ${styles.campaignCard}`}>
                            <div className={styles.imageWrapper}>
                                {/* Using placeholder image if mock data doesn't have it, or reusing image field logic if real data supports it */}
                                <img src={camp.image || "https://picsum.photos/100"} alt="Ad" className={styles.image} />
                                <div className={styles.statusDotWrapper}>
                                    <div className={styles.statusDot} style={{
                                        background: getStatusColor(camp.status),
                                        boxShadow: `0 0 6px ${getStatusColor(camp.status)}`
                                    }} />
                                </div>
                            </div>

                            <div className={styles.content}>
                                <div className={styles.campHeader}>
                                    <h3 className={styles.campId}>{t('ads.deal')} #{camp.id}</h3>
                                    <span className={styles.statusBadge} style={{
                                        color: getStatusColor(camp.status),
                                        background: `${getStatusColor(camp.status)}20`,
                                    }}>
                                        {getStatusText(camp.status)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <p className={styles.amount}>{t('ads.amount')}: {camp.amount} TON</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageContainer>
    );
};

export default Ads;
