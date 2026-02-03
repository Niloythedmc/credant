import React, { useState, useMemo } from 'react';
import styles from './PostAds.module.css';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiImage, FiCheck, FiSearch } from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';
import { AnimatePresence, motion } from 'framer-motion';

const PostAds = ({ activePage, onNavigate }) => {
    const { t } = useTranslation();
    const { addNotification } = useNotification();
    const isVisible = activePage === 'postAds';
    const [phase, setPhase] = useState(1);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        subject: '',
        // Phase 2
        promotionTypes: [],
        duration: 7, // days
        budget: '', // per day
        // Phase 3
        geo: [],
        channels: [],
        ageRange: [18, 40],
        // Phase 4
        postText: '',
        media: null,
        mediaPreview: null,
        link: '',
    });

    const style = {
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBack = () => {
        if (phase > 1) {
            setPhase(p => p - 1);
        } else {
            onNavigate('feed'); // Or whatever the valid "close" action is
            window.history.back(); // If strictly using history
        }
    };

    const handleNext = () => {
        if (validatePhase()) {
            setPhase(p => p + 1);
        }
    };

    const validatePhase = () => {
        switch (phase) {
            case 1:
                if (!formData.title || !formData.description || !formData.subject) {
                    addNotification('warning', t('ads.fillAllFields'));
                    return false;
                }
                return true;
            case 2:
                if (formData.promotionTypes.length === 0 || !formData.budget) {
                    addNotification('warning', t('ads.selectTypeAndBudget'));
                    return false;
                }
                return true;
            case 3:
                // Optional validation? Let's say Geo is required.
                if (formData.geo.length === 0) {
                    addNotification('warning', t('ads.selectGeo'));
                    return false;
                }
                return true;
            case 4:
                if (!formData.postText || !formData.media) {
                    addNotification('warning', t('ads.addTextAndMedia'));
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handlePayAndCreate = () => {
        // Mock API call
        addNotification('success', t('ads.campaignCreated'));
        addNotification('info', 'Contract Signed & Paid 50 TON');

        // Reset and close
        setTimeout(() => {
            setFormData({
                title: '', description: '', subject: '', promotionTypes: [],
                duration: 7, budget: '', geo: [], channels: [], ageRange: [18, 40],
                postText: '', media: null, mediaPreview: null, link: ''
            });
            setPhase(1);
            onNavigate('feed'); // Go back
        }, 1500);
    };

    // --- RENDER HELPERS ---

    // Phase 1: Basic Info
    const renderPhase1 = () => (
        <div className={styles.phaseContainer}>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.campaignTitle')}</label>
                <input
                    className={styles.input}
                    placeholder="e.g. Summer Sale 2024"
                    value={formData.title}
                    onChange={e => handleChange('title', e.target.value)}
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.description')}</label>
                <textarea
                    className={styles.textarea}
                    placeholder="Internal description for your campaign..."
                    value={formData.description}
                    onChange={e => handleChange('description', e.target.value)}
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.promotionSubject')}</label>
                <select
                    className={styles.select}
                    value={formData.subject}
                    onChange={e => handleChange('subject', e.target.value)}
                >
                    <option value="">Select Subject</option>
                    <option value="channel">Telegram Channel</option>
                    <option value="bot">Telegram Bot / MiniApp</option>
                    <option value="web3">Web3 Project</option>
                    <option value="website">External Website</option>
                </select>
            </div>
        </div>
    );

    // Phase 2: Details & Budget
    const categories = ['Web3', 'Crypto', 'News', 'Game', 'Tools', 'Education', 'Entertainment', 'Others'];

    const toggleCategory = (cat) => {
        const current = formData.promotionTypes;
        if (current.includes(cat)) {
            handleChange('promotionTypes', current.filter(c => c !== cat));
        } else {
            if (current.length >= 3) return; // Max 3
            handleChange('promotionTypes', [...current, cat]);
        }
    };

    // Simple Calculate Reach
    const estimatedReach = useMemo(() => {
        const budget = parseFloat(formData.budget) || 0;
        if (budget <= 0) return 0;
        // Mock formula: CPM approx 15 TON? No, CPM 10-20. Average 15.
        // Budget / (15/1000) = Budget * 1000 / 15
        return Math.floor((budget * 1000) / 15 * formData.duration);
    }, [formData.budget, formData.duration]);

    const renderPhase2 = () => (
        <div className={styles.phaseContainer}>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.promotionType')} (Max 3)</label>
                <div className={styles.tagsContainer}>
                    {categories.map(cat => (
                        <div
                            key={cat}
                            className={`${styles.tagChip} ${formData.promotionTypes.includes(cat) ? styles.selected : ''}`}
                            onClick={() => toggleCategory(cat)}
                        >
                            {cat}
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.duration')} ({formData.duration} days)</label>
                <input
                    type="range"
                    min="1"
                    max="30"
                    className={styles.rangeInput}
                    value={formData.duration}
                    onChange={e => handleChange('duration', parseInt(e.target.value))}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.dailyBudget')} (TON)</label>
                <input
                    type="number"
                    className={styles.input}
                    placeholder="e.g. 10.5"
                    value={formData.budget}
                    onChange={e => handleChange('budget', e.target.value)}
                />
            </div>

            <div className={styles.reachCard}>
                <span className={styles.reachLabel}>{t('ads.estReach')}</span>
                <span className={styles.reachValue}>~ {estimatedReach.toLocaleString()}</span>
                <span style={{ fontSize: '12px', opacity: 0.7, display: 'block' }}>Based on market CPM</span>
            </div>
        </div>
    );

    // Phase 3: Targeting
    const geoOptions = ['Global', 'India', 'Russia', 'USA', 'Europe', 'China', 'Africa'];
    const toggleGeo = (g) => {
        const current = formData.geo;
        if (current.includes(g)) {
            handleChange('geo', current.filter(x => x !== g));
        } else {
            handleChange('geo', [...current, g]);
        }
    };

    // Mock Channel Search
    const [searchQ, setSearchQ] = useState('');
    const allChannels = [
        { id: 1, name: '@crypto_news', subs: '500k' },
        { id: 2, name: '@daily_memes', subs: '1.2M' },
        { id: 3, name: '@tech_today', subs: '250k' },
    ];
    const filteredChannels = searchQ.startsWith('@')
        ? allChannels.filter(c => c.name.includes(searchQ))
        : [];

    const addChannel = (chan) => {
        if (!formData.channels.find(c => c.id === chan.id)) {
            handleChange('channels', [...formData.channels, chan]);
        }
        setSearchQ('');
    };

    const renderPhase3 = () => (
        <div className={styles.phaseContainer}>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.targetGeo')}</label>
                <div className={styles.tagsContainer}>
                    {geoOptions.map(g => (
                        <div
                            key={g}
                            className={`${styles.tagChip} ${formData.geo.includes(g) ? styles.selected : ''}`}
                            onClick={() => toggleGeo(g)}
                        >
                            {g}
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.targetChannels')}</label>
                <div className={styles.inputWrapper} style={{ position: 'relative' }}>
                    <input
                        className={styles.input}
                        placeholder="Search via @"
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                    />
                    <FiSearch style={{ position: 'absolute', right: 12, top: 14, opacity: 0.5 }} />
                </div>
                {searchQ && (
                    <div className={styles.channelList}>
                        {filteredChannels.length > 0 ? filteredChannels.map(c => (
                            <div key={c.id} className={styles.channelItem} onClick={() => addChannel(c)}>
                                <span>{c.name}</span>
                                <span style={{ opacity: 0.6, fontSize: '12px' }}>{c.subs}</span>
                            </div>
                        )) : <div style={{ padding: 10, opacity: 0.5, fontSize: 13 }}>No matches found</div>}
                    </div>
                )}
                <div className={styles.tagsContainer} style={{ marginTop: 8 }}>
                    {formData.channels.map(c => (
                        <div key={c.id} className={styles.tagChip + ' ' + styles.selected} onClick={() => handleChange('channels', formData.channels.filter(x => x.id !== c.id))}>
                            {c.name} ✕
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.ageRange')} ({formData.ageRange[0]} - {formData.ageRange[1]})</label>
                <div style={{ padding: '0 10px' }}>
                    {/* Simplified Range UI - Dual slider is complex in vanilla input range, using mock visual or two inputs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                            type="number"
                            className={styles.input}
                            value={formData.ageRange[0]}
                            min="13" max={formData.ageRange[1]}
                            onChange={e => handleChange('ageRange', [parseInt(e.target.value), formData.ageRange[1]])}
                        />
                        <span>to</span>
                        <input
                            type="number"
                            className={styles.input}
                            value={formData.ageRange[1]}
                            min={formData.ageRange[0]} max="100"
                            onChange={e => handleChange('ageRange', [formData.ageRange[0], parseInt(e.target.value)])}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    // Phase 4: Creative
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleChange('media', file);
            handleChange('mediaPreview', URL.createObjectURL(file));
        }
    };

    const highlightText = (text) => {
        // Basic highlight logic for visual feedback
        const parts = text.split(/([@#][\w.]+)/g);
        return (
            <div className={styles.previewText} style={{ marginTop: 8 }}>
                {parts.map((part, i) => (
                    <span key={i} className={part.match(/[@#][\w.]+/) ? styles.highlight : ''}>
                        {part}
                    </span>
                ))}
            </div>
        );
    };

    const renderPhase4 = () => (
        <div className={styles.phaseContainer}>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.postText')}</label>
                <textarea
                    className={styles.textarea}
                    placeholder="Write your ad copy here. Use @mentions and #tags..."
                    rows={4}
                    value={formData.postText}
                    onChange={e => handleChange('postText', e.target.value)}
                />
                {formData.postText && <div>{highlightText(formData.postText)}</div>}
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.media')} (Max 10s Video or Image)</label>
                <div
                    onClick={() => document.getElementById('mediaInput').click()}
                    style={{
                        border: '2px dashed var(--glass-border)',
                        borderRadius: 12,
                        height: 120,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.02)'
                    }}
                >
                    {formData.mediaPreview ? (
                        <img src={formData.mediaPreview} alt="Preview" style={{ height: '100%', borderRadius: 8 }} />
                    ) : (
                        <>
                            <FiImage size={24} style={{ opacity: 0.5 }} />
                            <span style={{ fontSize: 12, marginTop: 8, opacity: 0.5 }}>Tap to upload</span>
                        </>
                    )}
                </div>
                <input
                    id="mediaInput"
                    type="file"
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.buttonLink')} (Optional)</label>
                <input
                    className={styles.input}
                    placeholder="https://t.me/..."
                    value={formData.link} // Changed from formData.targetLink which was missing in state init
                    onChange={e => handleChange('link', e.target.value)}
                />
            </div>
        </div>
    );

    // Phase 5: Preview
    const renderPhase5 = () => (
        <div className={styles.phaseContainer}>
            <h3 style={{ marginBottom: 16 }}>{t('ads.preview')}</h3>
            <div className={styles.previewCard}>
                <div style={{ position: 'relative' }}>
                    {formData.mediaPreview ? (
                        <img src={formData.mediaPreview} className={styles.previewImage} alt="Ad Content" />
                    ) : (
                        <div className={styles.previewImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>NO MEDIA</div>
                    )}
                </div>
                <div className={styles.previewContent}>
                    <div className={styles.previewTitle}>{formData.title}</div>
                    <div className={styles.previewDesc}>{formData.description}</div>
                    {/* Post Text Preview limited to 3 lines logic could go here, but using simple div for now */}
                    <div className={styles.previewText} style={{ marginBottom: 16, background: 'none', padding: 0 }}>
                        {formData.postText}
                    </div>
                    {formData.link && (
                        <button className={styles.previewLinkBtn} onClick={() => window.open(formData.link, '_blank')}>
                            Open Link
                        </button>
                    )}
                </div>
            </div>
            <div className={styles.reachCard} style={{ marginTop: 20 }}>
                <span className={styles.reachLabel}>Estimated Reach</span>
                <span className={styles.reachValue}>{estimatedReach.toLocaleString()}</span>
            </div>
        </div>
    );

    // Phase 6: Payment
    const renderPhase6 = () => (
        <div className={styles.phaseContainer}>
            <h3 style={{ marginBottom: 16 }}>{t('ads.confirmPayment')}</h3>

            <div className={styles.paymentSummary}>
                <div className={styles.summaryRow}>
                    <span>Budget / Day</span>
                    <span>{formData.budget} TON</span>
                </div>
                <div className={styles.summaryRow}>
                    <span>Duration</span>
                    <span>{formData.duration} Days</span>
                </div>
                <div className={styles.summaryRow}>
                    <span>Platform Fee (5%)</span>
                    <span>{(formData.budget * formData.duration * 0.05).toFixed(2)} TON</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.total}`}>
                    <span>Total Cost</span>
                    <span>{(formData.budget * formData.duration * 1.05).toFixed(2)} TON</span>
                </div>
            </div>

            <div className={styles.walletBalance} style={{ justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Account Balance
                </div>
                <b>125.50 TON</b>
            </div>

            <div style={{ fontSize: 13, opacity: 0.7, textAlign: 'center', marginBottom: 20 }}>
                By clicking pay, you agree to the <u style={{ cursor: 'pointer' }}>Terms of Service</u>. A smart contract will be deployed for this campaign.
            </div>
        </div>
    );

    return (
        <div className={styles.page} style={style}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backButton} onClick={handleBack}>
                    <FiChevronLeft />
                </button>
                <div className={styles.headerTitle}>
                    {phase === 6 ? t('ads.payment') : `${t('ads.createCampaign')} ${phase}/6`}
                </div>
                <div className={styles.stepIndicator}>
                    Step {phase}
                </div>
            </div>

            {/* Content */}
            <div className={styles.content}>
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={phase}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {phase === 1 && renderPhase1()}
                        {phase === 2 && renderPhase2()}
                        {phase === 3 && renderPhase3()}
                        {phase === 4 && renderPhase4()}
                        {phase === 5 && renderPhase5()}
                        {phase === 6 && renderPhase6()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <button className={`${styles.button} ${styles.primaryBtn}`} onClick={phase === 6 ? handlePayAndCreate : handleNext}>
                    {phase === 6 ? `Pay & Sign Contract` : t('ads.continue')}
                </button>
            </div>
        </div>
    );
};

export default PostAds;
