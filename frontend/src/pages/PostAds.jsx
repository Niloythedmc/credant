import React, { useState, useMemo } from 'react';
import styles from './PostAds.module.css';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiImage, FiCheck, FiSearch, FiChevronDown } from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';
import WalletActionModal from '../components/WalletActionModal';

const TelegramFetcher = ({ link, onResolved, subject }) => {
    const { post } = useApi();
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [data, setData] = useState(null);
    const lastResolvedLink = React.useRef(""); // Track last resolved link to prevent duplicate calls

    React.useEffect(() => {
        const timeoutId = setTimeout(async () => {
            // Basic validation
            if (!link.includes('t.me') && !link.startsWith('@')) return;
            // Prevent re-fetching same link if data exists
            if (link === lastResolvedLink.current) return;

            setStatus('loading');
            try {
                const res = await post('/ads/resolve-link', { link });
                // Accept result if it has an ID OR a username (for scraped bots)
                if (res && (res.id || res.username)) {
                    setData(res);
                    setStatus('success');
                    lastResolvedLink.current = link; // Update ref
                    onResolved(res);
                } else {
                    // Only set error if we really tried and failed
                    setStatus('error');
                }
            } catch (e) {
                console.error("Fetch failed", e);
                setStatus('error');
            }
        }, 800); // 800ms debounce

        return () => clearTimeout(timeoutId);
    }, [link]); // Effect only depends on link

    if (status === 'idle') return null;
    if (status === 'loading') return <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Checking Telegram...</div>;
    // Hide error after a while or just keep it small
    if (status === 'error') return <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Could not resolve Telegram link</div>;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8 }}>
            {data?.photoUrl && <img src={data.photoUrl} alt="Channel" style={{ width: 32, height: 32, borderRadius: '50%' }} />}
            <div>
                <div style={{ fontSize: 13, fontWeight: 'bold' }}>{data?.title}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>@{data?.username} • {data?.type}</div>
            </div>
            <div style={{ marginLeft: 'auto', color: '#10b981' }}><FiCheck /></div>
        </div>
    );
};

const CustomSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = React.useRef(null);

    // Click outside handler
    React.useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const selectedOption = options.find(o => o.id === value);

    return (
        <div className={styles.selectWrapper} ref={wrapperRef}>
            <div className={styles.selectInput} onClick={() => setIsOpen(!isOpen)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: selectedOption ? 1 : 0.5 }}>
                    {selectedOption && <span>{selectedOption.icon}</span>}
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <FiChevronDown style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.dropdown}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {options.map(opt => (
                            <div
                                key={opt.id}
                                className={`${styles.dropdownOption} ${value === opt.id ? styles.selected : ''}`}
                                onClick={() => {
                                    onChange(opt.id);
                                    setIsOpen(false);
                                }}
                            >
                                <span>{opt.icon}</span>
                                {opt.label}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PostAds = ({ activePage, onNavigate }) => {
    const { t } = useTranslation();
    const { addNotification } = useNotification();
    const isVisible = activePage === 'postAds';
    const [phase, setPhase] = useState(1);
    const [loading, setLoading] = useState(false);

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

    // TON Connect
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet();
    const { post } = useApi(); // Use useApi for backend calls

    const handlePayAndCreate = async () => {
        // Inner Wallet Payment doesn't strictly require connected wallet, 
        // as long as user is logged in and has balance.
        // But we might want it for safety? User asked to use Inner Wallet.

        setLoading(true);

        try {
            // 1. Prepare Data
            const payloadData = {
                ...formData,
                budget: parseFloat(formData.budget),
                duration: parseInt(formData.duration),
                // Sanitize mediaPreview: If it's a blob (local file), we can't save it to DB yet.
                // Only allow http/https URLs (from Telegram).
                mediaPreview: (formData.mediaPreview && formData.mediaPreview.startsWith('blob:'))
                    ? null
                    : formData.mediaPreview,
                // We don't need wallet.account.address for payment source, 
                // but maybe for record keeping? backend gets uid.
                walletAddress: userProfile?.wallet?.address
            };

            // 2. Call Backend to Pay (Deduct from Inner Wallet) & Create
            // This endpoint now handles the full transaction on backend.
            const result = await post('/ads/create-contract', payloadData);

            if (!result || !result.success) {
                throw new Error(result?.error || 'Failed to create contract');
            }

            addNotification('success', t('ads.campaignCreated'));
            addNotification('info', `Funds deducted: ${result.totalCost} TON`);

            // Reset and close
            setTimeout(() => {
                setFormData({
                    title: '', description: '', subject: '', promotionTypes: [],
                    duration: 7, budget: '', geo: [], channels: [], ageRange: [18, 40],
                    postText: '', media: null, mediaPreview: null, link: ''
                });
                setPhase(1);
                onNavigate('feed');
            }, 1500);

        } catch (error) {
            console.error('Payment Error:', error);
            addNotification('error', 'Failed to create campaign: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER HELPERS ---

    // Custom Subject Options
    const subjectOptions = [
        { id: 'channel', label: 'Telegram Channel', icon: '📢' },
        { id: 'bot', label: 'Telegram Bot / MiniApp', icon: '🤖' },
        { id: 'web3', label: 'Web3 Project', icon: '🌐' },
        { id: 'website', label: 'External Website', icon: '🔗' },
    ];

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
                <CustomSelect
                    options={subjectOptions}
                    value={formData.subject}
                    onChange={v => handleChange('subject', v)}
                    placeholder={t('ads.selectSubject')}
                />
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
        // Split by whitespace but keep delimiters
        const parts = text.split(/(\s+)/);
        return (
            <div className={styles.previewText} style={{ marginTop: 8 }}>
                {parts.map((part, i) => {
                    // Check if part is a "word" (not whitespace)
                    if (part.trim() === '') return <span key={i}>{part}</span>;

                    // Logic: 
                    // 1. Starts with @ or #
                    // 2. Contains a dot NOT at the start (usually), but simpler: 
                    //    Check if it has a dot. 
                    //    If it ends with a dot, it MUST have another dot inside to be blue.
                    //    e.g. "world." (Black) vs "google.com." (Blue) vs "google.com" (Blue)

                    const hasDot = part.includes('.');
                    const endsWithDot = part.endsWith('.');
                    // Is it a link-like token?
                    const isLink = hasDot && (!endsWithDot || part.slice(0, -1).includes('.'));

                    const shouldHighlight = part.startsWith('@') || part.startsWith('#') || isLink;

                    return (
                        <span key={i} className={shouldHighlight ? styles.highlight : ''}>
                            {part}
                        </span>
                    );
                })}
            </div>
        );
    };

    const renderPhase4 = () => (
        <div className={styles.phaseContainer}>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.postText')}</label>
                <textarea
                    className={styles.textarea}
                    placeholder="Write your ad copy here. Use @mentions, #tags, or links..."
                    rows={4}
                    value={formData.postText}
                    onChange={e => handleChange('postText', e.target.value)}
                />
                {/* Live preview with highlighting */}
                {formData.postText && <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>{highlightText(formData.postText)}</div>}
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.media')} (Optional)</label>
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
                            <span style={{ fontSize: 12, marginTop: 8, opacity: 0.5 }}>Tap to upload (Optional)</span>
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
                    value={formData.link}
                    onChange={e => handleChange('link', e.target.value)}
                />
                {/* Telegram Auto-Fetch Preview */}
                {(formData.subject === 'channel' || formData.subject === 'bot') && formData.link && (
                    <TelegramFetcher
                        link={formData.link}
                        subject={formData.subject}
                        onResolved={(data) => {
                            console.log("Telegram Resolved Data:", data); // Log as requested
                            // Auto-fill title/desc if empty
                            setFormData(prev => ({
                                ...prev,
                                title: prev.title || data.title,
                                description: prev.description || data.description || '',
                                targetId: data.id || data.username, // Store ID or Username if ID missing
                                mediaPreview: prev.mediaPreview || data.photoUrl // Optional: use profile pic as media? Maybe nice.
                            }));
                        }}
                    />
                )}
            </div>
        </div>
    );

    // Phase 5: Preview
    const renderPhase5 = () => (
        <div className={styles.phaseContainer}>
            <h3 style={{ marginBottom: 16 }}>{t('ads.preview')}</h3>

            {/* Meta outside preview card */}
            <div className={styles.previewMeta}>
                <div className={styles.previewTitle}>{formData.title || 'Untitled Campaign'}</div>
                <div className={styles.previewDesc}>{formData.description || 'No description'}</div>
            </div>

            <div className={styles.previewCard}>
                <div style={{ position: 'relative' }}>
                    {formData.mediaPreview && (
                        <img src={formData.mediaPreview} className={styles.previewImage} alt="Ad Content" />
                    )}
                </div>

                <div className={styles.previewContent}>
                    {/* Post Text Preview with 3-line limit handled by CSS */}
                    <div className={styles.previewText} style={{ padding: 0 }}>
                        {formData.postText ? highlightText(formData.postText) : 'No text content'}
                    </div>

                    {/* Optional Button */}
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

    // Auth & Profile
    const { userProfile, refreshProfile } = useAuth();
    // Deposit Modal
    const [isDepositModalOpen, setDepositModalOpen] = useState(false);

    // Independent Balance State
    const [walletBalance, setWalletBalance] = useState(0);

    // Fetch balance when entering Phase 6 or when userProfile changes
    React.useEffect(() => {
        const fetchBalance = async () => {
            if (userProfile?.wallet?.address) {
                try {
                    // Use the useApi hook's get method if locally available, 
                    // or define a simple fetch if getting it from useApi is complex here (it's not).
                    // We need 'get' from useApi.
                    // Oh wait, useApi is already destructured as { post }. Let's add { get }.
                    const res = await fetch(`https://credant-production.up.railway.app/api/wallet/balance/${userProfile.wallet.address}`);
                    if (res.ok) {
                        const data = await res.json();
                        setWalletBalance(parseFloat(data.ton || 0));
                    }
                } catch (e) {
                    console.error("Failed to fetch balance in PostAds", e);
                }
            }
        };

        if (phase === 6) {
            fetchBalance();
        }
    }, [phase, userProfile]);


    // Phase 6: Payment
    const renderPhase6 = () => {
        // Use the fetched balance
        const balance = walletBalance;
        const totalCost = (formData.budget * formData.duration * 1.05);
        const hasBalance = balance >= totalCost;

        return (
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
                        <span>{totalCost.toFixed(2)} TON</span>
                    </div>
                </div>

                <div className={styles.walletBalance} style={{ justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        Account Balance
                    </div>
                    <b>{balance.toFixed(2)} TON</b>
                </div>

                {!hasBalance && (
                    <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
                        Insufficient Balance. Please deposit funds to continue.
                    </div>
                )}

                <div style={{ fontSize: 13, opacity: 0.7, textAlign: 'center', marginBottom: 20 }}>
                    By clicking pay, you agree to the <u style={{ cursor: 'pointer' }}>Terms of Service</u>. A smart contract will be deployed for this campaign.
                </div>
            </div>
        );
    };

    // Helper for main button action
    const handleMainAction = () => {
        if (phase < 6) {
            handleNext();
            return;
        }

        const balance = walletBalance;
        const totalCost = (formData.budget * formData.duration * 1.05);

        if (balance < totalCost) {
            setDepositModalOpen(true);
        } else {
            handlePayAndCreate();
        }
    };

    return (
        <div className={styles.page} style={style}>
            <header style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
                position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <button
                    onClick={handleBack}
                    style={{
                        background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                        width: 36, height: 36, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <FiChevronLeft size={20} />
                </button>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                    {phase === 1 ? 'New Campaign' : `Step ${phase} of 6`}
                </h2>
            </header>

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

                        {/* IN-FLOW BUTTON */}
                        <div className={styles.actionBtnContainer}>
                            <button
                                className={`${styles.button} ${styles.primaryBtn}`}
                                onClick={handleMainAction}
                                disabled={loading}
                                style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
                            >
                                {loading ? 'Processing...' : (
                                    phase === 6
                                        ? ((walletBalance) < (formData.budget * formData.duration * 1.05) ? 'Deposit Funds' : 'Pay & Sign Contract')
                                        : t('ads.continue')
                                )}
                            </button>
                        </div>
                    </motion.div >
                </AnimatePresence >
            </div >

            {/* Deposit Modal */}
            {
                userProfile?.wallet && (
                    <WalletActionModal
                        type="deposit"
                        isOpen={isDepositModalOpen}
                        onClose={() => setDepositModalOpen(false)}
                        walletAddress={userProfile.wallet.address}
                        balance={userProfile.wallet.balance}
                        onSuccess={() => {
                            refreshProfile();
                            // Also trigger a local re-fetch if needed, or rely on effect dependency if userProfile updates
                            // Ideally we should call logic to update walletBalance too.
                            // For now refreshProfile usually doesn't update wallet balance in userProfile deep down if it's separate.
                            // Let's force a reload of the page or re-run the effect by some trigger?
                            // Simplest: 
                            setDepositModalOpen(false);
                            // The effect depends on [userProfile]. If refreshProfile updates userProfile, effect runs.
                        }}
                    />
                )
            }
        </div >
    );
};

export default PostAds;
