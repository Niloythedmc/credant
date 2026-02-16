import React, { useState, useEffect, useMemo } from 'react';
import PageContainer from '../components/PageContainer';
import styles from './Feed.module.css';
import AdCard from '../components/AdCard';
import Dropdown from '../components/Dropdown';
import { useTranslation } from 'react-i18next';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';
import Modal from '../components/Modal'; // Assuming we have a Modal for channel details
import AdDetailsModal from '../components/AdDetailsModal';
// import { useTelegram } from '../context/TelegramContext'; // Not needed if hiding is automatic
import { ArrowRight, Check, Eye, DollarSign, Users, Globe, ExternalLink } from 'lucide-react';

// Helper Function (Module Scope)
// Helper Function (Module Scope)
const getRandomWaveGradient = () => {
    // Premium Wave/Mesh Gradient
    // darker base with vibrant pops of color (Cyan, Blue, Purple, Pink)
    const colors = [
        'hsla(210, 100%, 50%, 0.4)',  // Blue
        'hsla(260, 100%, 60%, 0.4)',  // Purple
        'hsla(180, 100%, 45%, 0.4)',  // Cyan
        'hsla(320, 100%, 50%, 0.4)'   // Pink
    ];

    // Pick 2 random colors
    const c1 = colors[Math.floor(Math.random() * colors.length)];
    const c2 = colors[Math.floor(Math.random() * colors.length)];

    return `
        radial-gradient(circle at ${20 + Math.random() * 60}% ${20 + Math.random() * 60}%, ${c1}, transparent 60%),
        radial-gradient(circle at ${20 + Math.random() * 60}% ${20 + Math.random() * 60}%, ${c2}, transparent 60%),
        radial-gradient(at 100% 0%, hsla(280, 100%, 20%, 0.3) 0px, transparent 50%),
        radial-gradient(at 0% 100%, hsla(220, 100%, 20%, 0.3) 0px, transparent 50%)
    `;
};

