import React from 'react';
import PageContainer from '../components/PageContainer';
import styles from './Channels.module.css';

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
        <svg className={styles.verifiedIcon} viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
    );

    const PriceBadge = ({ price, color }) => (
        <div className={styles.priceBadge}>
            <div className={styles.dot} style={{
                background: color === 'yellow' ? '#fbbf24' : '#3b82f6',
                boxShadow: color === 'yellow' ? '0 0 4px #fbbf24' : '0 0 4px #3b82f6',
            }} />
            <span className={styles.priceText}>
                {price}
            </span>
        </div>
    );

    return (
        <PageContainer id="channels" activePage={activePage} index={index}>
            <div className={styles.page}>
                {/* Header */}
                <header className={styles.header}>
                    <button className={styles.backButton}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <h1 className={styles.title}>Marketplace</h1>
                </header>

                {/* Search and Action */}
                <div className={styles.searchContainer}>
                    <div className={styles.searchInputWrapper}>
                        <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Find channels"
                            className={styles.searchInput}
                        />
                    </div>
                    <button className={styles.createButton}>
                        Create Campaign
                    </button>
                </div>

                {/* Channel List */}
                <div className={styles.channelList}>
                    {channels.map(channel => (
                        <div key={channel.id} className={styles.channelCard}>
                            <div className={styles.channelInfo}>
                                <img
                                    src={channel.avatar}
                                    alt={channel.name}
                                    className={styles.avatar}
                                />
                                <div>
                                    <div className={styles.nameWrapper}>
                                        <h3 className={styles.name}>{channel.name}</h3>
                                        {channel.verified && <VerifiedIcon />}
                                    </div>
                                    <p className={styles.subs}>{channel.subs}</p>
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
