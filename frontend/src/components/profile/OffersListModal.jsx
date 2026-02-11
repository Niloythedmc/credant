import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { useApi } from '../../auth/useApi';
import { useNotification } from '../../context/NotificationContext';
import { useUserCache } from '../../context/UserCacheContext';
import styles from './OffersListModal.module.css';

const OfferItem = ({ offer, onAccept, onReject }) => {
    const { resolveUser, getCachedUser } = useUserCache();
    const [channelData, setChannelData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                // 1. Resolve Channel (Using resolveUser logic which handles channels too if ID is passed? 
                // Wait, resolveUser is for Users. Channels might be different.
                // But the ID passed in offer is 'channelId'. 
                // The cache context is UserCache. Does it handle channels?
                // Yes, resolveUser handles both if we treat them similar or if backend resolves.
                // Backend resolve logic: checks Users first, then Channels.
                // So resolving channelId should return channel data.

                // Check cache first
                const cachedChannel = getCachedUser(offer.channelId);
                if (cachedChannel) {
                    setChannelData(cachedChannel);
                } else {
                    const res = await resolveUser(offer.channelId);
                    if (isMounted) setChannelData(res);
                }

                // 2. Resolve Sender (Requester)
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

    // Display
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
                        <div className={styles.senderInfo}>
                            Sent by <span className={styles.senderName}>{userName}</span>
                        </div>
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

const OffersListModal = ({ isOpen, onClose, ad }) => {
    const { get, post } = useApi();
    const { addNotification } = useNotification();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && ad) {
            fetchOffers();
        }
    }, [isOpen, ad]);

    const fetchOffers = async () => {
        setLoading(true);
        try {
            const res = await get(`/deals/received?adId=${ad.id}`);
            if (res && res.offers) {
                setOffers(res.offers);
            }
        } catch (e) {
            console.error(e);
            addNotification('error', 'Failed to fetch offers');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (offer) => {
        if (!confirm(`Accept offer of ${offer.amount} TON from ${offer.channelTitle}?`)) return;

        try {
            const res = await post('/deals/update', { dealId: offer.id, status: 'approved' });
            if (res.success) {
                addNotification('success', 'Offer Accepted!');
                fetchOffers(); // Refresh list
            }
        } catch (e) {
            console.error(e);
            addNotification('error', e.response?.data?.error || 'Failed to accept offer');
        }
    };

    const handleReject = async (offer) => {
        if (!confirm('Reject this offer?')) return;
        try {
            const res = await post('/deals/update', { dealId: offer.id, status: 'rejected' });
            if (res.success) {
                addNotification('info', 'Offer Rejected');
                fetchOffers();
            }
        } catch (e) {
            console.error(e);
            addNotification('error', 'Failed to reject');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Offers for "${ad?.title || 'Ad'}"`}>
            <div className={styles.container}>
                {loading ? (
                    <div className={styles.loading}>Loading offers...</div>
                ) : offers.length === 0 ? (
                    <div className={styles.empty}>No offers yet for this ad.</div>
                ) : (
                    <div className={styles.list}>
                        {offers.map(offer => (
                            <OfferItem
                                key={offer.id}
                                offer={offer}
                                onAccept={handleAccept}
                                onReject={handleReject}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default OffersListModal;
