import React, { useState, useEffect, useRef } from 'react';
import styles from './ShareThought.module.css';
import { useTranslation } from 'react-i18next';
import { FiX, FiImage, FiSmile } from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';

const ShareThought = ({ activePage }) => {
    const { t } = useTranslation();
    const { addNotification } = useNotification();
    const { post, get } = useApi();
    const { user } = useAuth();
    const isVisible = activePage === 'shareThought';
    const [thought, setThought] = useState('');

    const [modalMode, setModalMode] = useState(null); // 'mention' | 'slash' | null
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const textareaRef = useRef(null);
    const highlighterRef = useRef(null);

    const style = {
        transform: isVisible ? 'translateY(0)' : 'translateY(100vh)',
    };

    // --- Search Logic ---
    const performSearch = async () => {
        // Only search if query exists for mentions, or always for slash (to show defaults)
        if (modalMode === 'mention' && !searchQuery) return;

        setSearching(true);
        try {
            if (modalMode === 'mention') {
                console.log("Searching users/channels/bots:", searchQuery);

                // 1. Local Search (fast)
                const localResPromise = get(`/search?q=${encodeURIComponent(searchQuery)}&type=all`);

                // 2. External Telegram Search (slower, but comprehensive)
                // We attempt to resolve as a link/username using the Ads endpoint logic
                const externalResPromise = post('/ads/resolve-link', { link: `@${searchQuery}` })
                    .catch(e => null); // Ignore errors from external resolve (404s)

                const [localRes, externalItem] = await Promise.all([localResPromise, externalResPromise]);

                const results = localRes.results || [];

                // 3. Merge External Result if safe
                if (externalItem && externalItem.username) {
                    // Check if already in local results to avoid duplicates
                    const exists = results.find(r =>
                        (r.username && r.username.toLowerCase() === externalItem.username.toLowerCase()) ||
                        (r.id === externalItem.id && externalItem.id) // ID check if available
                    );

                    if (!exists) {
                        results.unshift({
                            id: externalItem.id || `ext_${externalItem.username}`,
                            title: externalItem.title,
                            username: externalItem.username,
                            photoUrl: externalItem.photoUrl,
                            typeDisplay: 'Bot/Channel', // Temporary label, refined below
                            type: externalItem.type // 'private', 'group', 'channel', 'bot_or_user'
                        });
                    }
                }

                // Process results for badging
                const processed = results.map(item => {
                    let typeDisplay = 'User';

                    // Logic to determine type
                    // External resolve gives 'channel', 'supergroup', 'bot_or_user'
                    // Local gives 'channel' or 'user'

                    if (item.type === 'channel' || item.type === 'supergroup') {
                        typeDisplay = 'Channel';
                    } else if (
                        (item.username && item.username.toLowerCase().includes('bot')) ||
                        item.type === 'bot'
                    ) {
                        typeDisplay = 'Bot';
                    } else if (item.type === 'user') {
                        typeDisplay = 'User';
                    }

                    return { ...item, typeDisplay };
                });

                setSearchResults(processed);

            } else if (modalMode === 'slash') {
                console.log("Fetching ads/deals");
                const [adsRes, dealsRes] = await Promise.all([
                    get('/ads').catch(e => { console.error("Ads fetch failed", e); return { ads: [] }; }),
                    get('/deals').catch(e => { console.error("Deals fetch failed", e); return { deals: [] }; })
                ]);

                const items = [
                    ...(adsRes.ads || []).map(a => ({ id: a.id, type: 'ad', typeDisplay: 'Ad', title: a.title, username: '' })),
                    ...(dealsRes.deals || []).map(d => ({ id: d.id, type: 'deal', typeDisplay: 'Deal', title: d.title, username: '' }))
                ];

                const filtered = searchQuery
                    ? items.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    : items;
                setSearchResults(filtered);
            }
        } catch (e) {
            console.error("Search failed", e);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    // Auto-search for slash commands (local mostly) and debounced search for mentions
    useEffect(() => {
        if (modalMode === 'slash') {
            performSearch();
        } else if (modalMode === 'mention') {
            const timer = setTimeout(() => {
                if (searchQuery.length >= 2) performSearch();
            }, 600); // 600ms debounce
            return () => clearTimeout(timer);
        }
    }, [modalMode, searchQuery]);

    // --- Input Handling ---
    const handleInputChange = (e) => {
        const val = e.target.value;
        setThought(val);

        // Sync scroll
        if (highlighterRef.current) {
            highlighterRef.current.scrollTop = e.target.scrollTop;
        }

        // Logic to detect triggers
        // We check the LAST character or the content of the current "word" being likely a trigger

        // Simple 1: Detect explicit Trigger Chars at end
        if (val.endsWith('@') && !modalMode) {
            setModalMode('mention');
            setSearchQuery('');
        } else if (val.endsWith('/') && !modalMode) {
            setModalMode('slash');
            setSearchQuery('');
        }

        // Logic 2: If we are IN a mode, update the query
        if (modalMode) {
            const triggerChar = modalMode === 'mention' ? '@' : '/';
            const lastTriggerIndex = val.lastIndexOf(triggerChar);

            // If trigger lost (deleted)
            if (lastTriggerIndex === -1) {
                setModalMode(null);
                setSearchQuery('');
            } else {
                // Check if the cursor is actually near this trigger? 
                // For MVP, we assume the last trigger is the active one.
                // Also ensure no spaces (unless we allow spaces in names, but usually mentions stop at space)
                const textAfter = val.slice(lastTriggerIndex + 1);

                // Abuse of mentions usually stops at space
                if (textAfter.includes(' ') && modalMode === 'mention') {
                    setModalMode(null);
                    setSearchQuery('');
                } else {
                    setSearchQuery(textAfter);
                }
            }
        }
    };

    const handleSelect = (item) => {
        let replacement = '';
        if (modalMode === 'mention') {
            // Use username if available, else sanitized title
            const tag = item.username || item.title.replace(/\s+/g, '');
            replacement = `@${tag} `;
        } else if (modalMode === 'slash') {
            replacement = `/${item.title.replace(/\s+/g, '_')} `;
        }

        const triggerChar = modalMode === 'mention' ? '@' : '/';
        const lastIndex = thought.lastIndexOf(triggerChar);
        if (lastIndex > -1) {
            const newVal = thought.substring(0, lastIndex) + replacement;
            setThought(newVal);
        }

        setModalMode(null);
        setSearchQuery('');
        textareaRef.current?.focus();
    };

    const handleSubmit = async () => {
        if (!thought.trim()) return;
        try {
            await post('/feed', { content: thought });
            addNotification('success', t('profile.thoughtShared'));
            setThought('');
            window.history.back();
        } catch (e) {
            addNotification('error', 'Failed to share thought');
        }
    };

    // --- Rendering Highlighted Text ---
    const renderHighlights = (text) => {
        // Splits by:
        // 1. Mentions/Hashtags/Slash commands: (#|@|/)\w+
        // 2. URLs: http...
        // 3. Domains: something.com
        const splitRegex = /((?:#|@|\/)\w+|https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g;
        const parts = text.split(splitRegex);

        return parts.map((part, i) => {
            if (
                part.match(/^(?:#|@|\/)\w+/) ||
                part.startsWith('http') ||
                (part.includes('.') && part.length > 2 && !part.startsWith(' ') && !part.endsWith(' '))
            ) {
                return <span key={i} className={styles.highlight}>{part}</span>;
            }
            return part;
        });
    };

    // Close on outside click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            setModalMode(null);
        }
    };

    return (
        <div className={styles.page} style={style}>
            {/* Header */}
            <div className={styles.header}>
                <button onClick={() => window.history.back()} className={styles.closeButton}>
                    <FiX size={20} />
                </button>
                <div style={{ fontWeight: 'bold' }}>New Thought</div>
                <button className={styles.submitButtonHeader} onClick={handleSubmit}>
                    Post
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.editorContainer}>
                    {/* Highlighter Layer */}
                    <div
                        ref={highlighterRef}
                        className={styles.highlighter}
                        aria-hidden="true"
                    >
                        {renderHighlights(thought)}
                        <br />
                    </div>

                    {/* Input Layer */}
                    <textarea
                        ref={textareaRef}
                        className={styles.textarea}
                        placeholder={t('profile.thoughtPlaceholder', "What's happening? \n#hashtag @mention /ad")}
                        value={thought}
                        onChange={handleInputChange}
                        onScroll={(e) => highlighterRef.current.scrollTop = e.target.scrollTop}
                        autoFocus={isVisible}
                    />
                </div>

                {/* Media Bar */}
                <div className={styles.mediaBar}>
                    <FiImage size={24} color="#3b82f6" style={{ cursor: 'pointer' }} />
                    <FiSmile size={24} color="#eab308" style={{ cursor: 'pointer' }} />
                </div>
            </div>

            {/* Selection Modal (Overlay) */}
            {modalMode && (
                <div className={styles.searchModalOverlay} onClick={handleOverlayClick}>
                    <div className={styles.searchModal}>
                        <div className={styles.searchHeader}>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>
                                {modalMode === 'mention' ? 'Mention User' : 'Select Ad/Deal'}
                            </h3>
                            <button onClick={() => setModalMode(null)} className={styles.closeButton}>
                                <FiX size={20} />
                            </button>
                        </div>

                        {modalMode === 'mention' && (
                            <div className={styles.searchInputContainer}>
                                <input
                                    className={styles.searchInput}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                                />
                                <button className={styles.checkButton} onClick={performSearch}>
                                    Check
                                </button>
                            </div>
                        )}

                        <div className={styles.searchResults}>
                            {searching ? <div style={{ padding: 20 }}>Loading...</div> : (
                                searchResults.map(item => (
                                    <div
                                        key={item.id}
                                        className={styles.resultItem}
                                        onClick={() => handleSelect(item)}
                                    >
                                        {modalMode === 'mention' && (
                                            <img
                                                src={item.photoUrl || "https://i.pravatar.cc/150?u=" + item.id}
                                                className={styles.resultAvatar}
                                                onError={(e) => e.target.src = "https://i.pravatar.cc/150?u=def"}
                                            />
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {item.title || item.name}
                                                {item.typeDisplay && (
                                                    <span className={styles.badge} data-type={item.typeDisplay}>
                                                        {item.typeDisplay}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#aaa' }}>
                                                {item.username ? `@${item.username}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            {!searching && searchResults.length === 0 && (
                                <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                                    {searchQuery ? 'No results found' : 'Start typing to search...'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShareThought;
