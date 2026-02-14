import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiImage, FiEdit2, FiChevronDown, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';
import { useNotification } from '../context/NotificationContext';
import styles from './RequestDeal.module.css';
import WebApp from '@twa-dev/sdk';
import TelegramPostRenderer from '../components/TelegramPostRenderer';

const RequestDeal = ({ activePage, onNavigate }) => {
    // Visibility Logic
    const isVisible = activePage === 'requestDeal';
    const style = {
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        background: 'var(--bg-dark)',
        transition: 'transform 0.3s ease-out',
        overflowY: 'auto',
        paddingTop: '80px', // Requested 80px padding
        paddingBottom: '100px'
    };

    const adId = sessionStorage.getItem('selectedAdId');
    const navigate = (path) => {
        if (onNavigate) onNavigate(path);
        else window.history.back();
    };
    const { t } = useTranslation();
    const { get, post } = useApi();
    const { userProfile, backendUrl } = useAuth();
    const { addNotification } = useNotification();

    const [ad, setAd] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [duration, setDuration] = useState('24');

    // Modifiers State
    const [modifiedContent, setModifiedContent] = useState({
        postText: '',
        buttonText: '',
        link: '',
        mediaPreview: null,
        mediaFile: null,
        entities: []
    });

    // Draft Logic
    const [draftStatus, setDraftStatus] = useState('idle'); // idle, polling, found
    const pollingRef = useRef(null);

    // Load Ad
    useEffect(() => {
        const fetchAd = async () => {
            try {
                // Try fetching specific ad via public endpoint (assuming we added it or filtering)
                // If /ads/:id enabled on backend
                const res = await get(`/ads/${adId}`);
                if (res) {
                    setAd(res);
                    // Initialize Modifiers with Original content
                    setModifiedContent({
                        postText: res.postText || res.description || '',
                        buttonText: res.buttonText || 'Open Link',
                        link: res.link || '',
                        mediaPreview: res.mediaPreview,
                        mediaFile: null,
                        entities: res.entities || []
                    });
                    setAmount(res.budget || ''); // Default to budget as requested
                }
            } catch (e) {
                console.error("Failed to fetch ad", e);
                addNotification('error', 'Failed to load ad details');
            } finally {
                setLoading(false);
            }
        };

        if (adId) fetchAd();
    }, [adId, get]);

    // Initialize Channel
    useEffect(() => {
        if (userProfile?.channels?.length > 0 && !selectedChannel) {
            setSelectedChannel(userProfile.channels[0]);
        }
    }, [userProfile]);


    // Channel Dropdown helpers
    const toggleChannelDropdown = () => setIsChannelDropdownOpen(!isChannelDropdownOpen);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setModifiedContent(prev => ({
                ...prev,
                mediaFile: file,
                mediaPreview: URL.createObjectURL(file)
            }));
        }
    };

    // Features
    const handleSeePreview = async () => {
        try {
            await post('/ads/send-preview', {
                method: 'new',
                text: modifiedContent.postText,
                entities: modifiedContent.entities,
                buttons: modifiedContent.link ? [[{ text: modifiedContent.buttonText, url: modifiedContent.link }]] : [],
                media: modifiedContent.mediaPreview
            });
            addNotification('success', 'Preview sent to Bot!');
            WebApp.close(); // Minimize app
        } catch (e) {
            console.error(e);
            addNotification('error', 'Failed to send preview');
        }
    };

    const handleRequestChanges = () => {
        addNotification('info', 'Edit post in Bot. App will update automatically.');
        WebApp.close(); // Minimize
        startPolling();
    };

    const startPolling = () => {
        if (pollingRef.current) return;
        setDraftStatus('polling');
        pollingRef.current = setInterval(async () => {
            try {
                const res = await get('/drafts');
                if (res && res.draft) {
                    const d = res.draft;
                    // Check if new (timestamp check omitted for simplicity, assumes logic updates)
                    // Update content
                    setModifiedContent(prev => ({
                        ...prev,
                        postText: d.text || prev.postText,
                        mediaPreview: d.photoUrl || prev.mediaPreview,
                        entities: d.entities || [],
                        link: d.buttons?.[0]?.[0]?.url || prev.link,
                        buttonText: d.buttons?.[0]?.[0]?.text || prev.buttonText,
                    }));
                    setDraftStatus('found');
                    addNotification('success', 'New draft captured!');
                    stopPolling();
                }
            } catch (e) { }
        }, 3000);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const handleSubmit = async () => {
        if (!selectedChannel || !amount) {
            addNotification('warning', 'Please select a channel and enter amount');
            return;
        }
        if (parseFloat(amount) > parseFloat(ad.budget)) {
            addNotification('error', `Amount cannot exceed max budget of ${ad.budget}`);
            return;
        }

        setSubmitting(true);
        try {
            // 1. Upload Media if changed
            let finalMediaUrl = modifiedContent.mediaPreview;
            if (modifiedContent.mediaFile) {
                const uploadData = new FormData();
                uploadData.append('file', modifiedContent.mediaFile);
                const uploadRes = await fetch(`${backendUrl}/upload`, {
                    method: 'POST',
                    body: uploadData
                });
                if (!uploadRes.ok) throw new Error('Image upload failed');
                const uploadJson = await uploadRes.json();
                finalMediaUrl = uploadJson.url;
            }

            // 2. Prepare Payload
            const payload = {
                adId: ad.id,
                channelId: selectedChannel.id,
                amount,
                duration,
                proofDuration: duration,
                modifiedContent: {
                    postText: modifiedContent.postText,
                    buttonText: modifiedContent.buttonText,
                    link: modifiedContent.link,
                    mediaPreview: finalMediaUrl,
                    entities: modifiedContent.entities // Pass entities!
                }
            };

            const res = await post('/deals/request', payload);
            if (res.success) {
                addNotification('success', 'Offer sent successfully!');
                navigate('ads'); // Return to ads feed
            }
        } catch (e) {
            console.error(e);
            addNotification('error', 'Failed to send offer');
        } finally {
            setSubmitting(false);
        }
    };

    // Cleanup polling
    useEffect(() => {
        return () => stopPolling();
    }, []);

    if (loading) return <div className={styles.page} style={style}>Loading...</div>;
    if (!ad) return (
        <div className={styles.page} style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text-muted)' }}>Ad not found or removed</div>
        </div>
    );

    return (
        <div className={styles.page} style={style}>
            {/* Header Removed as requested */}

            <div className={styles.section}>
                <div className={styles.sectionTitle}>1. Select Channel & Offer</div>

                {/* Custom Channel Dropdown */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                    <div
                        className={styles.channelSelector}
                        onClick={toggleChannelDropdown}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            padding: '12px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        {selectedChannel ? (
                            <>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📢</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>{selectedChannel.title}</div>
                                    <div style={{ fontSize: 12, opacity: 0.6 }}>{selectedChannel.subscribers} subs</div>
                                </div>
                                <FiChevronDown />
                            </>
                        ) : <span>Select Channel</span>}
                    </div>

                    {isChannelDropdownOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '100%', left: 0, right: 0,
                            background: '#1e1e1e', // Dark bg
                            borderRadius: '12px',
                            marginTop: 4,
                            zIndex: 10,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            maxHeight: 200,
                            overflowY: 'auto',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {userProfile?.channels?.map(ch => (
                                <div
                                    key={ch.id}
                                    onClick={() => {
                                        setSelectedChannel(ch);
                                        setIsChannelDropdownOpen(false);
                                    }}
                                    style={{
                                        padding: '10px 12px',
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        background: selectedChannel?.id === ch.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                                    }}
                                >
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📢</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: '500' }}>{ch.title}</div>
                                        <div style={{ fontSize: 11, opacity: 0.5 }}>{ch.subscribers} subs</div>
                                    </div>
                                    {selectedChannel?.id === ch.id && <FiCheck color="#3b82f6" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label className={styles.label}>Asking Price (TON)</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={`Max: ${ad.budget}`}
                        />
                    </div>
                    <div>
                        <label className={styles.label}>Post Duration</label>
                        <select
                            className={styles.select}
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                        >
                            <option value="12">12 Hours</option>
                            <option value="24">24 Hours</option>
                            <option value="48">48 Hours</option>
                            <option value="72">72 Hours</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>
                    <FiEdit2 /> 2. Content & Preview
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <button onClick={handleSeePreview} className={styles.actionBtn} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
                        See Preview (App)
                    </button>
                    <button onClick={handleRequestChanges} className={styles.actionBtn} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        Request Changes <FiRefreshCw className={draftStatus === 'polling' ? styles.spin : ''} />
                    </button>
                </div>

                {/* Compare View */}
                <div className={styles.compareContainer}>
                    {/* Original */}
                    <div className={styles.compareCol}>
                        <div className={styles.compareLabel}>Original</div>
                        <div className={styles.miniPreview}>
                            {ad.mediaPreview && <img src={ad.mediaPreview} style={{ maxHeight: 50, maxWidth: '100%', borderRadius: 4 }} />}
                            <TelegramPostRenderer
                                text={ad.postText || ad.description}
                                entities={ad.entities}
                                style={{ fontSize: '6px', lineHeight: '1.2' }}
                                staticEmoji={true}
                            />
                        </div>
                    </div>

                    {/* Modified */}
                    <div className={styles.compareCol}>
                        <div className={styles.compareLabel} style={{ color: '#10b981' }}>Your Proposal</div>
                        <div className={styles.miniPreview} style={{ borderColor: '#10b981' }}>
                            {modifiedContent.mediaPreview ? (
                                <img src={modifiedContent.mediaPreview} style={{ maxHeight: 50, maxWidth: '100%', borderRadius: 4 }} />
                            ) : <div style={{ height: 50, background: '#333', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No IMG</div>}

                            <TelegramPostRenderer
                                text={modifiedContent.postText}
                                entities={modifiedContent.entities}
                                style={{ fontSize: '6px', lineHeight: '1.2' }}
                                staticEmoji={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Edit Controls (Collapsed or Minimal) */}
                <div style={{ marginTop: 16 }}>
                    <label className={styles.label}>Manual Edit Text</label>
                    <textarea
                        className={styles.textarea}
                        rows={3}
                        value={modifiedContent.postText}
                        onChange={(e) => setModifiedContent({ ...modifiedContent, postText: e.target.value })}
                        style={{ fontSize: 12 }}
                    />
                </div>
            </div>

            <div className={styles.footer}>
                <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Sending Offer...' : 'Send Deal Request'}
                </button>
            </div>
        </div>
    );
};

export default RequestDeal;
