import React, { useState, useEffect } from 'react';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';
import { useNotification } from '../context/NotificationContext';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiX } from 'react-icons/fi';
import { useUserCache } from '../context/UserCacheContext';
import TelegramPostRenderer from '../components/TelegramPostRenderer';

const OfferDetails = ({ activePage, onNavigate }) => {
    const isVisible = activePage === 'offerDetails';
    const style = {
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 3000, background: 'var(--bg-dark)', transition: 'transform 0.3s ease-out',
        display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'
    };

    const offerId = sessionStorage.getItem('selectedOfferId');
    const { get, post } = useApi();
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const { resolveUser, getCachedUser } = useUserCache();
    const { t } = useTranslation();

    const [offer, setOffer] = useState(null);
    const [channelData, setChannelData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [counterPrice, setCounterPrice] = useState('');
    const [isNegotiating, setIsNegotiating] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Fetch Offer
    const fetchOffer = async () => {
        if (!offerId) return;
        setLoading(true);
        try {
            const res = await get(`/deals/single/${offerId}`);
            setOffer(res);
            setCounterPrice(res.amount ? res.amount.toString() : '');
        } catch (e) {
            console.error("Failed to fetch offer", e);
            addNotification('error', 'Failed to load offer');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isVisible && offerId) {
            fetchOffer();
        }
    }, [isVisible, offerId]);

    // Fetch Channel Data (Fresh)
    useEffect(() => {
        const fetchChannel = async () => {
            if (offer?.channelId) {
                try {
                    // Try to get fresh data via resolveUser
                    const res = await resolveUser(offer.channelId);
                    setChannelData(res);
                } catch (e) {
                    console.error("Failed to resolve channel", e);
                    // Fallback to cached or offer data if resolve fails
                    const cached = getCachedUser(offer.channelId);
                    if (cached) setChannelData(cached);
                }
            }
        };
        fetchChannel();
    }, [offer?.channelId, resolveUser, getCachedUser]);


    // Actions
    const handleAccept = async () => {
        // Role based action
        // Advertiser (isAdvertiser) -> 'approved' (Post)
        // Channel Owner (isChannelOwner) -> 'accepted' (Agree to terms)

        let actionStatus = isAdvertiser ? 'approved' : 'accepted';

        // Safety: If Ad Owner (Advertiser) clicks it, it must always be approved/post.
        const confirmMsg = isAdvertiser ? 'Approve and Post this deal?' : 'Accept this deal? (Advertiser will need to confirm)';

        if (!confirm(confirmMsg)) return;

        try {
            const res = await post('/deals/update', { dealId: offer.id, status: actionStatus });
            if (res.success) {
                addNotification('success', isChannelOwner ? 'Deal Accepted! Waiting for Advertiser.' : 'Deal Posted Successfully!');
                if (isChannelOwner) fetchOffer(); // Refresh
                else onNavigate('profile');
            }
        } catch (e) {
            console.error(e);
            addNotification('error', e.response?.data?.error || 'Failed to update deal');
        }
    };

    const handleReject = async () => {
        if (!confirm('Reject this deal?')) return;
        try {
            const res = await post('/deals/update', { dealId: offer.id, status: 'rejected' });
            if (res.success) {
                addNotification('info', 'Deal Rejected');
                onNavigate('profile');
            }
        } catch (e) {
            addNotification('error', 'Failed to reject');
        }
    };

    const handleNegotiate = async () => {
        if (!counterPrice || isNaN(counterPrice)) {
            return addNotification('error', 'Invalid price');
        }
        try {
            const res = await post('/deals/negotiate', {
                dealId: offer.id,
                price: parseFloat(counterPrice)
            });
            if (res.success) {
                addNotification('success', 'Counter Offer Sent!');
                setIsNegotiating(false);
                fetchOffer();
            }
        } catch (e) {
            addNotification('error', e.response?.data?.error || 'Negotiation failed');
        }
    };

    // Role Helpers
    // Advertiser = Ad Owner (Budget Holder)
    // Channel Owner = Requester (Applicant)
    const isAdvertiser = user?.uid === offer?.adOwnerId;
    const isChannelOwner = user?.uid === offer?.requesterId;

    // Turn Logic:
    // - Pending: Channel Owner's turn to Accept/Counter.
    // - Negotiating: Last negotiator waits.
    // - Accepted: Advertiser's turn to Final Approve.
    let isMyTurn = false;
    if (offer?.status === 'pending') isMyTurn = isChannelOwner;
    else if (offer?.status === 'negotiating') {
        isMyTurn = (offer.lastNegotiatorId && offer.lastNegotiatorId !== user?.uid) || (!offer.lastNegotiatorId && isChannelOwner);
    } else if (offer?.status === 'accepted') {
        isMyTurn = isAdvertiser;
    }

    if (!offer) return <div style={style}>Loading...</div>;

    const displayChannelName = channelData?.title || channelData?.name || offer.channelTitle || 'Unknown Channel';
    const displayChannelImg = channelData?.photoUrl || offer.channelImage;
    const displayChannelUsername = channelData?.username || offer.channelUsername;
    const displaySubs = channelData?.subscribers || offer.subscribers || 0; // Use fresh if available

    // --- Verification & Payout Logic ---

    const handleCheckPost = async () => {
        setVerifying(true);
        try {
            const res = await post('/deals/verify-post', { dealId: offer.id });
            // Update local state to reflect result
            setOffer(prev => ({ ...prev, verificationStatus: res.status }));
            if (res.status === 'ok') addNotification('success', 'Post Verified: Valid');
            else if (res.status === 'deleted') addNotification('error', 'Post Verified: DELETED');
            else addNotification('warning', 'Post Verified: Issues Found');
        } catch (e) {
            console.error(e);
            addNotification('error', 'Verification Failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleSuspend = async () => {
        if (!confirm("Suspend this deal? Funds will be returned to your budget.")) return;
        try {
            const res = await post('/deals/suspend', { dealId: offer.id });
            if (res.success) {
                addNotification('success', 'Deal Suspended');
                fetchOffer();
            }
        } catch (e) {
            addNotification('error', 'Suspend failed');
        }
    };

    const handleClaim = async () => {
        if (!confirm("Claim funds?")) return;
        try {
            const res = await post('/deals/claim', { dealId: offer.id });
            if (res.success) {
                addNotification('success', `Funds Claimed! ${res.payout} TON`);
                fetchOffer();
            }
        } catch (e) {
            console.error(e);
            addNotification('error', e.response?.data?.error || 'Claim Failed');
        }
    };

    // Calculate time for Claim button
    const canClaim = (() => {
        if (offer?.status !== 'posted') return false;
        if (!offer.postedAt) return false;
        const postedTime = new Date(offer.postedAt._seconds ? offer.postedAt._seconds * 1000 : offer.postedAt).getTime(); // Handle Firestore TS
        const now = Date.now();
        const hours = (now - postedTime) / (1000 * 60 * 60);
        return hours >= 24;
    })();


    return (
        <div style={style}>
            {/* ... (Header/Content same as before) ... */}

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingTop: '80px', paddingBottom: '80px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Status Card */}
                <div style={{
                    padding: '16px', borderRadius: '12px',
                    background: offer.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' :
                        offer.status === 'negotiating' ? 'rgba(59, 130, 246, 0.1)' :
                            offer.status === 'accepted' ? 'rgba(16, 185, 129, 0.1)' :
                                offer.status === 'posted' ? 'rgba(16, 185, 129, 0.2)' :
                                    offer.status === 'suspended' ? 'rgba(239, 68, 68, 0.2)' :
                                        offer.status === 'completed' ? 'rgba(59, 130, 246, 0.2)' :
                                            'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>{offer.status.toUpperCase()}</div>
                        {offer.verificationStatus && (
                            <div style={{ fontSize: '11px', marginTop: '4px', color: offer.verificationStatus === 'ok' ? '#10b981' : '#ef4444' }}>
                                Verification: {offer.verificationStatus.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div style={{ fontSize: '24px' }}>
                        {offer.status === 'pending' ? '⏳' :
                            offer.status === 'negotiating' ? '🤝' :
                                offer.status === 'accepted' ? '✅' :
                                    offer.status === 'posted' ? '📢' :
                                        offer.status === 'suspended' ? '🛑' :
                                            offer.status === 'completed' ? '💰' : '📄'}
                    </div>
                </div>

                {/* Main Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{offer.amount} TON</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Duration</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{offer.duration}h</div>
                    </div>
                </div>

                {/* Channel Context */}
                <div>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Channel</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '12px', borderRadius: '12px' }}>
                        <img
                            src={displayChannelImg || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                            onError={(e) => e.target.style.display = 'none'}
                        />
                        <div>
                            <div style={{ fontWeight: 'bold' }}>{displayChannelName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {displayChannelUsername ? `@${displayChannelUsername}` : ''} • {displaySubs} subs
                            </div>
                        </div>
                    </div>
                </div>

                {/* Post Preview (Original or Modified) */}
                <div>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        {offer.modifiedContent ? 'Proposed Post' : 'Ad Content'}
                    </h3>
                    <TelegramPostRenderer
                        text={offer.modifiedContent?.postText || offer.adTitle}
                        entities={offer.modifiedContent?.entities}
                        mediaPreview={offer.modifiedContent?.mediaPreview}
                        buttonText={offer.modifiedContent?.buttonText}
                        link={offer.modifiedContent?.link}
                        style={{ fontSize: '14px' }}
                        showCard={true}
                    />
                    {!offer.modifiedContent && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                            (Using original ad content)
                        </div>
                    )}
                </div>


                {/* Negotiation History */}
                {offer.negotiationHistory && offer.negotiationHistory.length > 0 && (
                    <div>
                        <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>History</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {offer.negotiationHistory.map((item, i) => (
                                <div key={i} style={{
                                    padding: '10px', borderRadius: '8px',
                                    background: item.by === user.uid ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)',
                                    alignSelf: item.by === user.uid ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%'
                                }}>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{item.price} TON</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                        {item.by === user.uid ? 'You' : 'Counter-party'} • {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ height: '120px' }} />
            </div>

            {/* Footer Actions */}
            {(['pending', 'negotiating', 'accepted', 'failed_post', 'posted'].includes(offer.status)) && (
                <div style={{
                    padding: '16px', background: 'var(--bg-dark)', borderTop: '1px solid rgba(255,255,255,0.1)',
                    position: 'absolute', bottom: 0, left: 0, right: 0
                }}>
                    {offer.status === 'failed_post' && isAdvertiser ? (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ color: '#ef4444', fontSize: '14px', flex: 1 }}>
                                Posting Failed: {offer.error || "Unknown Error"}
                            </div>
                            <button
                                onClick={handleAccept}
                                style={{ padding: '10px 20px', borderRadius: '12px', background: '#10b981', border: 'none', color: 'white', fontWeight: 'bold' }}
                            >
                                Retry Post
                            </button>
                        </div>
                    ) : offer.status === 'posted' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {/* CHECK POST BUTTON (Both) */}
                                <button
                                    onClick={handleCheckPost}
                                    disabled={verifying}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '12px',
                                        background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6',
                                        color: '#3b82f6', fontWeight: 'bold', cursor: verifying ? 'wait' : 'pointer'
                                    }}
                                >
                                    {verifying ? 'Checking...' : 'Check Post'}
                                </button>

                                {/* SUSPEND BUTTON (Advertiser - Only if Failed Check) */}
                                {isAdvertiser && offer.verificationStatus && offer.verificationStatus !== 'ok' && (
                                    <button
                                        onClick={handleSuspend}
                                        style={{
                                            flex: 1, padding: '14px', borderRadius: '12px',
                                            background: '#ef4444', border: 'none',
                                            color: 'white', fontWeight: 'bold'
                                        }}
                                    >
                                        Suspend
                                    </button>
                                )}

                                {/* CLAIM BUTTON (Channel Owner - Only if >24h & OK) */}
                                {isChannelOwner && canClaim && offer.verificationStatus === 'ok' && (
                                    <button
                                        onClick={handleClaim}
                                        style={{
                                            flex: 1.5, padding: '14px', borderRadius: '12px',
                                            background: '#10b981', border: 'none',
                                            color: 'white', fontWeight: 'bold'
                                        }}
                                    >
                                        Claim Funds
                                    </button>
                                )}
                            </div>
                            {/* Info Text */}
                            {isChannelOwner && !canClaim && (
                                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Funds unlock 24h after posting. Run "Check Post" before claiming.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* NEGOTIATION INPUT */}
                            {isNegotiating && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="number"
                                        value={counterPrice}
                                        onChange={e => setCounterPrice(e.target.value)}
                                        placeholder="New Price"
                                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--primary)', background: 'transparent', color: 'white' }}
                                    />
                                    <button onClick={handleNegotiate} style={{ padding: '0 20px', borderRadius: '12px', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 'bold' }}>
                                        Send
                                    </button>
                                    <button onClick={() => setIsNegotiating(false)} style={{ padding: '0 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}>
                                        <FiX />
                                    </button>
                                </div>
                            )}

                            {/* MAIN BUTTONS ROW */}
                            <div style={{ display: 'flex', gap: '12px' }}>

                                {/* REJECT BUTTON (Both Parties) */}
                                {(isAdvertiser || isChannelOwner) && (
                                    <button
                                        onClick={() => {
                                            if (offer.status === 'negotiating') {
                                                post('/deals/update', { dealId: offer.id, status: 'reject_counter' })
                                                    .then(res => {
                                                        if (res.success) {
                                                            addNotification('info', 'Counter Rejected');
                                                            fetchOffer();
                                                        } else addNotification('error', 'Failed');
                                                    });
                                            } else {
                                                handleReject();
                                            }
                                        }}
                                        style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 'bold' }}
                                    >
                                        {offer.status === 'negotiating' ? 'Reject Counter' : 'Reject'}
                                    </button>
                                )}

                                {/* COUNTER BUTTON (Channel Only usually, or both?) */}
                                {!isNegotiating && offer.status !== 'accepted' && (
                                    <button onClick={() => setIsNegotiating(true)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontWeight: 'bold' }}>
                                        Counter
                                    </button>
                                )}

                                {/* APPROVE & POST (Advertiser ONLY) */}
                                {isAdvertiser && (
                                    <button
                                        onClick={handleAccept}
                                        style={{ flex: 1.5, padding: '14px', borderRadius: '12px', background: '#10b981', border: 'none', color: 'white', fontWeight: 'bold' }}
                                    >
                                        Approve & Post
                                    </button>
                                )}

                                {/* ACCEPT (Channel Owner) - Only if not Accepted yet */}
                                {/* If Channel owner accepts, it becomes 'accepted' state waiting for Advertiser Approve */}
                                {!isAdvertiser && isChannelOwner && offer.status !== 'accepted' && (
                                    <button
                                        onClick={handleAccept} // This triggers 'accepted' status for Channel Owner
                                        style={{ flex: 1.5, padding: '14px', borderRadius: '12px', background: '#10b981', border: 'none', color: 'white', fontWeight: 'bold' }}
                                    >
                                        Accept
                                    </button>
                                )}
                            </div>

                            {/* Role Debug Helper */}
                            <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>
                                Role: {isAdvertiser ? 'Advertiser (Buyer)' : isChannelOwner ? 'Channel Owner (Seller)' : 'Viewer'}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OfferDetails;
