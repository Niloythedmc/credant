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

                    {campaigns.map(camp => {
                        // Subject Icon Logic inline (simplified from MyAds)
                        const subject = (camp.subject || '').toUpperCase();
                        let icon = "📢";
                        let iconBg = "#f59e0b";
                        if (subject.includes('WEBSITE')) { icon = "🌐"; iconBg = "#3b82f6"; }
                        if (subject.includes('BOT')) { icon = "🤖"; iconBg = "#a855f7"; }
                        if (subject.includes('CHANNEL')) { icon = "💬"; iconBg = "#10b981"; }

                        return (
                            <div key={camp.id} className={`glass ${styles.campaignCard}`}>
                                <div className={styles.imageWrapper}>
                                    {/* Use Icon instead of Image since ads don't have images yet */}
                                    <div style={{
                                        width: '100%', height: '100%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '40px',
                                        background: `linear-gradient(135deg, ${iconBg}20, ${iconBg}05)`,
                                        color: iconBg
                                    }}>
                                        {icon}
                                    </div>

                                    <div className={styles.statusDotWrapper}>
                                        <div className={styles.statusDot} style={{
                                            background: getStatusColor(camp.status),
                                            boxShadow: `0 0 6px ${getStatusColor(camp.status)}`
                                        }} />
                                    </div>
                                </div>

                                <div className={styles.content}>
                                    <div className={styles.campHeader}>
                                        <h3 className={styles.campId}>{camp.title}</h3>
                                        <span className={styles.statusBadge} style={{
                                            color: getStatusColor(camp.status),
                                            background: `${getStatusColor(camp.status)}20`,
                                        }}>
                                            {getStatusText(camp.status)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <p className={styles.amount}>{t('ads.amount')}: {camp.budget} TON</p>
                                        <span style={{ fontSize: '12px', color: '#888' }}>{camp.duration} days</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </PageContainer>
    );
};

export default Ads;
