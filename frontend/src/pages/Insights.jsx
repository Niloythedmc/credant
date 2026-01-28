import React, { useState } from 'react';
import PageContainer from '../components/PageContainer';

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
        <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '600' }}>{value}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--glass-border)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '3px' }} />
            </div>
        </div>
    );

    return (
        <PageContainer id="insights" activePage={activePage} index={index}>
            <div style={{
                padding: '24px',
                paddingTop: 'env(safe-area-inset-top, 24px)',
                minHeight: '100%',
                background: 'var(--bg-dark)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>Insights</h1>
                    <div style={{
                        background: 'var(--bg-card)', padding: '4px', borderRadius: '12px',
                        display: 'flex', border: '1px solid var(--glass-border)'
                    }}>
                        {['7d', '30d', 'All'].map(range => (
                            <button key={range}
                                onClick={() => setTimeRange(range)}
                                style={{
                                    border: 'none', background: timeRange === range ? 'var(--bg-dark)' : 'transparent',
                                    color: timeRange === range ? 'var(--primary)' : 'var(--text-muted)',
                                    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                                    textTransform: 'uppercase', cursor: 'pointer',
                                    boxShadow: timeRange === range ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Growth Card */}
                <div className="glass" style={{
                    padding: '20px', borderRadius: '24px', marginBottom: '20px',
                    background: 'linear-gradient(135deg, var(--bg-card), rgba(99, 102, 241, 0.05))',
                    border: '1px solid var(--glass-border)',
                }}>
                    <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Subscribers</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)' }}>158.2K</h2>
                            <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '700', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>+12.5%</span>
                        </div>
                    </div>

                    {/* SVG Chart */}
                    <div style={{ width: '100%', height: '150px', position: 'relative' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    {/* Demographics */}
                    <div className="glass" style={{
                        padding: '16px', borderRadius: '20px',
                        background: 'var(--bg-card)', border: '1px solid var(--glass-border)'
                    }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '12px' }}>Audience</h3>
                        <DemographicsBar label="Male" value={65} color="#3b82f6" />
                        <DemographicsBar label="Female" value={32} color="#ec4899" />
                        <DemographicsBar label="Other" value={3} color="#8b5cf6" />
                    </div>

                    {/* Engagement */}
                    <div className="glass" style={{
                        padding: '16px', borderRadius: '20px',
                        background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center'
                    }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '12px' }}>Engagement</h3>
                        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent)' }}>8.4%</span>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Avg. Rate</p>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', height: '40px', alignItems: 'flex-end', justifyContent: 'center' }}>
                            {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                                <div key={i} style={{ width: '4px', height: `${h}%`, background: 'var(--text-muted)', borderRadius: '2px', opacity: 0.5 }} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Countries List */}
                <div className="glass" style={{
                    padding: '16px', borderRadius: '20px',
                    background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                    marginBottom: '80px'
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px' }}>Top Locations</h3>
                    {[
                        { country: "United States", flag: "🇺🇸", pct: "45%" },
                        { country: "United Kingdom", flag: "🇬🇧", pct: "20%" },
                        { country: "Germany", flag: "🇩🇪", pct: "12%" },
                    ].map((loc, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i === 2 ? 0 : '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '18px' }}>{loc.flag}</span>
                                <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>{loc.country}</span>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{loc.pct}</span>
                        </div>
                    ))}
                </div>

                {/* Trust Score */}
                <div className="glass" style={{
                    padding: '24px', borderRadius: '24px',
                    background: 'linear-gradient(135deg, var(--bg-card), rgba(16, 185, 129, 0.05))',
                    border: '1px solid var(--glass-border)',
                    marginBottom: '20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>Channel Trust Score</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>High credibility among top advertisers.</p>
                    </div>
                    <div style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                            position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
                            border: '4px solid var(--glass-border)',
                        }} />
                        <div style={{
                            position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
                            border: '4px solid #10b981', borderLeftColor: 'transparent',
                            transform: 'rotate(45deg)'
                        }} />
                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#10b981' }}>94</span>
                    </div>
                </div>

                {/* Market Intelligence / News */}
                <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px', paddingLeft: '4px' }}>Market Intelligence</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { title: "CPM Rates Stabilize in Tech Sector", time: "2h ago", color: "#3b82f6" },
                            { title: "New Ad Regulations Pending in EU Region", time: "5h ago", color: "#f59e0b" },
                            { title: "Crypto Ad Spend Expected to Rise +15%", time: "1d ago", color: "#10b981" },
                        ].map((news, i) => (
                            <div key={i} className="glass" style={{
                                padding: '16px', borderRadius: '16px',
                                background: 'var(--bg-card)',
                                borderLeft: `4px solid ${news.color}`,
                                display: 'flex', flexDirection: 'column', gap: '4px'
                            }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{news.title}</h4>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{news.time} • Ad Performance News</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </PageContainer>
    );
};

export default Insights;
