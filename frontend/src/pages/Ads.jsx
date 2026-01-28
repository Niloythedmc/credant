import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { useApi } from '../auth/useApi';

const Ads = ({ activePage }) => {
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
        { label: "Total Spend", value: `${totalSpend} TON`, change: "+12%", bg: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(196, 181, 253, 0.05))" },
        { label: "Active Ads", value: activeCampaigns.toString(), change: "+5%", bg: "linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(251, 207, 232, 0.05))" },
        { label: "Impressions", value: "0", change: "-", bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(191, 219, 254, 0.05))" },
    ];

    const getStatusColor = (status) => {
        if (status === 'posted') return '#10b981'; // Green
        if (status === 'approved') return '#f59e0b'; // Amber
        if (status === 'pending') return '#9ca3af'; // Gray
        return '#6366f1';
    };

    return (
        <PageContainer id="ads" activePage={activePage} index={index}>
            <div style={{
                padding: '24px',
                paddingTop: 'env(safe-area-inset-top, 24px)',
                minHeight: '100%',
                background: 'var(--bg-dark)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Campaigns</h1>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Manage your promotions</p>
                    </div>
                    <button style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                        border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                        cursor: 'pointer'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
                    {stats.map((stat, i) => (
                        <div key={i} className="glass" style={{
                            padding: '12px', borderRadius: '16px',
                            background: stat.bg,
                            border: '1px solid var(--glass-border)',
                            display: 'flex', flexDirection: 'column', gap: '4px'
                        }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>{stat.label}</span>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>{stat.value}</span>
                            <span style={{ fontSize: '10px', color: stat.change.startsWith('+') ? '#10b981' : '#f43f5e', fontWeight: '700' }}>{stat.change}</span>
                        </div>
                    ))}
                </div>

                {/* Active Campaigns */}
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px' }}>Recent Activity</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
                    {loading && <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading Campaigns...</div>}

                    {!loading && campaigns.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No campaigns found.</div>}

                    {campaigns.map(camp => (
                        <div key={camp.id} className="glass" style={{
                            padding: '16px', borderRadius: '20px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--glass-border)',
                            boxShadow: 'var(--card-shadow)',
                            display: 'flex', gap: '16px', alignItems: 'center'
                        }}>
                            <div style={{ position: 'relative' }}>
                                {/* Using placeholder image if mock data doesn't have it, or reusing image field logic if real data supports it */}
                                <img src={camp.image || "https://picsum.photos/100"} alt="Ad" style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover' }} />
                                <div style={{
                                    position: 'absolute', bottom: -4, right: -4,
                                    background: 'var(--bg-card)', padding: '2px', borderRadius: '50%'
                                }}>
                                    <div style={{
                                        width: '10px', height: '10px', borderRadius: '50%',
                                        background: getStatusColor(camp.status),
                                        boxShadow: `0 0 6px ${getStatusColor(camp.status)}`
                                    }} />
                                </div>
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>Deal #{camp.id}</h3>
                                    <span style={{
                                        fontSize: '11px', fontWeight: '600',
                                        color: getStatusColor(camp.status),
                                        background: `${getStatusColor(camp.status)}20`,
                                        padding: '2px 8px', borderRadius: '6px'
                                    }}>
                                        {camp.status}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount: {camp.amount} TON</p>
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
