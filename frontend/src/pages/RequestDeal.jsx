import React, { useState, useEffect } from 'react';
// Hook override if needed, but let's just add logic inside component
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiImage, FiEdit2 } from 'react-icons/fi';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';
import { useNotification } from '../context/NotificationContext';
import styles from './RequestDeal.module.css';

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
        zIndex: 50,
        background: 'var(--bg-color)',
        transition: 'transform 0.3s ease-out',
        overflowY: 'auto'
    };

    // If using React Router, useParams works. If custom router, we might default to sessionStorage.
    // const params = useParams(); // REMOVED: react-router-dom not available
    const adId = sessionStorage.getItem('selectedAdId');
    const navigate = (path) => {
        if (onNavigate) onNavigate(path); // Use custom navigator if provided
        else window.history.back(); // Fallback
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
    const [amount, setAmount] = useState('');
    const [duration, setDuration] = useState('24');

    // Modifiers State
    const [modifiedContent, setModifiedContent] = useState({
        postText: '',
        buttonText: '',
        link: '',
        mediaPreview: null,
        mediaFile: null // For upload
    });

    useEffect(() => {
        const fetchAd = async () => {
            try {
                // Fetch public ad details. Assuming generic get /ads/:id works or we filter from list
                // Since generic /ads returns all, we might need a specific endpoint or just filter.
                // Let's assume we can fetch specific ad by ID or filter.
                // Actually existing /ads returns ALL. Better to check if we can fetch one. 
                // For now, I'll fetch object from a hypothetical endpoint or just reuse /ads

                // Let's implement a quick GET /ads/:id on backend if needed, or filter client side from a cached list?
                // Filtering from ALL ads is inefficient but works for now. 
                // Wait, useApi 'get' is avail. Let's try /ads first.
                // BUT, better to just reuse state if passed? No, direct link support needed.

                // Assuming backend supports GET /ads/:id or I add it. 
                // I'll add GET /ads/:id support to backend ads.js quickly if not there.
                // Checking ads.js... it only has GET / (all) and GET /my-ads.
                // I will add GET /api/ads/:id to backend.

                const res = await get(`/ads/${adId}`);
                if (res) {
                    setAd(res);
                    // Initialize Modifiers with Original content
                    setModifiedContent({
                        postText: res.postText || res.description || '',
                        buttonText: res.buttonText || 'Open Link',
                        link: res.link || '',
                        mediaPreview: res.mediaPreview,
                        mediaFile: null
                    });
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

    useEffect(() => {
        if (userProfile?.channels?.length > 0 && !selectedChannel) {
            setSelectedChannel(userProfile.channels[0]);
        }
    }, [userProfile]);

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
                    mediaPreview: finalMediaUrl
                }
            };

            const res = await post('/deals/request', payload);
            if (res.success) {
                addNotification('success', 'Offer sent successfully!');
                navigate('/ads'); // Return to ads feed
            }
        } catch (e) {
            console.error(e);
            addNotification('error', 'Failed to send offer');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className={styles.page} style={style}>Loading...</div>;
    if (!ad) return <div className={styles.page} style={style}>Ad not found</div>;

    return (
        <div className={styles.page} style={style}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate('ads')}>
                    <FiChevronLeft size={24} />
                </button>
                <div className={styles.title}>Request Deal</div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>1. Select Channel & Offer</div>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '16px' }}>
                    {userProfile?.channels?.map(ch => (
                        <div
                            key={ch.id}
                            className={`${styles.channelItem} ${selectedChannel?.id === ch.id ? styles.selected : ''}`}
                            onClick={() => setSelectedChannel(ch)}
                        >
                            <div style={{ fontSize: '18px', marginBottom: '4px' }}>📢</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{ch.title || ch.username}</div>
                            <div style={{ fontSize: '10px', color: '#aaa' }}>{ch.subscribers} subs</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label className={styles.label}>Amount (TON)</label>
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
                    <FiEdit2 /> 2. Customize Content (Optional)
                </div>
                <div style={{ marginBottom: '16px' }}>
                    <label className={styles.label}>Ad Visual</label>
                    <div className={styles.imageUpload} onClick={() => document.getElementById('reqMediaInput').click()}>
                        {modifiedContent.mediaPreview ? (
                            <img src={modifiedContent.mediaPreview} alt="Preview" />
                        ) : (
                            <div style={{ opacity: 0.5 }}>
                                <FiImage size={24} />
                                <div style={{ fontSize: '12px', marginTop: '8px' }}>Original Image Missing</div>
                            </div>
                        )}
                        <input id="reqMediaInput" type="file" hidden onChange={handleFileChange} accept="image/*" />
                    </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label className={styles.label}>Post Text</label>
                    <textarea
                        className={styles.textarea}
                        rows={5}
                        value={modifiedContent.postText}
                        onChange={(e) => setModifiedContent({ ...modifiedContent, postText: e.target.value })}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div>
                        <label className={styles.label}>Button Text</label>
                        <input
                            className={styles.input}
                            value={modifiedContent.buttonText}
                            onChange={(e) => setModifiedContent({ ...modifiedContent, buttonText: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className={styles.label}>Link</label>
                        <input
                            className={styles.input}
                            value={modifiedContent.link}
                            onChange={(e) => setModifiedContent({ ...modifiedContent, link: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* PREVIEW */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>Preview</div>
                <div className={styles.previewCard}>
                    <div style={{ position: 'relative' }}>
                        {modifiedContent.mediaPreview && (
                            <img src={modifiedContent.mediaPreview} className={styles.previewImage} alt="Visual" />
                        )}
                    </div>

                    <div className={styles.previewContent}>
                        <div className={styles.previewText} style={{ whiteSpace: 'pre-wrap' }}>
                            {modifiedContent.postText}
                        </div>
                        {modifiedContent.link && (
                            <button className={styles.previewButton} onClick={() => { }}>
                                {modifiedContent.buttonText || 'Open Link'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.footer}>
                <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Request'}
                </button>
            </div>
        </div>
    );
};

export default RequestDeal;
