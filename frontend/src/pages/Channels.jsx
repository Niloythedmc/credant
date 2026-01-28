import React from 'react';
import PageContainer from '../components/PageContainer';

const Channels = ({ activePage }) => {
    // Index for "side by side" transition. 
    // Navigation order: feed (0), ads (1), insights (2), channels (3), profile (4)
    const index = 3;

    // Mock Data based on Image
    const channels = [
        {
            id: 1,
            name: "Crypto Insights",
            verified: true,
            subs: "158.2K Subscribers",
            price: "508 TON",
            color: "yellow",
            avatar: "https://i.pravatar.cc/150?u=channel1"
        },
        {
            id: 2,
            name: "AI Daily",
            verified: false,
            subs: "158K Subs",
            price: "598 TON",
            color: "blue",
            avatar: "https://i.pravatar.cc/150?u=channel2"
        },
        {
            id: 3,
            name: "Startup Stories",
            verified: false,
            subs: "156K Subs",
            price: "508 TON",
            color: "blue",
            avatar: "https://i.pravatar.cc/150?u=channel3"
        },
        {
            id: 4,
            name: "Startup & Stritss", // Text garbled in image, approximation
            verified: false,
            subs: "190K Subs",
            price: "508 TON",
            color: "blue",
            avatar: "https://i.pravatar.cc/150?u=channel4"
        },
        {
            id: 5,
            name: "Stodid Key Games", // Text garbled
            verified: false,
            subs: "190K Subs",
            price: "598 TON",
            color: "blue",
            avatar: "https://i.pravatar.cc/150?u=channel5"
        }
    ];

    const VerifiedIcon = () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--icon-verified)" stroke="none" style={{ marginLeft: '4px' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
    );

    const PriceBadge = ({ price, color }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: color === 'yellow' ? '#fbbf24' : '#3b82f6',
                boxShadow: color === 'yellow' ? '0 0 4px #fbbf24' : '0 0 4px #3b82f6',
                border: '2px solid rgba(255,255,255,0.2)'
            }} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                {price}
            </span>
        </div>
    );

    return (
        <PageContainer id="channels" activePage={activePage} index={index}>
            <div style={{
                padding: '16px',
                paddingTop: 'env(safe-area-inset-top, 20px)',
                minHeight: '100%',
                background: 'var(--bg-dark)'
            }}>
                {/* Header */}
                <header style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '20px',
                    position: 'relative',
                    justifyContent: 'center',
                    padding: '10px 0'
                }}>
                    <button style={{ position: 'absolute', left: 0, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <h1 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)' }}>Marketplace</h1>
                </header>

                {/* Search and Action */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <div style={{
                        flex: 1,
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Find channels"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                padding: '12px',
                                outline: 'none',
                                width: '100%',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                    <button className="btn" style={{
                        fontSize: '14px',
                        padding: '0 20px',
                        whiteSpace: 'nowrap',
                        background: '#3b82f6', // Use solid blue for this button as per image
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
                    }}>
                        Create Campaign
                    </button>
                </div>

                {/* Channel List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '80px' }}>
                    {channels.map(channel => (
                        <div key={channel.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--bg-card)',
                            padding: '16px',
                            borderRadius: '20px',
                            border: '1px solid var(--glass-border)',
                            boxShadow: 'var(--card-shadow)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <img
                                    src={channel.avatar}
                                    alt={channel.name}
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '16px', // Rounded squares in image
                                        objectFit: 'cover'
                                    }}
                                />
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>{channel.name}</h3>
                                        {channel.verified && <VerifiedIcon />}
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{channel.subs}</p>
                                </div>
                            </div>
                            <PriceBadge price={channel.price} color={channel.color} />
                        </div>
                    ))}
                </div>
            </div>
        </PageContainer>
    );
};

export default Channels;
