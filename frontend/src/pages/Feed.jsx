import React, { useState, useEffect, useMemo } from 'react';
import PageContainer from '../components/PageContainer';
import styles from './Feed.module.css';
import AdCard from '../components/AdCard';
import { useTranslation } from 'react-i18next';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';
import Modal from '../components/Modal'; // Assuming we have a Modal for channel details

const Feed = ({ activePage, onNavigate }) => {
    const { t } = useTranslation();
    const index = 0;
    const { get } = useApi();
    const { user } = useAuth();

    // Data State
    const [ads, setAds] = useState([]);
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & Search State
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'ads', 'channels'
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'budget_high', 'members_high'

    // Selected Item for Details
    const [selectedChannel, setSelectedChannel] = useState(null);

    // 1. Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [adsData, channelsData] = await Promise.all([
                    get('/ads').catch(() => ({ ads: [] })),
                    get('/channels').catch(() => ({ channels: [] }))
                ]);

                // Normalize Ads
                const loadedAds = Array.isArray(adsData) ? adsData : (adsData.ads || []);
                // Normalize Channels
                const loadedChannels = Array.isArray(channelsData) ? channelsData : (channelsData.channels || []);

                setAds(loadedAds.map(ad => ({ ...ad, type: 'ad' })));
                setChannels(loadedChannels.map(ch => ({ ...ch, type: 'channel' })));

            } catch (error) {
                console.error("Failed to load feed data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 2. Filter & Sort Logic
    const filteredItems = useMemo(() => {
        let items = [];

        // specific filtering
        if (activeTab === 'all') {
            items = [...ads, ...channels];
        } else if (activeTab === 'ads') {
            items = [...ads];
        } else if (activeTab === 'channels') {
            items = [...channels];
        }

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(item => {
                const title = (item.title || item.name || '').toLowerCase();
                const desc = (item.description || item.postText || '').toLowerCase();
                return title.includes(q) || desc.includes(q);
            });
        }

        // Sort
        items.sort((a, b) => {
            if (sortBy === 'newest') {
                const getTime = (obj) => {
                    const t = obj.createdAt || obj.verificationStartTime;
                    if (!t) return 0;
                    if (typeof t === 'number') return t;
                    if (t.toMillis) return t.toMillis();
                    if (t._seconds) return t._seconds * 1000;
                    return 0;
                };
                return getTime(b) - getTime(a);
            }
            if (sortBy === 'budget_high') {
                const valA = parseFloat(a.budget || a.startPrice || 0);
                const valB = parseFloat(b.budget || b.startPrice || 0);
                return valB - valA;
            }
            if (sortBy === 'members_high') {
                const memA = a.memberCount || 0;
                const memB = b.memberCount || 0;
                return memB - memA;
            }
            return 0;
        });

        return items;
    }, [ads, channels, activeTab, searchQuery, sortBy]);


    // Helper: Channel Card Component (Inline for now or matching Channels.jsx style)
    const renderChannelCard = (channel) => (
        <div key={channel.id} className={styles.channelCard} onClick={() => setSelectedChannel(channel)}>
            <div className={styles.channelInfo}>
                <img
                    src={channel.photoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                    alt={channel.title}
                    className={styles.channelAvatar}
                />
                <div className={styles.channelDetails}>
                    <h3 className={styles.channelTitle}>
                        {channel.title || 'Channel'}
                        {channel.purityScore > 80 && <span title="Verified" style={{ marginLeft: 4 }}>✅</span>}
                    </h3>
                    <span className={styles.channelSub}>
                        {channel.memberCount ? `${channel.memberCount.toLocaleString()} subs` : 'No subs info'}
                        {channel.username ? ` • @${channel.username}` : ''}
                    </span>
                </div>
            </div>
            {(channel.startPrice || channel.purityScore) && (
                <div style={{ textAlign: 'right' }}>
                    {channel.startPrice && <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>${channel.startPrice}</div>}
                    {channel.purityScore && <div style={{ fontSize: 11, color: '#4ade80' }}>{channel.purityScore}% Pure</div>}
                </div>
            )}
        </div>
    );

    return (
        <PageContainer id="feed" activePage={activePage} index={index}>
            <div className={styles.page}>
                {/* Header with Search & Controls */}
                <div className={styles.header}>
                    <h1 className={styles.headerTitle}>{t('feed.title')}</h1>

                    <div className={styles.controls}>
                        {/* Search Bar */}
                        <div className={styles.searchContainer}>
                            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input
                                type="text"
                                placeholder="Search ads & channels..."
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Filters & Sort Row */}
                        <div className={styles.filtersRow}>
                            <div className={styles.tabs}>
                                <button
                                    className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
                                    onClick={() => setActiveTab('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === 'ads' ? styles.tabActive : ''}`}
                                    onClick={() => setActiveTab('ads')}
                                >
                                    Ads
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === 'channels' ? styles.tabActive : ''}`}
                                    onClick={() => setActiveTab('channels')}
                                >
                                    Channels
                                </button>
                            </div>

                            <select
                                className={styles.sortSelect}
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="newest">Newest</option>
                                <option value="budget_high">Budget High</option>
                                <option value="members_high">Members High</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Content List */}
                <div className={styles.feedGrid}>
                    {loading && <div className={styles.loading}>Loading feed...</div>}

                    {!loading && filteredItems.length === 0 && (
                        <div className={styles.emptyState}>
                            No items found matching your filters.
                        </div>
                    )}

                    {!loading && filteredItems.map(item => {
                        if (item.type === 'ad') {
                            return (
                                <AdCard
                                    key={item.id}
                                    ad={item}
                                    variant="feed" // Pass a variant if needed
                                    isExpanded={false}
                                    onToggle={() => {
                                        // Navigate to Ads -> Details
                                        sessionStorage.setItem('openAdId', item.id);
                                        if (onNavigate) onNavigate('ads');
                                    }} // Could open details
                                />
                            );
                        } else {
                            return renderChannelCard(item);
                        }
                    })}
                </div>

                {/* Channel Details Modal (Simple) */}
                <Modal
                    isOpen={!!selectedChannel}
                    onClose={() => setSelectedChannel(null)}
                    title={selectedChannel?.title || 'Channel'}
                >
                    {selectedChannel && (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <img
                                src={selectedChannel.photoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                                style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: 16 }}
                            />
                            <h3>{selectedChannel.title}</h3>
                            <p style={{ color: '#aaa', marginBottom: 20 }}>@{selectedChannel.username}</p>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 10 }}>
                                    <div style={{ fontSize: 12, color: '#aaa' }}>Subscribers</div>
                                    <div style={{ fontWeight: 'bold' }}>{selectedChannel.memberCount?.toLocaleString() || 0}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 10 }}>
                                    <div style={{ fontSize: 12, color: '#aaa' }}>Purity</div>
                                    <div style={{ fontWeight: 'bold', color: '#4ade80' }}>{selectedChannel.purityScore || 0}%</div>
                                </div>
                            </div>

                            <button onClick={() => window.open(`https://t.me/${selectedChannel.username}`, '_blank')} style={{
                                marginTop: 24, width: '100%', padding: 14, background: 'white', color: 'black', border: 'none', borderRadius: 14, fontWeight: 'bold', cursor: 'pointer'
                            }}>
                                View on Telegram
                            </button>
                        </div>
                    )}
                </Modal>
            </div>
        </PageContainer>
    );
};

export default Feed;
