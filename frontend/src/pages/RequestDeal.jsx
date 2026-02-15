import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiImage, FiEdit2, FiChevronDown, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';
import { useNotification } from '../context/NotificationContext';
import styles from './RequestDeal.module.css';
import WebApp from '@twa-dev/sdk';
import TelegramPostRenderer from '../components/TelegramPostRenderer';

import { useUserCache } from '../context/UserCacheContext';

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
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
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
    const { resolveUser, getCachedUser } = useUserCache();

    const [ad, setAd] = useState(null);
    const [channelData, setChannelData] = useState(null); // Host Channel Data
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
    const [amount, setAmount] = useState('');
    // Duration removed as requested

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

    // Load Ad & Channel Data
    useEffect(() => {
        const fetchAd = async () => {
            try {
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
                    setAmount(res.budget || '');

                    // Fetch Channel Data for the Ad's Source Channel
                    const targetId = res.channelId || res.userId;
                    if (targetId) {
                        try {
                            const cRes = await resolveUser(targetId);
                            setChannelData(cRes);
                        } catch (e) {
                            const cached = getCachedUser(targetId);
                            if (cached) setChannelData(cached);
                        }
                    } else if (res.username) {
                        try {
                            const cRes = await resolveUser(res.username);
                            setChannelData(cRes);
                        } catch (e) { }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch ad", e);
                addNotification('error', 'Failed to load ad details');
            } finally {
                setLoading(false);
            }
        };

        if (adId) fetchAd();
    }, [adId, get, resolveUser, getCachedUser]);

    // Initialize Channel
    useEffect(() => {
        if (userProfile?.channels?.length > 0 && !selectedChannel) {
            setSelectedChannel(userProfile.channels[0]);
        }
    }, [userProfile]);

    // Back Button Handling
    useEffect(() => {
        if (isVisible) {
            WebApp.BackButton.show();
            const handleBack = () => {
                if (ad) sessionStorage.setItem('openAdId', ad.id);
                navigate('ads');
            };
            WebApp.BackButton.onClick(handleBack);
            return () => {
                WebApp.BackButton.offClick(handleBack);
                WebApp.BackButton.hide();
            };
        }
    }, [isVisible, navigate, ad]);

    // Click Outside Dropdown
    const dropdownRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsChannelDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const toggleChannelDropdown = () => setIsChannelDropdownOpen(!isChannelDropdownOpen);

    // Helpers to upload image before preview
    const uploadImage = async (file) => {
        const uploadData = new FormData();
        uploadData.append('file', file);
        const uploadRes = await fetch(`${backendUrl}/upload`, {
            method: 'POST',
            body: uploadData
        });
        if (!uploadRes.ok) throw new Error('Image upload failed');
        const uploadJson = await uploadRes.json();
        return uploadJson.url;
    };

    // Interaction Helpers
    const lastPreviewRef = useRef({ time: 0, msgId: null });

    const sendPreviewIfNeeded = async (force = false) => {
        const now = Date.now();
        // If sent within last 60s, skip unless forced
        if (!force && now - lastPreviewRef.current.time < 60000 && lastPreviewRef.current.msgId) {
            console.log("Preview sent recently, reusing.");
            return lastPreviewRef.current.msgId;
        }

        let mediaUrl = modifiedContent.mediaPreview;
        if (modifiedContent.mediaFile) {
            addNotification('info', 'Uploading media for preview...');
            mediaUrl = await uploadImage(modifiedContent.mediaFile);
        }
        if (mediaUrl && mediaUrl.startsWith('blob:')) mediaUrl = null;

        const res = await post('/ads/send-preview', {
            method: 'new',
            text: modifiedContent.postText,
            entities: modifiedContent.entities,
            buttons: modifiedContent.link ? [[{ text: modifiedContent.buttonText, url: modifiedContent.link }]] : [],
            media: mediaUrl
        });

        if (res.success) {
            lastPreviewRef.current = { time: Date.now(), msgId: res.messageId };
            return res.messageId;
        }
        throw new Error("Failed to send preview");
    };

    const handleSeePreview = async () => {
        console.log("[RequestDeal] See Preview Clicked");
        try {
            await sendPreviewIfNeeded();
            addNotification('success', 'Preview sent! Opening Bot...');
            WebApp.openTelegramLink('https://t.me/CredantBot');
        } catch (e) {
            console.error(e);
            addNotification('error', 'Failed to send preview');
        }
    };

    const handleRequestChanges = async () => {
        console.log("[RequestDeal] Request Changes Clicked");
        try {
            const msgId = await sendPreviewIfNeeded();

            // Send instruction reply
            await post('/ads/send-preview', { // Reusing endpoint for simple text msg
                method: 'new',
                text: "Send me the change you want in this post (Reply to this message or just send text)",
                replyTo: msgId
            });

            addNotification('info', 'Please send your changes in the Bot.');
            WebApp.openTelegramLink('https://t.me/CredantBot');
            startPolling();

        } catch (e) {
            console.error(e);
            addNotification('error', 'Failed to initiate change request');
        }
    };

    const startPolling = () => {
        if (pollingRef.current) return;
        setDraftStatus('polling');
        // Poll for modifications
        pollingRef.current = setInterval(async () => {
            try {
                const res = await get('/drafts');
                if (res && res.draft) {
                    const d = res.draft;
                    // Check if strictly newer? For now any draft.
                    setModifiedContent(prev => ({
                        ...prev,
                        postText: d.text || prev.postText,
                        mediaPreview: d.photoUrl || prev.mediaPreview,
                        entities: d.entities || [],
                        link: d.buttons?.[0]?.[0]?.url || prev.link,
                        buttonText: d.buttons?.[0]?.[0]?.text || prev.buttonText,
                    }));
                    setDraftStatus('found');
                    addNotification('success', 'Changes applied!');
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
            let finalMediaUrl = modifiedContent.mediaPreview;
            if (modifiedContent.mediaFile) {
                finalMediaUrl = await uploadImage(modifiedContent.mediaFile);
            }

            const payload = {
                adId: ad.id,
                channelId: selectedChannel.id,
                amount,
                duration: 24, // Default as request logic was 24? User said remove selector, not logic.
                proofDuration: 24,
                modifiedContent: {
                    postText: modifiedContent.postText,
                    buttonText: modifiedContent.buttonText,
                    link: modifiedContent.link,
                    mediaPreview: finalMediaUrl,
                    entities: modifiedContent.entities
                }
            };

            const res = await post('/deals/request', payload);
            if (res.success) {
                addNotification('success', 'Offer sent successfully!');
                navigate('ads');
            }
        } catch (e) {
            console.error(e);
            addNotification('error', 'Failed to send offer');
        } finally {
            setSubmitting(false);
        }
    };

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

            <div className={styles.scrollContent}>

                {/* 0. Target Campaign Info (New) */}
                <div className={styles.section}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'rgba(255,255,255,0.05)', overflow: 'hidden',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {channelData?.photoUrl || ad.mediaPreview ? (
                                <img
                                    src={channelData?.photoUrl || ad.mediaPreview}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                            ) : <span style={{ fontSize: '20px' }}>📢</span>}
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Requesting Deal From</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                {channelData?.title || channelData?.name || ad.title}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--primary)' }}>
                                {channelData?.username ? `@${channelData.username}` : ''} {channelData?.subscribers ? `• ${channelData.subscribers} subs` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionTitle}>1. Select Channel & Offer</div>

                    {/* Custom Channel Dropdown */}
                    <div style={{ position: 'relative', marginBottom: 16 }} ref={dropdownRef}>
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
                                    {selectedChannel.photoUrl ? (
                                        <img src={selectedChannel.photoUrl} style={{ width: 32, height: 32, borderRadius: '50%' }} alt="Ch" />
                                    ) : (
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📢</div>
                                    )}
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
                                background: '#1e1e1e',
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
                                        {ch.photoUrl ? (
                                            <img src={ch.photoUrl} style={{ width: 28, height: 28, borderRadius: '50%' }} alt="Ch" />
                                        ) : (
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📢</div>
                                        )}
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
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
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionTitle}>
                        <FiEdit2 /> 2. Content & Preview
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                        <button onClick={handleSeePreview} className={styles.actionBtn} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
                            See Preview (App)
                        </button>
                        {ad.postMethod !== 'forward' && (
                            <button onClick={handleRequestChanges} className={styles.actionBtn} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                Request Changes <FiRefreshCw className={draftStatus === 'polling' ? styles.spin : ''} />
                            </button>
                        )}
                    </div>

                    {/* Compare View - Only if modified */}
                    {draftStatus === 'found' && (
                        <div className={styles.compareContainer}>
                            {/* Original */}
                            <div className={styles.compareCol}>
                                <div className={styles.compareLabel}>Original</div>
                                <TelegramPostRenderer
                                    text={ad.postText || ad.description}
                                    entities={ad.entities}
                                    style={{ fontSize: '6px', lineHeight: '1.2' }}
                                    staticEmoji={true}
                                    showCard={true}
                                    mediaPreview={ad.mediaPreview}
                                    buttonText={ad.buttonText}
                                    link={ad.link}
                                />
                            </div>

                            {/* Modified */}
                            <div className={styles.compareCol}>
                                <div className={styles.compareLabel} style={{ color: '#10b981' }}>Your Proposal</div>
                                <TelegramPostRenderer
                                    text={modifiedContent.postText}
                                    entities={modifiedContent.entities}
                                    style={{ fontSize: '6px', lineHeight: '1.2' }}
                                    staticEmoji={true}
                                    showCard={true}
                                    mediaPreview={modifiedContent.mediaPreview}
                                    buttonText={modifiedContent.buttonText}
                                    link={modifiedContent.link}
                                />
                            </div>
                        </div>
                    )}

                    {/* Fallback View if no comparison active? Or just show the current Proposal as full size? */}
                    {draftStatus !== 'found' && (
                        <div style={{ marginTop: 12 }}>
                            <div className={styles.compareLabel} style={{ marginBottom: 8 }}>Current Post</div>
                            <TelegramPostRenderer
                                text={modifiedContent.postText || ad.postText || ad.description}
                                entities={modifiedContent.entities?.length ? modifiedContent.entities : ad.entities}
                                style={{ fontSize: '13px' }}
                                staticEmoji={true}
                                showCard={true}
                                mediaPreview={modifiedContent.mediaPreview || ad.mediaPreview}
                                buttonText={modifiedContent.buttonText || ad.buttonText}
                                link={modifiedContent.link || ad.link}
                            />
                        </div>
                    )}

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
