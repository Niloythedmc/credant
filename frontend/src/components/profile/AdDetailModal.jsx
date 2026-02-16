import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { useApi } from '../../auth/useApi';
import { useNotification } from '../../context/NotificationContext';
import { useUserCache } from '../../context/UserCacheContext';
import styles from './OffersListModal.module.css'; // Reusing styles for now

const OfferItem = ({ offer, onClick }) => {
    const { resolveUser, getCachedUser } = useUserCache();
    const [channelData, setChannelData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                // Fetch Channel Data
                const cachedChannel = getCachedUser(offer.channelId);
                if (cachedChannel) {
                    setChannelData(cachedChannel);
                } else {
                    const res = await resolveUser(offer.channelId);
                    if (isMounted) setChannelData(res);
                }

                // Fetch Requester Data
                if (offer.requesterId) {
                    const cachedUser = getCachedUser(offer.requesterId);
                    if (cachedUser) {
                        setUserData(cachedUser);
                    } else {
                        const res = await resolveUser(offer.requesterId);
                        if (isMounted) setUserData(res);
                    }
                }
            } catch (e) {
                console.error("Failed to resolve offer entities", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [offer, resolveUser, getCachedUser]);

    if (loading) return <div className={styles.offerItemSkeleton} />;

    const channelName = channelData?.title || channelData?.name || offer.channelTitle || 'Unknown Channel';
    const userName = userData?.username ? `@${userData.username}` : (userData?.name || 'Unknown User');

    return (
        <div className={styles.offerItem} onClick={() => onClick(offer)} style={{ cursor: 'pointer' }}>
            <div className={styles.offerHeader}>
                <div className={styles.offerChannel}>
                    <img src={channelData?.photoUrl || offer.channelImage || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"} className={styles.channelAvatar} onError={(e) => e.target.style.display = 'none'} />
                    <div>
                        <div className={styles.channelName}>{channelName}</div>
                        <div className={styles.senderInfo}>{userName}</div>
                    </div>
                </div>
                <div className={styles.offerStatus} data-status={offer.status}>{offer.status.toUpperCase()}</div>
            </div>
            <div className={styles.offerDetails}>
                <div className={styles.detailItem}><span className={styles.detailValue}>{offer.amount} TON</span></div>
            </div>
        </div>
    );
};

const AdDetailModal = ({ isOpen, onClose, ad, initialOffers = [], onNavigate }) => {
    const { get, post } = useApi();
    const { addNotification } = useNotification();
    const [activeTab, setActiveTab] = useState('info');
    const [offers, setOffers] = useState(initialOffers);
    const [myOffer, setMyOffer] = useState(null);
    const [loadingOffers, setLoadingOffers] = useState(false);

    // Unlock Funds State
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [unlockAmount, setUnlockAmount] = useState('');


    // End Campaign State
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [isEnding, setIsEnding] = useState(false);

    const handleEndCampaign = async () => {
        setIsEnding(true);
        try {
            const res = await post('/ads/end-campaign', { adId: ad.id });
            if (res.success) {
                addNotification('success', 'Campaign Ended Successfully');
                setShowEndConfirm(false);
                onClose();
                // Refresh parent list if possible, or reload
                if (window.location.hash.includes('profile')) {
                    window.location.reload();
                }
            }
        } catch (e) {
            console.error(e);
            addNotification('error', e.response?.data?.error || 'Failed to End Campaign');
        } finally {
            setIsEnding(false);
        }
    };

    const handleUnlock = async () => {
        if (!unlockAmount || parseFloat(unlockAmount) <= 0) return;
        setUnlocking(true);
        try {
            const res = await post('/ads/unlock-funds', { adId: ad.id, amount: unlockAmount });
            if (res.success) {
                addNotification('success', `Successfully Unlocked ${unlockAmount} TON`);
                setShowUnlockModal(false);
                setUnlockAmount('');
                // Ideally refresh Ad data here (would need parent handler or context)
            }
        } catch (e) {
            console.error(e);
            addNotification('error', e.response?.data?.error || 'Unlock Failed');
        } finally {
            setUnlocking(false);
        }
    };

    const handleOfferClick = (offer) => {
        sessionStorage.setItem('selectedOfferId', offer.id);
        if (onNavigate) {
            onNavigate('offerDetails');
        }
    };

    const fetchOffers = async () => {
        setLoadingOffers(true);
        try {
            const resReceived = await get(`/deals/received?adId=${ad.id}`);
            if (resReceived && resReceived.offers) {
                const ProcessedOffers = resReceived.offers
                    .filter(o => o.status !== 'rejected')
                    .sort((a, b) => {
                        const tA = new Date(a.createdAt || 0).getTime();
                        const tB = new Date(b.createdAt || 0).getTime();
                        return tB - tA;
                    });
                setOffers(ProcessedOffers);
            }

            const resSent = await get(`/deals/sent?adId=${ad.id}`);
            if (resSent && resSent.offers && resSent.offers.length > 0) {
                setMyOffer(resSent.offers[0]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingOffers(false);
        }
    };

    useEffect(() => {
        if (isOpen && ad) {
            if (activeTab === 'offers') {
                fetchOffers();
            }
        }
    }, [isOpen, ad, activeTab]);

    if (!ad) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={ad.title}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '50vh', maxHeight: '80vh' }}>
                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '16px'
                }}>
                    <button
                        onClick={() => setActiveTab('info')}
                        style={{
                            flex: 1, padding: '12px', background: 'none', border: 'none',
                            color: activeTab === 'info' ? '#3b82f6' : 'var(--text-muted)',
                            borderBottom: activeTab === 'info' ? '2px solid #3b82f6' : '2px solid transparent',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        Info
                    </button>
                    <button
                        onClick={() => setActiveTab('offers')}
                        style={{
                            flex: 1, padding: '12px', background: 'none', border: 'none',
                            color: activeTab === 'offers' ? '#3b82f6' : 'var(--text-muted)',
                            borderBottom: activeTab === 'offers' ? '2px solid #3b82f6' : '2px solid transparent',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        Offers
                        {offers.filter(o => o.status === 'pending').length > 0 && (
                            <span style={{
                                background: '#ef4444', color: 'white', fontSize: '10px',
                                padding: '2px 6px', borderRadius: '10px'
                            }}>
                                {offers.filter(o => o.status === 'pending').length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    {activeTab === 'info' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Total Budget</div>
                                    <div style={{ fontSize: '18px', fontWeight: '700' }}>{ad.budget} TON</div>
                                    <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                                        Used: {offers.filter(o => ['accepted', 'approved', 'posted', 'completed'].includes(o.status))
                                            .reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0) + (parseFloat(ad.unlockedAmount) || 0)} TON
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Wait Time</div>
                                    <div style={{ fontSize: '18px', fontWeight: '700' }}>24h</div>
                                </div>
                            </div>

                            <div style={{ background: '#0f0f0f', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {ad.mediaPreview && (
                                    <img src={ad.mediaPreview} alt="Ad Content" style={{ width: '100%', display: 'block', maxHeight: '300px', objectFit: 'cover' }} />
                                )}
                                <div style={{ padding: '12px' }}>
                                    <div style={{ whiteSpace: 'pre-wrap', color: '#e0e0e0', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
                                        {ad.postText || ad.description || "No text content"}
                                    </div>
                                    {ad.link && (
                                        <button
                                            onClick={() => window.open(ad.link, '_blank')}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                background: 'rgba(56, 176, 255, 0.15)',
                                                color: '#38b0ff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {ad.buttonText || 'Open Link'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* End Campaign Button */}
                            {ad.status === 'active' && (
                                <div style={{ marginTop: '24px', marginBottom: '20px' }}>
                                    <button
                                        onClick={() => setShowEndConfirm(true)}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '16px',
                                            fontWeight: '700',
                                            fontSize: '16px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                                        }}
                                    >
                                        End Campaign
                                    </button>
                                    <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                                        Refunds remaining budget to your wallet
                                    </div>
                                </div>
                            )}

                            {/* End Confirmation Overlay - Portaled */}
                            {showEndConfirm && (
                                <div style={{
                                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(0,0,0,0.85)',
                                    backdropFilter: 'blur(8px)',
                                    zIndex: 9999, // Very high z-index
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '20px',
                                    animation: 'fadeIn 0.2s ease-out'
                                }}>
                                    <div style={{
                                        background: '#1f2937',
                                        padding: '32px',
                                        borderRadius: '24px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        textAlign: 'center',
                                        maxWidth: '320px',
                                        width: '100%',
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                                    }}>
                                        <div style={{
                                            width: '64px', height: '64px', borderRadius: '50%',
                                            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto 16px auto'
                                        }}>
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                                <line x1="9" y1="9" x2="15" y2="15"></line>
                                            </svg>
                                        </div>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold', color: 'white' }}>End Campaign?</h3>
                                        <p style={{ color: '#9ca3af', marginBottom: '32px', fontSize: '15px', lineHeight: '1.6' }}>
                                            This will reject all pending offers and refund the remaining budget to your wallet.
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <button
                                                onClick={handleEndCampaign}
                                                disabled={isEnding}
                                                style={{
                                                    width: '100%', padding: '16px', borderRadius: '16px',
                                                    background: '#ef4444', color: 'white', border: 'none',
                                                    fontWeight: '600', fontSize: '16px', cursor: 'pointer',
                                                    opacity: isEnding ? 0.7 : 1
                                                }}
                                            >
                                                {isEnding ? 'Ending...' : 'Yes, End Campaign'}
                                            </button>
                                            <button
                                                onClick={() => setShowEndConfirm(false)}
                                                style={{
                                                    width: '100%', padding: '16px', borderRadius: '16px',
                                                    background: 'transparent',
                                                    color: 'rgba(255,255,255,0.5)',
                                                    border: 'none',
                                                    fontWeight: '600', fontSize: '15px', cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'offers' && (
                        <div className={styles.list}>
                            {myOffer && (
                                <div style={{ marginBottom: '16px', borderBottom: '1px dashed #333', paddingBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#60a5fa' }}>Your Offer</h4>
                                    <OfferItem
                                        offer={myOffer}
                                        onClick={handleOfferClick}
                                    />
                                </div>
                            )}

                            {loadingOffers ? (
                                <div className={styles.loading}>Loading offers...</div>
                            ) : offers.length === 0 && !myOffer ? (
                                <div className={styles.empty}>No offers yet.</div>
                            ) : (
                                offers.map(offer => (
                                    <OfferItem
                                        key={offer.id}
                                        offer={offer}
                                        onClick={handleOfferClick}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div >
        </Modal >
    );
};

export default AdDetailModal;
