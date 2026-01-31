import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import styles from './Insights.module.css';
import { useTranslation } from 'react-i18next';
import { useApi } from '../auth/useApi';

const Insights = ({ activePage }) => {
    const { t } = useTranslation();
    const { get } = useApi();
    const index = 2; // Navigation order
    const [timeRange, setTimeRange] = useState('7d');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const data = await get('/insights');
                if (data && data.stats) {
                    setStats(data.stats);
                }
            } catch (error) {
                console.error("Failed to load insights", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, []);

    // Default chart data if stats is null (loading/error)
    const chartData = stats?.chartData || [0, 0, 0, 0, 0, 0];
    const maxVal = Math.max(...chartData) || 100;
    const points = chartData.map((val, i) => {
        const x = (i / (chartData.length - 1)) * 100;
        const y = 100 - (val / maxVal) * 80; // keep some padding top
        return `${x},${y}`;
    }).join(' ');

    const DemographicsBar = ({ label, value, color }) => (
        <div className={styles.demoBar}>
            <div className={styles.demoLabelRow}>
                <span className={styles.demoLabel}>{label}</span>
                <span className={styles.demoValue}>{value}%</span>
            </div>
            <div className={styles.demoTrack}>
                <div className={styles.demoFill} style={{ width: `${value}%`, background: color }} />
            </div>
        </div>
    );

    if (loading) {
        return (
            <PageContainer id="insights" activePage={activePage} index={index}>
                <div className={styles.page}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>{t('insights.title')}</h1>
                    </div>
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {t('common.loading')}
                    </div>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer id="insights" activePage={activePage} index={index}>
            <div className={styles.page}>
                {/* Header */}
                <div className={styles.header}>
                    <h1 className={styles.title}>{t('insights.title')}</h1>
                    <div className={styles.timeFilter}>
                        {['7d', '30d', t('insights.time.all')].map(range => (
                            <button key={range}
                                onClick={() => setTimeRange(range)}
                                className={`${styles.rangeButton} ${timeRange === range ? styles.rangeButtonActive : ''}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Growth Card */}
                <div className={`glass ${styles.growthCard}`}>
                    <div className={styles.growthHeader}>
                        <p className={styles.totalSubsLabel}>{t('insights.totalSubs')}</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <h2 className={styles.totalSubsValue}>{(stats?.subscribers || 0).toLocaleString()}</h2>
                            <span className={styles.growthBadge} style={{
                                color: (stats?.growth || 0) >= 0 ? '#10b981' : '#ef4444'
                            }}>
                                {(stats?.growth || 0) > 0 ? '+' : ''}{stats?.growth}%
                            </span>
                        </div>
                    </div>

                    {/* SVG Chart */}
                    <div className={styles.chartContainer}>
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                            {/* Gradient Defs */}
                            <defs>
                                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            {/* Fill Area */}
                            <path d={`M0,100 L0,${100 - (chartData[0] / maxVal) * 80} ${points.split(' ').map(p => `L${p}`).join(' ')} L100,${100 - (chartData[chartData.length - 1] / maxVal) * 80} L100,100 Z`} fill="url(#chartGradient)" />
                            {/* Line */}
                            <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                            {/* Dots */}
                            {chartData.map((val, i) => {
                                const x = (i / (chartData.length - 1)) * 100;
                                const y = 100 - (val / maxVal) * 80;
                                return <circle key={i} cx={x} cy={y} r="1.5" fill="var(--bg-dark)" stroke="var(--primary)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                            })}
                        </svg>
                    </div>
                </div>

                {/* Sub Grids */}
                <div className={styles.gridContainer}>
                    {/* Demographics */}
                    <div className={`glass ${styles.demographicsCard}`}>
                        <h3 className={styles.cardTitle}>{t('insights.audience')}</h3>
                        <DemographicsBar label={t('insights.male')} value={stats?.demographics?.male || 0} color="#3b82f6" />
                        <DemographicsBar label={t('insights.female')} value={stats?.demographics?.female || 0} color="#ec4899" />
                        <DemographicsBar label={t('insights.other')} value={stats?.demographics?.other || 0} color="#8b5cf6" />
                    </div>

                    {/* Engagement */}
                    <div className={`glass ${styles.engagementCard}`}>
                        <h3 className={styles.cardTitle}>{t('insights.engagement')}</h3>
                        <div className={styles.engagementStat}>
                            <span className={styles.engagementValue}>{(stats?.engagement || 8.4)}%</span>
                            <p className={styles.engagementLabel}>{t('insights.avgRate')}</p>
                        </div>
                        <div className={styles.barChart}>
                            {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                                <div key={i} className={styles.chartBar} style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Countries List */}
                <div className={`glass ${styles.locationsCard}`}>
                    <h3 className={styles.cardTitle}>{t('insights.locations')}</h3>
                    {(stats?.topCountries || [
                        { country: "United States", flag: "🇺🇸", pct: "45%" },
                        { country: "United Kingdom", flag: "🇬🇧", pct: "20%" },
                        { country: "Germany", flag: "🇩🇪", pct: "12%" },
                    ]).map((loc, i) => (
                        <div key={i} className={styles.locationRow}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className={styles.flag}>{loc.flag}</span>
                                <span className={styles.countryName}>{loc.country}</span>
                            </div>
                            <span className={styles.pct}>{loc.pct}</span>
                        </div>
                    ))}
                </div>

                {/* Trust Score */}
                <div className={`glass ${styles.trustCard}`}>
                    <div>
                        <h3 className={styles.trustTitle}>{t('insights.trustScore')}</h3>
                        <p className={styles.trustDesc}>{t('insights.trustDesc')}</p>
                    </div>
                    <div className={styles.trustCircleWrapper}>
                        <div className={styles.trustCircleBg} />
                        <div className={styles.trustCircleFg} />
                        <span className={styles.trustScore}>{stats?.trustScore || 85}</span>
                    </div>
                </div>

                {/* Market Intelligence / News */}
                <div className={styles.newsSection}>
                    <h3 className={styles.newsTitle}>{t('insights.news')}</h3>
                    <div className={styles.newsList}>
                        {[
                            { title: "CPM Rates Stabilize in Tech Sector", time: "2h ago", color: "#3b82f6" },
                            { title: "New Ad Regulations Pending in EU Region", time: "5h ago", color: "#f59e0b" },
                            { title: "Crypto Ad Spend Expected to Rise +15%", time: "1d ago", color: "#10b981" },
                        ].map((news, i) => (
                            <div key={i} className={`glass ${styles.newsCard}`} style={{ borderLeft: `4px solid ${news.color}` }}>
                                <h4 className={styles.newsHeadline}>{news.title}</h4>
                                <span className={styles.newsTime}>{news.time} • {t('insights.newsTag')}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </PageContainer>
    );
};

export default Insights;
