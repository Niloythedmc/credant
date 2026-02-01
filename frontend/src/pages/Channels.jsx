import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import styles from './Channels.module.css';
import { useTranslation } from 'react-i18next';
import { useApi } from '../auth/useApi';

import Modal from '../components/Modal';

const Channels = ({ activePage }) => {
    const { t } = useTranslation();
    const { get, post } = useApi(); // Added post
    const index = 3;

    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChannel, setSelectedChannel] = useState(null);

    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const data = await get('/channels');
                if (data && data.channels) {
                    setChannels(data.channels);

                    // Background Refresh Metadata for top channels
                    // We do this silently to update cache
                    setTimeout(() => {
                        data.channels.forEach(ch => {
                            // Only refresh if data seems stale (optional, but for now just refresh)
                            // Or simple fire-and-forget for all
                            post('/channels/refresh-metadata', { channelId: ch.id })
                                .catch(err => console.warn("Background refresh failed for", ch.id));
                        });
                    }, 1000);
                }
            } catch (error) {
                console.error("Failed to load channels", error);
            } finally {
                setLoading(false);
            }
        };
        fetchChannels();
    }, []);

    const VerifiedIcon = () => (
        <svg className={styles.verifiedIcon} viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
    );

    const PriceBadge = ({ price }) => {
        if (!price) return null;
        return (
            <div className={styles.priceBadge}>
                <div className={styles.dot} style={{ background: '#3b82f6', boxShadow: '0 0 4px #3b82f6' }} />
                <span className={styles.priceText}>${price}</span>
            </div>
        );
    };

    return (
        <PageContainer id="channels" activePage={activePage} index={index}>
            <div className={styles.page}>
                {/* Header */}
                <header className={styles.header}>
                    <button className={styles.backButton} onClick={() => window.history.back()}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <h1 className={styles.title}>{t('channels.title')}</h1>
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
                            placeholder={t('channels.searchPlaceholder')}
                            className={styles.searchInput}
                        />
                    </div>
                    <button className={styles.createButton}>
                        {t('channels.create')}
                    </button>
                </div>

                {/* Channel List */}
                <div className={styles.channelList}>
                    {loading && <div className={styles.loading}>{t('common.loading')}</div>}
                    {!loading && channels.length === 0 && <div className={styles.empty}>No channels found.</div>}

                    {channels.map(channel => (
                        <div
                            key={channel.id}
                            className={styles.channelCard}
                            onClick={() => setSelectedChannel(channel)}
                        >
                            <div className={styles.channelInfo}>
                                <img
                                    src={channel.photoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                                    alt={channel.title}
                                    className={styles.avatar}
                                />
                                <div>
                                    <div className={styles.nameWrapper}>
                                        <h3 className={styles.name}>{channel.title || channel.username}</h3>
                                        {channel.purityScore > 0 && <VerifiedIcon />}
                                    </div>
                                    <p className={styles.subs}>
                                        {channel.memberCount || 0} {t('channels.subs')}
                                        {channel.purityScore !== null && (
                                            <span style={{ marginLeft: '8px', color: '#4ade80', fontSize: '11px' }}>
                                                • {channel.purityScore}% Pure
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <PriceBadge price={channel.startPrice} />
                        </div>
                    ))}
                </div>

                {/* Channel Details Modal */}
                <Modal
                    isOpen={!!selectedChannel}
                    onClose={() => setSelectedChannel(null)}
                    title="Channel Details"
                >
                    {selectedChannel && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <img
                                src={selectedChannel.photoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                                style={{ width: '80px', height: '80px', borderRadius: '50%' }}
                            />
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                                    {selectedChannel.title}
                                </h3>
                                <div style={{ color: '#aaa', fontSize: '14px' }}>@{selectedChannel.username}</div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                                width: '100%',
                                marginTop: '10px'
                            }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#aaa' }}>Subscribers</div>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
                                        {selectedChannel.memberCount?.toLocaleString() || 0}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#aaa' }}>Purity Score</div>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4ade80' }}>
                                        {selectedChannel.purityScore ? `${selectedChannel.purityScore}%` : 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {selectedChannel.startPrice && (
                                <div style={{
                                    width: '100%',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    textAlign: 'center',
                                    marginTop: '8px'
                                }}>
                                    <div style={{ fontSize: '13px', color: '#93c5fd', marginBottom: '4px' }}>Starting Price</div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#60a5fa' }}>
                                        ${selectedChannel.startPrice}
                                    </div>
                                </div>
                            )}

                            <button style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '14px',
                                background: 'white',
                                color: 'black',
                                fontWeight: '600',
                                border: 'none',
                                marginTop: '12px',
                                cursor: 'pointer'
                            }}>
                                Place Bid
                            </button>
                        </div>
                    )}
                </Modal>
            </div>
        </PageContainer>
    );
};

export default Channels;