const Feed = ({ activePage, onNavigate }) => {
    const { t } = useTranslation();
    const index = 0;
    const { get } = useApi();
    const { user } = useAuth();
    // const { tg } = useTelegram(); // Removed: Context handles hiding automatically if no handlers


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
    const [selectedAd, setSelectedAd] = useState(null);

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
                                placeholder={t('feed.searchPlaceholder', 'Search ads & channels...')}
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
                                    {t('feed.filterAll', 'All')}
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === 'ads' ? styles.tabActive : ''}`}
                                    onClick={() => setActiveTab('ads')}
                                >
                                    {t('feed.filterAds', 'Ads')}
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === 'channels' ? styles.tabActive : ''}`}
                                    onClick={() => setActiveTab('channels')}
                                >
                                    {t('feed.filterChannels', 'Channels')}
                                </button>
                            </div>

                            <Dropdown
                                value={sortBy}
                                onChange={setSortBy}
                                options={[
                                    { value: 'newest', label: t('feed.sortNewest', 'Newest') },
                                    { value: 'budget_high', label: t('feed.sortBudgetHigh', 'Budget High') },
                                    { value: 'members_high', label: t('feed.sortMembersHigh', 'Members High') }
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Content List */}
                <div className={styles.feedGrid}>
                    {loading && <div className={styles.loading}>{t('feed.loading', 'Loading feed...')}</div>}

                    {!loading && filteredItems.length === 0 && (
                        <div className={styles.emptyState}>
                            {t('feed.emptyState', 'No items found matching your filters.')}
                        </div>
                    )}

                    {!loading && (() => {
                        // Mix Logic:
                        // 1. If 'All' tab: Mix Ads and Channels
                        // 2. Ads appear randomly (shuffled)
                        // 3. Channels appear in sections (chunks of 2-3) inserted between ads

                        if (activeTab === 'ads') {
                            return ads.map(ad => (
                                <AdCard
                                    key={ad.id}
                                    ad={ad}
                                    variant="feed"
                                    isExpanded={false}
                                    onToggle={() => setSelectedAd(ad)}
                                />
                            ));
                        }

                        if (activeTab === 'channels') {
                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                    {channels.map(ch => (
                                        <ChannelCard
                                            key={ch.id}
                                            channel={ch}
                                            onClick={() => setSelectedChannel(ch)}
                                        />
                                    ))}
                                </div>
                            );
                        }

                        // Mixed Feed Logic
                        const mixedContent = [];
                        const shuffledAds = [...ads].sort(() => Math.random() - 0.5); // Randomize ads
                        const channelChunks = [];
                        for (let i = 0; i < channels.length; i += 3) {
                            channelChunks.push(channels.slice(i, i + 3));
                        }

                        let adIdx = 0;
                        let chIdx = 0;

                        // Patter: 3 Ads -> 1 Channel Section -> 3 Ads -> ...
                        while (adIdx < shuffledAds.length || chIdx < channelChunks.length) {
                            // Add 3 Ads
                            const adBatch = shuffledAds.slice(adIdx, adIdx + 3);
                            if (adBatch.length > 0) {
                                mixedContent.push(
                                    ...adBatch.map(ad => (
                                        <AdCard
                                            key={ad.id}
                                            ad={ad}
                                            variant="feed"
                                            isExpanded={false}
                                            onToggle={() => setSelectedAd(ad)}
                                        />
                                    ))
                                );
                                adIdx += 3;
                            }

                            // Add 1 Channel Section
                            if (chIdx < channelChunks.length) {
                                const chunk = channelChunks[chIdx];
                                mixedContent.push(
                                    <div key={`ch-section-${chIdx}`} style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 13, fontWeight: '600', color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 4 }}>
                                            {t('feed.suggestedChannels', 'Suggested Channels')}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                            {chunk.map(ch => (
                                                <ChannelCardVertical key={ch.id} channel={ch} onClick={() => setSelectedChannel(ch)} />
                                            ))}
                                        </div>
                                    </div>
                                );
                                chIdx++;
                            }
                        }

                        return mixedContent;
                    })()}
                </div>

                {/* Channel Details Modal (Enhanced) */}
                <Modal
                    isOpen={!!selectedChannel}
                    onClose={() => setSelectedChannel(null)}
                    title={selectedChannel?.title || 'Channel'}
                >
                    {selectedChannel && (
                        <div style={{ textAlign: 'center', padding: '10px 20px 30px' }}>
                            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                                <img
                                    src={selectedChannel.photoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                                    style={{ width: 64, height: 64, borderRadius: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', objectFit: 'cover' }}
                                />
                                {selectedChannel.purityScore > 80 && (
                                    <div style={{
                                        position: 'absolute', bottom: -4, right: -4, background: '#10b981', color: '#fff',
                                        width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '2px solid var(--bg-card)', fontSize: 12
                                    }}>
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                )}
                            </div>

                            <h3 style={{ fontSize: 16, margin: '0 0 2px', color: 'var(--text-main)' }}>{selectedChannel.title}</h3>
                            <p style={{ margin: 0, color: 'var(--primary)', fontWeight: '500', fontSize: 12 }}>@{selectedChannel.username}</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                                <div style={{ background: 'var(--bg-dull)', padding: '10px 8px', borderRadius: 12 }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                        <Users size={10} /> Subs
                                    </div>
                                    <div style={{ fontWeight: '700', fontSize: 14, color: 'var(--text-main)' }}>
                                        {selectedChannel.memberCount ? selectedChannel.memberCount.toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-dull)', padding: '10px 8px', borderRadius: 12 }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                        <Check size={10} /> Purity
                                    </div>
                                    <div style={{ fontWeight: '700', fontSize: 14, color: selectedChannel.purityScore >= 80 ? '#4ade80' : '#fbbf24' }}>
                                        {selectedChannel.purityScore || 0}%
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-dull)', padding: '10px 8px', borderRadius: 12 }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                        <Eye size={10} /> Avg. Views
                                    </div>
                                    <div style={{ fontWeight: '700', fontSize: 14, color: 'var(--text-main)' }}>
                                        {selectedChannel.avgViews ? selectedChannel.avgViews.toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-dull)', padding: '10px 8px', borderRadius: 12 }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                        <DollarSign size={10} /> Price
                                    </div>
                                    <div style={{ fontWeight: '700', fontSize: 14, color: 'var(--text-main)' }}>
                                        ${selectedChannel.startPrice || 0}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 16, padding: 12, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>📝 Description</div>
                                <div style={{ fontSize: 12, color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.4' }}>
                                    "{selectedChannel.description || 'No description.'}"
                                </div>
                            </div>

                            <button onClick={() => window.open(`https://t.me/${selectedChannel.username}`, '_blank')} style={{
                                marginTop: 20, width: '100%', padding: '14px', background: 'var(--text-main)', color: 'var(--bg-dark)',
                                border: 'none', borderRadius: 14, fontWeight: '700', cursor: 'pointer', fontSize: 14,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}>
                                <ExternalLink size={16} /> {t('common.viewOnTelegram', 'View on Telegram')}
                            </button>
                        </div>
                    )}
                </Modal>

                {/* Ad Details Modal (Direct Use) */}
                <AdDetailsModal
                    selectedAd={selectedAd}
                    onClose={() => setSelectedAd(null)}
                    onRequestDeal={() => {
                        if (onNavigate) {
                            // Store ID for the RequestDeal page to pick up
                            sessionStorage.setItem('selectedAdId', selectedAd.id);
                            // Navigate to Request Deal overlay. 
                            // We DO NOT close selectedAd here, so when user comes back, this modal is still here.
                            onNavigate('requestDeal');
                        }
                    }}
                />
            </div>
        </PageContainer >
    );
};

// Channel Card with Wave Background
const ChannelCard = ({ channel, onClick }) => {
    // Generate static gradient per card (stable via memo not strictly needed if we accept random on re-render,
    // but better to keep it stable if possible, though random is requested "randomly created".
    // Let's just generate it.
    const bgStyle = useMemo(() => ({
        background: `var(--bg-card), ${getRandomWaveGradient()}`,
        backgroundBlendMode: 'overlay'
    }), []);

    return (
        <div key={channel.id} className={styles.channelCard} onClick={onClick} style={{ ...bgStyle, position: 'relative', overflow: 'hidden' }}>
            <div className={styles.channelInfo} style={{ position: 'relative', zIndex: 2 }}>
                <img
                    src={channel.photoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                    alt={channel.title}
                    className={styles.channelAvatar}
                />
                <div className={styles.channelDetails}>
                    <h3 className={styles.channelTitle}>
                        {channel.title || 'Channel'}
                        {channel.purityScore > 80 && <span title="Verified" style={{ marginLeft: 4, display: 'inline-flex' }}><Check size={14} color="#10b981" strokeWidth={4} /></span>}
                    </h3>
                    <span className={styles.channelSub}>
                        {channel.memberCount ? `${channel.memberCount.toLocaleString()} subs` : 'No subs info'}
                        {channel.username ? ` • @${channel.username}` : ''}
                    </span>
                </div>
            </div>
            {(channel.startPrice || channel.purityScore) && (
                <div style={{ textAlign: 'right', position: 'relative', zIndex: 2 }}>
                    {channel.startPrice && <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${channel.startPrice}</div>}
                    {channel.purityScore && <div style={{ fontSize: 11, color: '#4ade80' }}>{channel.purityScore}% Pure</div>}
                </div>
            )}
        </div>
    );
};

// Vertical Channel Card with simpler Wave
const ChannelCardVertical = ({ channel, onClick }) => {
    // No Wave BG for Feed items, just clean UI

    return (
        <div onClick={onClick} style={{
            background: 'var(--bg-dull)', // Simple dark bg
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            border: '1px solid var(--glass-border)',
            cursor: 'pointer',
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ position: 'relative', marginBottom: 8, zIndex: 2 }}>
                <img
                    src={channel.photoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                    style={{ width: 44, height: 44, borderRadius: '12px', objectFit: 'cover', background: '#333' }}
                    alt=""
                />
                {channel.purityScore > 80 && (
                    <div style={{
                        position: 'absolute', bottom: -2, right: -2, background: '#10b981', color: '#fff',
                        width: 14, height: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid var(--bg-card)', fontSize: 8, fontWeight: 'bold'
                    }}><Check size={8} strokeWidth={4} /></div>
                )}
            </div>
            <div style={{
                fontWeight: '600', fontSize: '12px', color: 'var(--text-main)',
                width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2,
                zIndex: 2, position: 'relative'
            }}>
                {channel.title}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', zIndex: 2, position: 'relative' }}>
                {channel.memberCount ? formatCompactNumber(channel.memberCount) : '0'} subs
            </div>
        </div>
    );
};

// Helper
const formatCompactNumber = (number) => {
    if (number < 1000) {
        return number;
    } else if (number >= 1000 && number < 1_000_000) {
        return (number / 1000).toFixed(1) + "K";
    } else if (number >= 1_000_000 && number < 1_000_000_000) {
        return (number / 1_000_000).toFixed(1) + "M";
    } else if (number >= 1_000_000_000 && number < 1_000_000_000_000) {
        return (number / 1_000_000_000).toFixed(1) + "B";
    } else if (number >= 1_000_000_000_000 && number < 1_000_000_000_000_000) {
        return (number / 1_000_000_000_000).toFixed(1) + "T";
    }
};

export default Feed;
