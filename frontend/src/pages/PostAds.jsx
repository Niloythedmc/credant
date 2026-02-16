import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './PostAds.module.css';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiImage, FiCheck, FiSearch, FiChevronDown, FiX, FiEdit, FiShare2, FiExternalLink, FiLayout, FiLink, FiLayers, FiDollarSign, FiCalendar, FiClock } from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';
import WalletActionModal from '../components/WalletActionModal';
import AnimatedIcon from '../components/Notification/AnimatedIcon';
import TelegramPostRenderer from '../components/TelegramPostRenderer';

// Telegram Fetcher (Keep as is)
const TelegramFetcher = ({ link, onResolved, subject }) => {
    const { post } = useApi();
    const [status, setStatus] = useState('idle');
    const [data, setData] = useState(null);
    const lastResolvedLink = useRef("");

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (!link.includes('t.me') && !link.startsWith('@')) return;
            if (link === lastResolvedLink.current) return;

            setStatus('loading');
            try {
                const res = await post('/ads/resolve-link', { link });
                if (res && (res.id || res.username)) {
                    setData(res);
                    setStatus('success');
                    lastResolvedLink.current = link;
                    onResolved(res);
                } else {
                    setStatus('error');
                }
            } catch (e) {
                console.error("Fetch failed", e);
                setStatus('error');
            }
        }, 800);
        return () => clearTimeout(timeoutId);
    }, [link, post, onResolved]);

    if (status === 'idle') return null;
    if (status === 'loading') return <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Checking Telegram...</div>;
    if (status === 'error') return <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Could not resolve Telegram link</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8 }}>
                {data?.photoUrl && <img src={data.photoUrl} alt="Channel" style={{ width: 32, height: 32, borderRadius: '50%' }} />}
                <div>
                    <div style={{ fontSize: 13, fontWeight: 'bold' }}>{data?.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>@{data?.username} • {data?.type}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: '#10b981' }}><FiCheck /></div>
            </div>
            {data && data.isBotMember === false && (
                <div style={{ fontSize: 13, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⚠️ <span>Add <a href="https://t.me/CredantBot" target="_blank" style={{ color: '#60a5fa', textDecoration: 'underline' }}>@CredantBot</a> to <a href={`https://t.me/${data.username}`} target="_blank" style={{ color: '#60a5fa', textDecoration: 'underline' }}>@{data.username}</a> to enable forwarding.</span>
                </div>
            )}
        </div>
    );
};

