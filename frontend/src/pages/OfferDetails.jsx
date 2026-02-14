import React, { useState, useEffect } from 'react';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';
import { useNotification } from '../context/NotificationContext';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/PageContainer';
import { FiArrowLeft, FiCheck, FiX, FiRefreshCw, FiDollarSign } from 'react-icons/fi';
import { useUserCache } from '../context/UserCacheContext';

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
    const { resolveUser } = useUserCache();
    const { t } = useTranslation();

    const [offer, setOffer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [counterPrice, setCounterPrice] = useState('');
    const [isNegotiating, setIsNegotiating] = useState(false);

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

    // Actions
    const handleAccept = async () => {
        if (!confirm('Accept this deal?')) return;
        try {
            const res = await post('/deals/update', { dealId: offer.id, status: 'approved' });
            if (res.success) {
                addNotification('success', 'Deal Accepted!');
                onNavigate('profile');
            }
        } catch (e) {
            addNotification('error', 'Failed to accept');
        }
    };

    const handleReject = async () => {
        if (!confirm('Reject this deal?')) return;
        try {
            const res = await post('/deals/update', { dealId: offer.id, status: 'rejected' });
            if (res.success) {
                addNotification('info', 'Deal Rejected');
                onNavigate('profile'); // Or back
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
                fetchOffer(); // Refresh to show history
            }
        } catch (e) {
            addNotification('error', e.response?.data?.error || 'Negotiation failed');
        }
    };

    // Render Helpers
    const isOwner = user?.uid === offer?.adOwnerId;
    const isRequester = user?.uid === offer?.requesterId;
    const myTurn = (offer?.lastNegotiatorId && offer?.lastNegotiatorId !== user?.uid) || (!offer?.lastNegotiatorId && isOwner);
    // If no negotiation yet, Owner's turn to Accept/Reject (or Counter). 
    // Logic: 
    // - Pending: Owner has control.
    // - Negotiating: If I am NOT the last negotiator, it's MY turn.

    if (!offer) return <div style={style}>Loading...</div>;

    return (
        <div style={style}>
            {/* Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => onNavigate(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>
                    <FiArrowLeft />
                </button>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Offer Details</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Status Card */}
                <div style={{
                    padding: '16px', borderRadius: '12px',
                    background: offer.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' :
                        offer.status === 'negotiating' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>{offer.status.toUpperCase()}</div>
                    </div>
                    <div style={{ fontSize: '24px' }}>
                        {offer.status === 'pending' ? '⏳' : offer.status === 'negotiating' ? '🤝' : '📄'}
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

                {/* Channel / Ad Info */}
                <div>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Context</h3>
                    <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '12px' }}>
                        <div>Ad: <strong>{offer.adTitle}</strong></div>
                        <div>Channel: <strong>{offer.channelTitle}</strong></div>
                    </div>
                </div>

                {/* Comparison (Modified Content) */}
                {offer.modifiedContent && (
                    <div>
                        <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Proposed Changes</h3>
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px', fontSize: '13px' }}>
                            {offer.modifiedContent.postText && <div><strong>Text:</strong> {offer.modifiedContent.postText}</div>}
                            {offer.modifiedContent.mediaPreview && <div><strong>Media:</strong> Has new media</div>}
                        </div>
                    </div>
                )}

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

                {/* Padding for footer */}
                <div style={{ height: '80px' }} />
            </div>

            {/* Footer Actions */}
            {(offer.status === 'pending' || offer.status === 'negotiating') && (
                <div style={{
                    padding: '16px', background: 'var(--bg-dark)', borderTop: '1px solid rgba(255,255,255,0.1)',
                    position: 'absolute', bottom: 0, left: 0, right: 0
                }}>
                    {myTurn ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {isNegotiating ? (
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
                            ) : (
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button onClick={handleReject} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 'bold' }}>
                                        Reject
                                    </button>
                                    <button onClick={() => setIsNegotiating(true)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontWeight: 'bold' }}>
                                        Counter
                                    </button>
                                    <button onClick={handleAccept} style={{ flex: 1.5, padding: '14px', borderRadius: '12px', background: '#10b981', border: 'none', color: 'white', fontWeight: 'bold' }}>
                                        Accept {offer.amount}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>
                            Waiting for response...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OfferDetails;
