import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PageContainer from '../components/PageContainer';
import { useApi } from '../auth/useApi';
import styles from './Ads.module.css';
import { useTranslation } from 'react-i18next';
import AdCard from '../components/AdCard';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../auth/AuthProvider';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';

const Ads = ({ activePage }) => {
    const { t } = useTranslation();
    const index = 1;
    const { get, post } = useApi();
    const { userProfile } = useAuth();
    const { addNotification } = useNotification();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAd, setSelectedAd] = useState(null);

    // Deal Request State
    const [isDealModalOpen, setIsDealModalOpen] = useState(false);
    const [selectedChannelForDeal, setSelectedChannelForDeal] = useState(null);
    const [dealAmount, setDealAmount] = useState('');
    const [dealDuration, setDealDuration] = useState('24'); // Default 24h
    const [isSubmittingDeal, setIsSubmittingDeal] = useState(false);

    const handleOpenDealModal = () => {
        if (!userProfile?.channels || userProfile.channels.length === 0) {
            addNotification('warning', 'Please connect a channel in Profile first.');
            return;
        }
        setIsDealModalOpen(true);
        // Default to first channel
        if (!selectedChannelForDeal) {
            setSelectedChannelForDeal(userProfile.channels[0]);
        }
    };

    const handleSubmitDeal = async () => {
        if (!selectedChannelForDeal || !dealAmount) {
            addNotification('error', 'Please select a channel and enter amount');
            return;
        }
        if (parseFloat(dealAmount) > parseFloat(selectedAd.budget)) {
            addNotification('error', `Amount cannot exceed budget of ${selectedAd.budget}`);
            return;
        }

        setIsSubmittingDeal(true);
        try {
            const res = await post('/deals/request', {
                adId: selectedAd.id,
                channelId: selectedChannelForDeal.id, // Ensure ID is correct from channel object
                amount: dealAmount,
                duration: dealDuration, // This is proof duration
                proofDuration: dealDuration
            });

            if (res.success) {
                addNotification('success', 'Deal Requested Successfully!');
                setIsDealModalOpen(false);
                setSelectedAd(null); // Close ad details too? Maybe keep open.
                // Reset form
                setDealAmount('');
            }
        } catch (error) {
            console.error(error);
            addNotification('error', error.response?.data?.error || 'Failed to request deal');
        } finally {
            setIsSubmittingDeal(false);
        }
    };

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

                    {campaigns.map(camp => (
                        <AdCard
                            key={camp.id}
                            ad={camp}
                            variant="public"
                            isExpanded={false} // No expansion, just click to open details
                            onToggle={() => setSelectedAd(camp)}
                        />
                    ))}
                </div>

                {/* Ads Details Modal - Portaled to escape stacking context */}
                {createPortal(
                    <AnimatePresence>
                        {selectedAd && (
                            <motion.div
                                initial={{ y: '100%', opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: '100%', opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                style={{
                                    position: 'fixed',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: '#000',
                                    zIndex: 1001, // Higher than Nav (100)
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden' // Important for sticky header
                                }}
                            >
                                {/* Sticky Header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    padding: '16px 20px',
                                    background: 'rgba(0,0,0,0.6)',
                                    backdropFilter: 'blur(12px)',
                                    position: 'sticky', top: 0, zIndex: 10,
                                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                                }}>
                                    <button
                                        onClick={() => setSelectedAd(null)}
                                        style={{
                                            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                                            width: 40, height: 40, borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', transition: '0.2s'
                                        }}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 18 9 12 15 6"></polyline>
                                        </svg>
                                    </button>
                                    <div style={{ overflow: 'hidden' }}>
                                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {selectedAd.title}
                                        </h2>
                                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {selectedAd.type === 'bot' ? '🤖 Bot' : '📢 Channel'}
                                            <span>•</span>
                                            <span style={{ color: getStatusColor(selectedAd.status) }}>{getStatusText(selectedAd.status)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable Content */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '100px' }}>

                                    {/* 1. Post Image (Hero) */}
                                    {selectedAd.mediaPreview && !selectedAd.mediaPreview.startsWith('blob:') ? (
                                        <div style={{
                                            borderRadius: '24px', overflow: 'hidden',
                                            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            marginBottom: 24,
                                            position: 'relative'
                                        }}>
                                            <img src={selectedAd.mediaPreview} alt="Ad Visual" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                            <div style={{
                                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                                height: '80px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
                                            }} />
                                        </div>
                                    ) : (
                                        <div style={{
                                            width: '100%', aspectRatio: '16/9',
                                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
                                            borderRadius: '24px',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            border: '1px dashed rgba(255,255,255,0.1)',
                                            marginBottom: 24
                                        }}>
                                            <span style={{ fontSize: '48px', marginBottom: 12 }}>🖼️</span>
                                            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>No Image Provided</span>
                                        </div>
                                    )}

                                    {/* 2. Main Post Content */}
                                    <div style={{ marginBottom: 32 }}>
                                        <h3 style={{
                                            fontSize: '14px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px',
                                            marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8
                                        }}>
                                            <span style={{ width: 4, height: 16, background: '#3b82f6', borderRadius: 2 }} />
                                            Post Content
                                        </h3>
                                        <div style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            padding: '20px', borderRadius: '20px',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            fontSize: '16px', lineHeight: '1.6', color: 'rgba(255,255,255,0.95)',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {selectedAd.postText || selectedAd.description || 'No content text.'}
                                        </div>
                                    </div>

                                    {/* 3. Targeting & Details Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
                                        {/* GEO */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '20px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                🌍 Target GEO
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {selectedAd.geo && selectedAd.geo.length > 0 ? (
                                                    selectedAd.geo.map((g, i) => (
                                                        <span key={i} style={{
                                                            fontSize: 13, background: 'rgba(59, 130, 246, 0.15)',
                                                            color: '#60a5fa', padding: '4px 8px', borderRadius: 6
                                                        }}>
                                                            {g}
                                                        </span>
                                                    ))
                                                ) : <span style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Global / Any</span>}
                                            </div>
                                        </div>

                                        {/* Age */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '20px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                👥 Age Group
                                            </div>
                                            <div style={{ fontSize: 16, fontWeight: '600' }}>
                                                {selectedAd.ageRange ? `${selectedAd.ageRange[0]} - ${selectedAd.ageRange[1]}` : '18 - 65+'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Channels List */}
                                    <div style={{ marginBottom: 32 }}>
                                        <h3 style={{
                                            fontSize: '14px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px',
                                            marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8
                                        }}>
                                            <span style={{ width: 4, height: 16, background: '#10b981', borderRadius: 2 }} />
                                            Targeted Channels
                                        </h3>

                                        {selectedAd.channels && selectedAd.channels.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {selectedAd.channels.map((ch, i) => (
                                                    <div key={i} style={{
                                                        display: 'flex', alignItems: 'center', gap: 12,
                                                        background: 'rgba(255,255,255,0.03)', padding: '12px',
                                                        borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'
                                                    }}>
                                                        {/* Avatar Mockup */}
                                                        <div style={{
                                                            width: 40, height: 40, borderRadius: '50%',
                                                            background: `hsl(${Math.random() * 360}, 70%, 20%)`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 18
                                                        }}>
                                                            📢
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '600', fontSize: 15 }}>
                                                                {typeof ch === 'string' ? ch : (ch.name || ch.title || 'Unknown Channel')}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                                                                {(ch.subs || 'N/A') + ' subscribers'}
                                                            </div>
                                                        </div>
                                                        <div style={{
                                                            background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                                                            padding: '4px 8px', borderRadius: 8, fontSize: 11
                                                        }}>
                                                            Verified
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{
                                                padding: 20, textAlign: 'center', borderRadius: 16,
                                                background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)'
                                            }}>
                                                No specific channels selected (Run of Network)
                                            </div>
                                        )}
                                    </div>

                                </div>

                                {/* Sticky Footer CTA */}
                                <div style={{
                                    padding: '20px',
                                    background: 'rgba(0,0,0,0.8)',
                                    backdropFilter: 'blur(20px)',
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex', gap: 16, alignItems: 'center',
                                    position: 'fixed', bottom: 0, left: 0, right: 0,
                                    zIndex: 11
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Total Budget</span>
                                        <span style={{ fontSize: 20, fontWeight: 'bold' }}>{selectedAd.budget} TON</span>
                                    </div>

                                    {/* Request Deal Button */}
                                    <button
                                        onClick={handleOpenDealModal}
                                        style={{
                                            flex: 1,
                                            height: '52px',
                                            borderRadius: '16px',
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            color: 'white',
                                            fontWeight: '600', fontSize: '14px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Request Deal
                                    </button>

                                    {selectedAd.link ? (
                                        <button
                                            onClick={() => window.open(selectedAd.link, '_blank')}
                                            style={{
                                                flex: 1,
                                                height: '52px',
                                                borderRadius: '16px',
                                                background: 'linear-gradient(90deg, #3b82f6, #9333ea)',
                                                border: 'none', color: 'white',
                                                fontWeight: '600', fontSize: '16px',
                                                boxShadow: '0 8px 24px -6px rgba(59, 130, 246, 0.5)',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                            }}
                                        >
                                            Visit Link
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                <line x1="10" y1="14" x2="21" y2="3"></line>
                                            </svg>
                                        </button>
                                    ) : (
                                        <button disabled style={{
                                            flex: 1, height: '52px', borderRadius: '16px',
                                            background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)',
                                            border: 'none', fontWeight: '600'
                                        }}>
                                            No Link Available
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>

            {/* Deal Request Modal */}
            <Modal
                isOpen={isDealModalOpen}
                onClose={() => setIsDealModalOpen(false)}
                title="Request Deal"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Channel Selector */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>Select Your Channel</label>
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                            {userProfile?.channels?.map(ch => (
                                <div
                                    key={ch.id}
                                    onClick={() => setSelectedChannelForDeal(ch)}
                                    style={{
                                        minWidth: '100px',
                                        padding: '10px',
                                        borderRadius: '12px',
                                        background: selectedChannelForDeal?.id === ch.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                        border: selectedChannelForDeal?.id === ch.id ? '1px solid #3b82f6' : '1px solid transparent',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    <div style={{ fontSize: '18px', marginBottom: '4px' }}>📢</div>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {ch.title || ch.username}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#aaa' }}>{ch.subscribers} subs</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>Offer Amount (TON)</label>
                        <input
                            type="number"
                            placeholder={`Max: ${selectedAd?.budget}`}
                            value={dealAmount}
                            onChange={(e) => setDealAmount(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                fontSize: '16px'
                            }}
                        />
                    </div>

                    {/* Duration Input */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>Proof Duration (Hours)</label>
                        <select
                            value={dealDuration}
                            onChange={(e) => setDealDuration(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                fontSize: '16px'
                            }}
                        >
                            <option value="12">12 Hours</option>
                            <option value="24">24 Hours</option>
                            <option value="48">48 Hours</option>
                            <option value="72">72 Hours</option>
                        </select>
                    </div>

                    <button
                        onClick={handleSubmitDeal}
                        disabled={isSubmittingDeal}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '16px',
                            background: isSubmittingDeal ? '#555' : 'linear-gradient(90deg, #3b82f6, #9333ea)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            cursor: isSubmittingDeal ? 'not-allowed' : 'pointer',
                            marginTop: '10px'
                        }}
                    >
                        {isSubmittingDeal ? 'Sending Offer...' : 'Send Offer'}
                    </button>

                </div>
            </Modal>
        </PageContainer>
    );
};
export default Ads;
