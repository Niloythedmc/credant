import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { useApi } from '../../auth/useApi';
import { useNotification } from '../../context/NotificationContext';
// Reuse OfferItem from the previous file? Or duplicate/move?
// Ideally move OfferItem to a shared component or just define it here if we plan to delete the old modal.
// I will copy OfferItem logic here for self-containment as I plan to replace the old modal.
import { useUserCache } from '../../context/UserCacheContext';
import styles from './OffersListModal.module.css'; // Reusing styles for now
import { FiActivity, FiYoutube, FiMessageCircle, FiMonitor, FiGlobe, FiCpu, FiBarChart2 } from 'react-icons/fi';


const OfferItem = ({ offer, onAccept, onReject }) => {
    const { resolveUser, getCachedUser } = useUserCache();
    const [channelData, setChannelData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const cachedChannel = getCachedUser(offer.channelId);
                if (cachedChannel) {
                    setChannelData(cachedChannel);
                } else {
                    const res = await resolveUser(offer.channelId);
                    if (isMounted) setChannelData(res);
                }

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

    if (loading) {
        return (
            <div className={styles.offerItemSkeleton}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonContent}>
                    <div className={styles.skeletonLine} style={{ width: '60%' }} />
                    <div className={styles.skeletonLine} style={{ width: '40%' }} />
                </div>
            </div>
        );
    }

    const channelName = channelData?.title || channelData?.name || offer.channelTitle || 'Unknown Channel';
    const channelImg = channelData?.photoUrl || channelData?.image || offer.channelImage;
    const userName = userData?.username ? `@${userData.username}` : (userData?.name || 'Unknown User');

    return (
        <div className={styles.offerItem}>
            <div className={styles.offerHeader}>
                <div className={styles.offerChannel}>
                    <img
                        src={channelImg || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                        alt={channelName}
                        className={styles.channelAvatar}
                    />
                    <div>
                        <div className={styles.channelName}>
                            {channelName}
                            {channelData?.verified && <span className={styles.verifiedBadge}>✓</span>}
                        </div>
                        <div className={styles.subscribers}>
                            {channelData?.subscribers
                                ? (channelData.subscribers < 1000
                                    ? `${channelData.subscribers} subscribers`
                                    : `${(channelData.subscribers / 1000).toFixed(1)}k subscribers`)
                                : 'No subscribers'}
                        </div>
                        <div className={styles.senderInfo}>
                            Sent by <span className={styles.senderName}>{userName}</span>
                        </div>
                        {offer.modifiedContent && (
                            <div className={styles.modifiedBadge}>
                                Modified Proposal
                            </div>
                        )}
                    </div>
                </div>
                <div className={styles.offerStatus} data-status={offer.status}>
                    {offer.status.toUpperCase()}
                </div>
            </div>

            <div className={styles.offerDetails}>
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Amount</span>
                    <span className={styles.detailValue}>{offer.amount} TON</span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Duration</span>
                    <span className={styles.detailValue}>{offer.duration} Hours</span>
                </div>
            </div>

            {offer.modifiedContent && (
                <div className={styles.modifiedContent}>
                    <div className={styles.modifiedHeader}>Proposed Changes:</div>
                    {offer.modifiedContent.postText && (
                        <div className={styles.modifiedText}>
                            <strong>Text:</strong> {offer.modifiedContent.postText.substring(0, 50)}...
                        </div>
                    )}
                    {offer.modifiedContent.buttonText && (
                        <div className={styles.modifiedText}>
                            <strong>Button:</strong> {offer.modifiedContent.buttonText}
                        </div>
                    )}
                    {offer.modifiedContent.mediaPreview && (
                        <div className={styles.modifiedText}>
                            <strong>Image:</strong> Changed
                        </div>
                    )}
                </div>
            )}

            {offer.status === 'pending' && (
                <div className={styles.offerActions}>
                    <button onClick={() => onReject(offer)} className={styles.rejectButton}>
                        Reject
                    </button>
                    <button onClick={() => onAccept(offer)} className={styles.acceptButton}>
                        Accept
                    </button>
                </div>
            )}
        </div>
    );
};

const AdDetailModal = ({ isOpen, onClose, ad, initialOffers = [] }) => {
    const { get, post } = useApi();
    const { addNotification } = useNotification();
    const [activeTab, setActiveTab] = useState('info'); // 'info' or 'offers'
    const [offers, setOffers] = useState(initialOffers);
    const [loadingOffers, setLoadingOffers] = useState(false);

    // If modal opens, we might want to refresh offers to be sure
    useEffect(() => {
        if (isOpen && ad) {
            // If we didn't pass offers or want fresh ones
            if (activeTab === 'offers') {
                fetchOffers();
            }
        }
    }, [isOpen, ad, activeTab]);

    const fetchOffers = async () => {
        setLoadingOffers(true);
        try {
            const res = await get(`/deals/received?adId=${ad.id}`);
            if (res && res.offers) {
                setOffers(res.offers);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingOffers(false);
        }
    };

    const handleAccept = async (offer) => {
        if (!confirm(`Accept offer of ${offer.amount} TON?`)) return;
        try {
            const res = await post('/deals/update', { dealId: offer.id, status: 'approved' });
            if (res.success) {
                addNotification('success', 'Offer Accepted!');
                fetchOffers();
            }
        } catch (e) {
            addNotification('error', e.response?.data?.error || 'Failed');
        }
    };

    const handleReject = async (offer) => {
        if (!confirm('Reject?')) return;
        try {
            const res = await post('/deals/update', { dealId: offer.id, status: 'rejected' });
            if (res.success) {
                addNotification('info', 'Rejected');
                fetchOffers();
            }
        } catch (e) {
            addNotification('error', 'Failed');
        }
    };

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
                            {/* Stats Grid */}
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
                            {loadingOffers ? (
                                <div className={styles.loading}>Loading offers...</div>
                            ) : offers.length === 0 ? (
                                <div className={styles.empty}>No offers yet.</div>
                            ) : (
                                offers.map(offer => (
                                    <OfferItem
                                        key={offer.id}
                                        offer={offer}
                                        onAccept={handleAccept}
                                        onReject={handleReject}
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
