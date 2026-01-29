import React, { useState } from 'react';
import PageContainer from '../components/PageContainer';
import styles from './Insights.module.css';

const Insights = ({ activePage }) => {
    const index = 2; // Navigation order
    const [timeRange, setTimeRange] = useState('7d');

    // Mock Chart Data (Simple SVG Path Generator)
    const chartData = [10, 25, 18, 40, 35, 60, 55, 80, 75, 90, 85, 100];
    const maxVal = Math.max(...chartData);
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

    return (
        <PageContainer id="insights" activePage={activePage} index={index}>
            <div className={styles.page}>
                {/* Header */}
                <div className={styles.header}>
                    <h1 className={styles.title}>Insights</h1>
                    <div className={styles.timeFilter}>
                        {['7d', '30d', 'All'].map(range => (
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
                        <p className={styles.totalSubsLabel}>Total Subscribers</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <h2 className={styles.totalSubsValue}>158.2K</h2>
                            <span className={styles.growthBadge}>+12.5%</span>
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
                        <h3 className={styles.cardTitle}>Audience</h3>
                        <DemographicsBar label="Male" value={65} color="#3b82f6" />
                        <DemographicsBar label="Female" value={32} color="#ec4899" />
                        <DemographicsBar label="Other" value={3} color="#8b5cf6" />
                    </div>

                    {/* Engagement */}
                    <div className={`glass ${styles.engagementCard}`}>
                        <h3 className={styles.cardTitle}>Engagement</h3>
                        <div className={styles.engagementStat}>
                            <span className={styles.engagementValue}>8.4%</span>
                            <p className={styles.engagementLabel}>Avg. Rate</p>
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
                    <h3 className={styles.cardTitle}>Top Locations</h3>
                    {[
                        { country: "United States", flag: "🇺🇸", pct: "45%" },
                        { country: "United Kingdom", flag: "🇬🇧", pct: "20%" },
                        { country: "Germany", flag: "🇩🇪", pct: "12%" },
                    ].map((loc, i) => (
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
                        <h3 className={styles.trustTitle}>Channel Trust Score</h3>
                        <p className={styles.trustDesc}>High credibility among top advertisers.</p>
                    </div>
                    <div className={styles.trustCircleWrapper}>
                        <div className={styles.trustCircleBg} />
                        <div className={styles.trustCircleFg} />
                        <span className={styles.trustScore}>94</span>
                    </div>
                </div>

                {/* Market Intelligence / News */}
                <div className={styles.newsSection}>
                    <h3 className={styles.newsTitle}>Market Intelligence</h3>
                    <div className={styles.newsList}>
                        {[
                            { title: "CPM Rates Stabilize in Tech Sector", time: "2h ago", color: "#3b82f6" },
                            { title: "New Ad Regulations Pending in EU Region", time: "5h ago", color: "#f59e0b" },
                            { title: "Crypto Ad Spend Expected to Rise +15%", time: "1d ago", color: "#10b981" },
                        ].map((news, i) => (
                            <div key={i} className={`glass ${styles.newsCard}`} style={{ borderLeft: `4px solid ${news.color}` }}>
                                <h4 className={styles.newsHeadline}>{news.title}</h4>
                                <span className={styles.newsTime}>{news.time} • Ad Performance News</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </PageContainer>
    );
};

export default Insights;
