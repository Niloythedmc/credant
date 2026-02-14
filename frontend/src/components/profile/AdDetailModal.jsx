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
                setOffers(resReceived.offers);
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
            </div>
        </Modal>
    );
};

export default AdDetailModal;