// Custom Single Select (Keep for Subject)
const CustomSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
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
                                onClick={(e) => {
                                    e.stopPropagation(); // Fix glitch
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

// MultiSelectInput Component (New)
const MultiSelectInput = ({ options, value = [], onChange, placeholder, max, exclusiveOption }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (optId) => {
        if (exclusiveOption) {
            if (optId === exclusiveOption) {
                // If selecting exclusive ('Global'), clear others
                onChange(value.includes(optId) ? [] : [optId]);
                return;
            } else {
                // If selecting other, create filtered set (remove exclusive option if present)
                let newValue = value.filter(v => v !== exclusiveOption);
                if (newValue.includes(optId)) {
                    newValue = newValue.filter(v => v !== optId);
                } else {
                    if (max && newValue.length >= max) return;
                    newValue.push(optId);
                }
                onChange(newValue);
                return;
            }
        }

        // Standard logic
        let newValue;
        if (value.includes(optId)) {
            newValue = value.filter(v => v !== optId);
        } else {
            if (max && value.length >= max) return;
            newValue = [...value, optId];
        }
        onChange(newValue);
        setIsOpen(false); // Close on select as requested
    };

    const removeTag = (e, optId) => {
        e.stopPropagation(); // Prevent opening dropdown
        onChange(value.filter(v => v !== optId));
    };

    return (
        <div className={styles.multiSelectWrapper} ref={wrapperRef}>
            <div
                className={`${styles.multiSelectInput} ${isOpen ? styles.active : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ flexWrap: 'wrap', gap: '8px', padding: '8px 12px' }}
            >
                {/* Render Tags Inside */}
                {value.length > 0 ? (
                    value.map(id => {
                        // Options can be strings or objects. Assuming user options pass strings but we map to objects?
                        // Actually in parent usage: categories are strings, geoOptions are strings.
                        // So options array is strings? Or objects?
                        // Let's assume options is array of strings OR objects {id, label}.
                        // Based on parent usage: categories map(cat => cat). So options is string[].
                        // Let's handle both.
                        const label = typeof id === 'object' ? id.label : id;
                        // Determine label from options if id is key
                        const foundOpt = options.find(o => (o.id || o) === id);
                        const displayLabel = foundOpt ? (foundOpt.label || foundOpt) : id;

                        return (
                            <div key={id} className={styles.tagChip}>
                                {displayLabel}
                                <span className={styles.remove} onClick={(e) => removeTag(e, id)}><FiX size={14} /></span>
                            </div>
                        );
                    })
                ) : (
                    <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>{placeholder}</span>
                )}
                {/* Always keep a small spacer if needed or flex handles it */}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.dropdown}
                        initial={{ opacity: 0, y: 10 }} // Slide up/down logic or fade
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                    >
                        {options.map((opt) => {
                            const optId = opt.id || opt;
                            const isSelected = value.includes(optId);
                            const label = opt.label || opt;

                            // Check if disabled (e.g. exclusive logic)
                            // If Global is selected, others disabled? Or just handle in select logic? 
                            // Select logic handles it.

                            return (
                                <div
                                    key={optId}
                                    className={`${styles.dropdownOption} ${isSelected ? styles.selected : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Fix glitch
                                        handleSelect(optId);
                                    }}
                                >
                                    {label}
                                    {isSelected && <FiCheck style={{ marginLeft: 'auto' }} />}
                                </div>
                            );
                        })}
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
    const [direction, setDirection] = useState(0); // -1 back, 1 next
    const [loading, setLoading] = useState(false);

    // Auth & Profile
    const { userProfile, refreshProfile, backendUrl } = useAuth();
    // Quick Search Data
    const { get, post } = useApi();
    const [quickChannels, setQuickChannels] = useState([]);

    useEffect(() => {
        // Fetch quick data once on mount
        const fetchQuickData = async () => {
            try {
                const res = await get('/channels/quick-search');
                if (res && res.items) {
                    setQuickChannels(res.items);
                }
            } catch (e) {
                console.error("Failed to fetch quick search data", e);
            }
        };
        fetchQuickData();
    }, [get]);

    const [formData, setFormData] = useState({
        title: '', description: '', subject: '',
        promotionTypes: [], duration: 7, budget: '',
        geo: [], channels: [], ageRange: [18, 40],
        postText: '', media: null, mediaPreview: null, link: '', buttonText: '', entities: [], hasDraftButton: false, views: '', channelPhoto: null,
        mediaFileId: null, buttons: [] // Added for Preview
    });

    const [postMethod, setPostMethod] = useState('new'); // 'new' | 'forward'
    const lastDraftId = useRef(null);

    // Poll for Drafts
    useEffect(() => {
        let interval;
        if (postMethod === 'new' && activePage === 'postAds' && phase === 4) {
            const fetchDraft = async () => {
                try {
                    const res = await get('/drafts');
                    if (res && res.draft) {
                        const d = res.draft;
                        const ts = d.timestamp?._seconds || d.timestamp; // rough check
                        // Check if we already processed this timestamp to avoid overwriting user edits?
                        // Actually, if user is waiting, they want the latest.
                        if (ts !== lastDraftId.current) {
                            console.log("New Draft Found:", d);
                            setFormData(prev => ({
                                ...prev,
                                postText: d.text || prev.postText,
                                mediaPreview: d.photoUrl || prev.mediaPreview,
                                // Parse buttons if needed, e.g. d.buttons[0][0].url
                                link: d.buttons?.[0]?.[0]?.url || prev.link,
                                buttonText: d.buttons?.[0]?.[0]?.text || prev.buttonText,
                                entities: d.entities || [],
                                hasDraftButton: !!(d.buttons && d.buttons.length > 0),
                                mediaFileId: d.photoFileId, // Store file_id
                                buttons: d.buttons // Store raw buttons
                            }));
                            lastDraftId.current = ts;
                        }
                    }
                } catch (e) { }
            };
            fetchDraft();
            interval = setInterval(fetchDraft, 3000);
        }
        return () => clearInterval(interval);
    }, [postMethod, activePage, phase, get]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBack = () => {
        if (phase > 1) {
            setDirection(-1);
            setPhase(p => p - 1);
        } else {
            onNavigate('feed');
        }
    };

    const handleNext = async () => {
        if (validatePhase()) {
            // Trigger Preview on Phase 4 -> 5
            if (phase === 4) {
                // Determine payload
                let payload = {
                    method: postMethod,
                    text: formData.postText,
                    entities: formData.entities
                };

                if (postMethod === 'forward') {
                    payload.link = formData.link;
                    // For forward, we rely on link. 
                    // But if fallback needed, we send media/text too?
                    // Backend handles fallback if we send them?
                    // Currently backend uses scraped data for fallback IF we add that logic, 
                    // but presently backend "Forward failed" just logs. 
                    // Let's send what we have just in case we enhance backend later.
                } else {
                    // Method New
                    payload.media = formData.mediaFileId || formData.mediaPreview; // Prefer FileID
                    // If media is a File object (uploaded manually), we can't send it here easily without upload.
                    // But 'New Post' via Bot means we mostly use Drafts.
                    // If user manually uploaded in UI (Phase 4 top), we have `formData.media` (File).
                    // This implementation focuses on Bot Drafts.
                    // If manual upload, we might need to upload to server first? 
                    // For now, let's assume Bot Draft or URL. 
                    // If manual file, we skip preview or just send text?

                    if (formData.buttons && formData.buttons.length > 0) {
                        payload.buttons = formData.buttons;
                    } else if (formData.link && formData.buttonText) {
                        // Construct button from manual input
                        payload.buttons = [[{ text: formData.buttonText, url: formData.link }]];
                    }
                }

                setLoading(true);
                try {
                    await post('/ads/send-preview', payload);
                    addNotification('success', "Check your Telegram Bot for preview!");
                } catch (e) {
                    console.error("Preview failed", e);
                    // We still proceed? Or warn?
                    // Proceeding allows user to continue even if bot fails (e.g. user blocked bot)
                }
                setLoading(false);
            }

            setDirection(1);
            setPhase(p => p + 1);
        }
    };

    const validatePhase = () => {
        switch (phase) {
            case 1:
                if (!formData.title || !formData.description || !formData.subject) {
                    addNotification('warning', t('ads.fillAllFields'));
                    return false;
                } return true;
            case 2:
                if (formData.promotionTypes.length === 0 || !formData.budget) {
                    addNotification('warning', t('ads.selectTypeAndBudget'));
                    return false;
                } return true;
            case 3:
                // Require Geo (Global or specific)
                if (formData.geo.length === 0) {
                    addNotification('warning', t('ads.selectGeo'));
                    return false;
                } return true;
            case 4:
                if (postMethod === 'forward') {
                    if (!formData.link) {
                        addNotification('warning', 'Please enter a valid Telegram link');
                        return false;
                    }
                    return true;
                }
                // Method 'new': Require at least Text OR Media
                // Check if any content exists
                const hasText = !!formData.postText;
                const hasMedia = !!(formData.media || formData.mediaPreview || formData.mediaFileId);

                if (!hasText && !hasMedia) {
                    addNotification('warning', t('ads.addTextOrMedia') || "Please add text or media");
                    return false;
                }
                return true;
            default: return true;
        }
    };

    // Calculate Reach
    const estimatedReach = useMemo(() => {
        const budget = parseFloat(formData.budget) || 0;
        if (budget <= 0) return 0;
        return Math.floor((budget * 1000) / 15 * formData.duration);
    }, [formData.budget, formData.duration]);

    // --- Render Helpers ---

    const variants = {
        enter: (d) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d) => ({ x: d < 0 ? 300 : -300, opacity: 0 })
    };

    // Phase 1
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
                <input className={styles.input} placeholder="e.g. Summer Sale 2024" value={formData.title} onChange={e => handleChange('title', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.description')}</label>
                <textarea className={styles.textarea} placeholder="Internal description..." value={formData.description} onChange={e => handleChange('description', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.promotionSubject')}</label>
                <CustomSelect options={subjectOptions} value={formData.subject} onChange={v => handleChange('subject', v)} placeholder={t('ads.selectSubject')} />
            </div>
        </div>
    );

    // Phase 2
    const categories = ['Web3', 'Crypto', 'News', 'Game', 'Tools', 'Education', 'Entertainment', 'Others'];

    const renderPhase2 = () => (
        <div className={styles.phaseContainer}>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.promotionType')} (Max 3)</label>
                <MultiSelectInput
                    options={categories}
                    value={formData.promotionTypes}
                    onChange={v => handleChange('promotionTypes', v)}
                    placeholder="Select categories... (Max 3)"
                    max={3}
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.duration')} ({formData.duration} days)</label>
                <input type="range" min="1" max="30" className={styles.rangeInput} value={formData.duration} onChange={e => handleChange('duration', parseInt(e.target.value))} />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.dailyBudget')} (TON)</label>
                <input type="number" className={styles.input} placeholder="e.g. 10.5" value={formData.budget} onChange={e => handleChange('budget', e.target.value)} />
            </div>
            <div className={styles.reachCard}><span className={styles.reachLabel}>{t('ads.estReach')}</span><span className={styles.reachValue}>~ {estimatedReach.toLocaleString()}</span></div>
        </div>
    );

    // Phase 3
    const geoOptions = ['Global', 'India', 'Russia', 'USA', 'Europe', 'China', 'Africa'];
    const [searchQ, setSearchQ] = useState('');

    // Filter Quick Data
    const filteredQuickChannels = useMemo(() => {
        if (!searchQ.startsWith('@')) return [];
        const query = searchQ.slice(1).toLowerCase(); // remove @
        if (!query) return [];
        return quickChannels.filter(c =>
            (c.username && c.username.toLowerCase().includes(query)) ||
            (c.title && c.title.toLowerCase().includes(query))
        ).slice(0, 5); // Limit 5
    }, [searchQ, quickChannels]);

    const addChannel = (chan) => {
        if (!formData.channels.find(c => c.id === chan.id)) {
            handleChange('channels', [...formData.channels, {
                id: chan.id,
                name: chan.title || chan.username,
                photoUrl: chan.photoUrl,
                subscribers: chan.subscribers // If available
            }]);
        }
        setSearchQ('');
    };

    const renderPhase3 = () => (
        <div className={styles.phaseContainer}>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.targetGeo')}</label>
                <MultiSelectInput
                    options={geoOptions}
                    value={formData.geo}
                    onChange={v => handleChange('geo', v)}
                    placeholder="Select regions... (Global exclusive)"
                    exclusiveOption="Global"
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.targetChannels')}</label>
                <div className={styles.inputWrapper} style={{ position: 'relative' }}>
                    <input className={styles.input} placeholder="Search via @" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                    <FiSearch style={{ position: 'absolute', right: 12, top: 14, opacity: 0.5 }} />
                </div>
                {searchQ && (
                    <div className={styles.channelList}>
                        {filteredQuickChannels.length > 0 ? filteredQuickChannels.map(c => (
                            <div key={c.id} className={styles.channelItem} onClick={() => addChannel(c)}>
                                <span>{c.title}</span>
                                <span style={{ opacity: 0.6, fontSize: '12px' }}>@{c.username}</span>
                            </div>
                        )) : <div style={{ padding: 10, opacity: 0.5, fontSize: 13 }}>No quick matches found</div>}
                    </div>
                )}
                <div className={styles.tagsContainer}>
                    {formData.channels.map(c => (
                        <div key={c.id} className={styles.tagChip} onClick={() => handleChange('channels', formData.channels.filter(x => x.id !== c.id))}>
                            {c.name} <span className={styles.remove}><FiX size={14} /></span>
                        </div>
                    ))}
                </div>
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>{t('ads.ageRange')} ({formData.ageRange[0]} - {formData.ageRange[1]})</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="number" className={styles.input} value={formData.ageRange[0]} min="13" max={formData.ageRange[1]} onChange={e => handleChange('ageRange', [parseInt(e.target.value), formData.ageRange[1]])} />
                    <span>to</span>
                    <input type="number" className={styles.input} value={formData.ageRange[1]} min={formData.ageRange[0]} max="100" onChange={e => handleChange('ageRange', [formData.ageRange[0], parseInt(e.target.value)])} />
                </div>
            </div>
        </div>
    );

    // Phase 4
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleChange('media', file);
            handleChange('mediaPreview', URL.createObjectURL(file));
        }
    };

    // Use TelegramPostRenderer instead of internal renderStyledText
    // const renderStyledText = ... (Removed)

    // Highlight Text Helper (Keep as fallback)
    const highlightText = (text) => {
        const parts = text.split(/(\s+)/);
        return (
            <div className={styles.previewText} style={{ marginTop: 8 }}>
                {parts.map((part, i) => {
                    if (part.trim() === '') return <span key={i}>{part}</span>;
                    const hasDot = part.includes('.');
                    const endsWithDot = part.endsWith('.');
                    const isLink = part.startsWith('http') || (hasDot && (!endsWithDot || part.slice(0, -1).includes('.')));
                    const shouldHighlight = part.startsWith('@') || part.startsWith('#') || isLink;
                    return <span key={i} className={shouldHighlight ? styles.highlight : ''}>{part}</span>;
                })}
            </div>
        );
    };

    const renderPhase4 = () => (
        <div className={styles.phaseContainer}>
            <div className={styles.formGroup}>
                <label className={styles.label}>Ad Creative Method</label>
                <div className={styles.postMethodToggle}>
                    <button
                        className={`${styles.toggleBtn} ${postMethod === 'new' ? styles.active : ''}`}
                        onClick={() => setPostMethod('new')}
                    >
                        <FiEdit /> New Post (via Bot)
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${postMethod === 'forward' ? styles.active : ''}`}
                        onClick={() => setPostMethod('forward')}
                    >
                        <FiShare2 /> Forward Post (via Link)
                    </button>
                </div>
            </div>

            {postMethod === 'forward' ? (
                <div className={styles.formGroup}>
                    <label className={styles.label}>Telegram Post Link</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div className={styles.inputWrapper} style={{ position: 'relative', flex: 1 }}>
                            <FiLink style={{ position: 'absolute', left: 12, top: 14, opacity: 0.5 }} />
                            <input
                                className={styles.input}
                                style={{ paddingLeft: 40 }}
                                placeholder="https://t.me/channel/123"
                                value={formData.link}
                                onChange={(e) => handleChange('link', e.target.value)}
                            />
                        </div>
                    </div>
                    {(formData.subject === 'channel' || formData.subject === 'bot') && formData.link && (
                        <TelegramFetcher link={formData.link} subject={formData.subject} onResolved={(data) => {
                            setFormData(prev => {
                                const newDat = { ...prev };
                                if (data.isPost) {
                                    newDat.title = newDat.title || `Ad for ${data.title}`;
                                    newDat.description = newDat.description || `Promoting post from ${data.title}`;
                                    newDat.postText = data.text || "";
                                    newDat.mediaPreview = data.photoUrl || null;
                                    newDat.entities = data.entities || [];
                                    newDat.views = data.views || "";
                                    newDat.channelPhotoUrl = data.channelPhotoUrl || null;
                                } else {
                                    newDat.title = newDat.title || data.title;
                                    newDat.mediaPreview = newDat.mediaPreview || data.photoUrl;
                                    newDat.description = newDat.description || data.description;
                                }
                                return newDat;
                            });
                        }} />
                    )}
                </div>
            ) : (
                <div className={styles.botDraftSection}>
                    {!formData.postText && !formData.mediaPreview ? (
                        <div className={styles.waitingForBot}>
                            <div className={styles.pulseIcon}><FiLayout /></div>
                            <h3>Waiting for your post...</h3>
                            <p>Open <strong>@CredantBot</strong> and send your ad post (Text + Image + Buttons).</p>
                            <a href="https://t.me/CredantBot" target="_blank" rel="noopener noreferrer" className={styles.botLinkBtn}>
                                Open Bot <FiExternalLink />
                            </a>
                        </div>
                    ) : (
                        <div className={styles.draftPreview}>
                            <div className={styles.draftHeader}>
                                <span>Captured from Bot</span>
                                <span>Captured from Bot</span>
                                <button onClick={() => setFormData(prev => ({ ...prev, postText: '', mediaPreview: null, link: '', buttonText: '', entities: [] }))} className={styles.clearDraftBtn}><FiX /> Clear</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Content Display */}
            {postMethod === 'forward' ? (
                <>
                    {/* Channel Preview Removed as requested */}

                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: 16,
                        overflow: 'hidden',
                        maxWidth: 400,
                        margin: '0 auto',
                        boxShadow: 'var(--card-shadow)',
                        fontFamily: 'Inter, sans-serif',
                        border: '1px solid var(--glass-border)'
                    }}>
                        {formData.mediaPreview && (
                            <div style={{ width: '100%', cursor: 'pointer' }} onClick={() => window.open(formData.link, '_blank')}>
                                <img src={formData.mediaPreview} alt="Post Media" style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />
                            </div>
                        )}

                        <div style={{ padding: '5px' }}>
                            <div style={{
                                color: 'var(--text-main)',
                                fontSize: 15,
                                display: 'block'
                            }}>
                                <TelegramPostRenderer text={formData.postText || ""} entities={formData.entities} style={{ color: 'var(--text-main)' }} />
                            </div>
                        </div>

                        <div style={{
                            padding: '0 16px 12px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 6,
                            opacity: 0.6,
                            fontSize: 12,
                            color: 'var(--text-muted)'
                        }}>
                            {formData.views && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <FiCheck size={14} style={{ display: 'none' }} />
                                    {formData.views} <span style={{ fontSize: 14 }}>👁</span>
                                </span>
                            )}
                            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </>
            ) : (
                (formData.postText || formData.mediaPreview || formData.media) && (
                    <>
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: 16,
                            overflow: 'hidden',
                            maxWidth: 400,
                            margin: '0 auto',
                            boxShadow: 'var(--card-shadow)',
                            fontFamily: 'Inter, sans-serif',
                            border: '1px solid var(--glass-border)'
                        }}>
                            {formData.mediaPreview && (
                                <div style={{ width: '100%' }}>
                                    <img src={formData.mediaPreview} alt="Post Media" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                </div>
                            )}

                            <div style={{ padding: '5px' }}>
                                <div style={{
                                    color: 'var(--text-main)',
                                    fontSize: 15,
                                    display: 'block'
                                }}>
                                    <TelegramPostRenderer text={formData.postText || ""} entities={formData.entities} style={{ color: 'var(--text-main)' }} />
                                </div>
                            </div>

                            <div style={{
                                padding: '0 16px 12px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                gap: 6,
                                opacity: 0.6,
                                fontSize: 12,
                                color: 'var(--text-muted)'
                            }}>
                                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>

                        {(postMethod === 'new' && (formData.link || formData.buttonText || !formData.hasDraftButton)) && (
                            <div className={styles.formGroup} style={{ marginTop: 24 }}>
                                <label className={styles.label}>{t('ads.buttonLink')} (Optional)</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        className={styles.input}
                                        placeholder="Button Text"
                                        value={formData.buttonText}
                                        onChange={e => handleChange('buttonText', e.target.value)}
                                        style={{ flex: 1, opacity: (postMethod === 'new' && formData.hasDraftButton) ? 0.7 : 1 }}
                                        readOnly={postMethod === 'new' && formData.hasDraftButton}
                                    />
                                    <input
                                        className={styles.input}
                                        placeholder="https://t.me/..."
                                        value={formData.link}
                                        onChange={e => handleChange('link', e.target.value)}
                                        style={{ flex: 2, opacity: (postMethod === 'new' && formData.hasDraftButton) ? 0.7 : 1 }}
                                        readOnly={postMethod === 'new' && formData.hasDraftButton}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )
            )}
        </div>
    );

    // Phase 5 Preview
    const renderPhase5 = () => (
        <div className={styles.phaseContainer}>
            <h3 style={{ marginBottom: 16 }}>{t('ads.preview')}</h3>
            <div className={styles.previewMeta}>
                <div className={styles.previewTitle}>{formData.title || 'Untitled Campaign'}</div>
                <div className={styles.previewDesc}>{formData.description || 'No description'}</div>
            </div>
            <div className={styles.previewCard}>
                <div style={{ position: 'relative' }}>
                    {formData.mediaPreview && <img src={formData.mediaPreview} className={styles.previewImage} alt="Ad Content" />}
                </div>
                <div className={styles.previewContent}>
                    <div className={styles.previewText} style={{ padding: 0 }}>
                        <TelegramPostRenderer text={formData.postText || 'No text content'} entities={formData.entities} style={{ color: 'var(--text-main)' }} />
                    </div>
                    {formData.link && <button className={styles.previewLinkBtn} onClick={() => window.open(formData.link, '_blank')}>{formData.buttonText || 'Open Link'}</button>}
                </div>
            </div>
            <div className={styles.reachCard} style={{ marginTop: 20 }}><span className={styles.reachLabel}>Estimated Reach</span><span className={styles.reachValue}>{estimatedReach.toLocaleString()}</span></div>
        </div>
    );

    // Phase 6 Payment
    const { post: apiPost } = useApi(); // Rename to avoid confusion
    const [balance, setBalance] = useState(0);
    const [isDepositModalOpen, setDepositModalOpen] = useState(false);

    useEffect(() => {
        if (phase === 6 && userProfile?.wallet?.address) {
            // simplified loose fetch since useApi is memoized and we just need simple get
            fetch(`${backendUrl}/wallet/balance/${userProfile.wallet.address}`).then(r => r.json()).then(d => setBalance(parseFloat(d.ton || 0))).catch(console.error);
        }
    }, [phase, userProfile, backendUrl]);

    const handlePayAndCreate = async () => {
        setLoading(true);
        try {
            let mediaUrl = formData.mediaPreview;
            if (formData.media) {
                const uploadData = new FormData();
                uploadData.append('file', formData.media);
                const uploadRes = await fetch(`${backendUrl}/upload`, { method: 'POST', body: uploadData });
                if (!uploadRes.ok) throw new Error(await uploadRes.text());
                mediaUrl = (await uploadRes.json()).url;
            } else if (mediaUrl && mediaUrl.startsWith('http')) {
                // If mediaUrl is a remote URL (scraped), pass it directly.
                // Backend 'create-contract' should accept it.
            }

            const payloadData = {
                ...formData,
                budget: parseFloat(formData.budget),
                duration: parseInt(formData.duration),
                mediaPreview: mediaUrl,
                walletAddress: userProfile?.wallet?.address,
                postMethod: postMethod // Save postMethod ('new' or 'forward')
            };
            const result = await apiPost('/ads/create-contract', payloadData);
            if (!result || !result.success) throw new Error(result?.error || 'Failed');

            addNotification('success', t('ads.campaignCreated'));
            setTimeout(() => { onNavigate('feed'); setFormData({}); setPhase(1); }, 1500);

        } catch (error) {
            console.error('Payment Error:', error);
            addNotification('error', 'Failed: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleMainAction = () => {
        if (phase < 6) { handleNext(); return; }
        const totalTopay = (formData.budget * formData.duration * 1.05);
        if (balance < totalTopay) { setDepositModalOpen(true); } else { handlePayAndCreate(); }
    };

    const renderPhase6 = () => {
        const totalTopay = (formData.budget * formData.duration * 1.05);
        const hasBalance = balance >= totalTopay;
        return (
            <div className={styles.phaseContainer}>
                <h3 style={{ marginBottom: 16 }}>{t('ads.confirmPayment')}</h3>
                <div className={styles.paymentSummary}>
                    <div className={styles.summaryRow}><span>Budget / Day</span><span>{formData.budget} TON</span></div>
                    <div className={styles.summaryRow}><span>Duration</span><span>{formData.duration} Days</span></div>
                    <div className={styles.summaryRow}><span>Platform Fee (5%)</span><span>{(formData.budget * formData.duration * 0.05).toFixed(2)} TON</span></div>
                    <div className={`${styles.summaryRow} ${styles.total}`}><span>Total Cost</span><span>{totalTopay.toFixed(2)} TON</span></div>
                </div>
                <div className={styles.walletBalance} style={{ justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Account Balance</div><b>{balance.toFixed(2)} TON</b>
                </div>
                {!hasBalance && <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>Insufficient Balance. Please deposit funds.</div>}
            </div>
        );
    };

    // Main Render
    return (
        <div className={styles.page} style={{ transform: isVisible ? 'translateY(0)' : 'translateY(100%)' }}>
            {/* Header Removed */}

            <div className={styles.content}>
                <AnimatePresence mode='wait' custom={direction}>
                    <motion.div
                        key={phase}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, type: 'tween' }}
                    >
                        {phase === 1 && renderPhase1()}
                        {phase === 2 && renderPhase2()}
                        {phase === 3 && renderPhase3()}
                        {phase === 4 && renderPhase4()}
                        {phase === 5 && renderPhase5()}
                        {phase === 6 && renderPhase6()}

                        {/* Footer Navigation */}
                        <div className={styles.actionBtnContainer}>
                            <button className={`${styles.button} ${styles.backBtn}`} onClick={handleBack}>
                                <FiChevronLeft size={24} />
                            </button>
                            <button
                                className={`${styles.button} ${styles.primaryBtn}`}
                                onClick={handleMainAction}
                                disabled={loading}
                                style={{ opacity: loading ? 0.7 : 1 }}
                            >
                                {loading ? 'Processing...' : (phase === 6 ? 'Pay & Launch' : t('ads.continue'))}
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {userProfile?.wallet && (
                <WalletActionModal
                    type="deposit"
                    isOpen={isDepositModalOpen}
                    onClose={() => setDepositModalOpen(false)}
                    walletAddress={userProfile.wallet.address}
                    balance={userProfile.wallet.balance}
                    onSuccess={() => { setDepositModalOpen(false); refreshProfile(); }}
                />
            )}
        </div>
    );
};

export default PostAds;
