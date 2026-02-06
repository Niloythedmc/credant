import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { useAuth } from '../auth/AuthProvider';
import { useApi } from '../auth/useApi';
import { useNotification } from '../context/NotificationContext';
import { FiArrowDownLeft, FiArrowUpRight } from 'react-icons/fi';
import styles from './Profile.module.css';
import WalletActionModal from '../components/WalletActionModal';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import Modal from '../components/Modal';
import AnimatedIcon from '../components/Notification/AnimatedIcon';
import { useTranslation } from 'react-i18next';

const Profile = ({ activePage, onNavigate }) => {
    const { t } = useTranslation();
    const index = 4;
    const { user, tgUser, userProfile, refreshProfile } = useAuth();
    const { post, get, del } = useApi();
    const { addNotification } = useNotification();
    const [tonConnectUI] = useTonConnectUI();
    const userFriendlyAddress = useTonAddress();

    const [wallet, setWallet] = useState(null); // Internal wallet address
    const [rawBalance, setRawBalance] = useState(0); // Store numeric balance

    // Modal State
    const [modalType, setModalType] = useState(null); // 'deposit' | 'withdraw' | null
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);

    // Helper: Floor amount to N decimals, optionally subtract reserve
    const formatBalance = (amount, decimals = 1, subtractReserve = false) => {
        let val = parseFloat(amount || 0);
        if (subtractReserve) val = Math.max(0, val - 0.1); // Reserve 0.1 TON
        if (isNaN(val)) return "0.0";

        const factor = Math.pow(10, decimals);
        return (Math.floor(val * factor) / factor).toFixed(decimals);
    };

    // Derived Display Balance (1 decimal, minus reserve)
    const displayBalance = formatBalance(rawBalance, 1, true);

    useEffect(() => {
        const fetchWallet = async () => {
            if (userProfile?.wallet?.address) {
                setWallet(userProfile.wallet.address);
                try {
                    const balRes = await get(`/wallet/balance/${userProfile.wallet.address}`);
                    setRawBalance(parseFloat(balRes.ton));
                } catch (e) {
                    console.error("Failed to fetch balance", e);
                }
            }
        };
        fetchWallet();
    }, [userProfile]);

    const toggleRefresh = async () => {
        // Immediate refresh
        await refreshProfile();
        fetchAds(); // Fetch full ads details

        const fetchBal = async () => {
            if (userProfile?.wallet?.address) {
                try {
                    const balRes = await get(`/wallet/balance/${userProfile.wallet.address}`);
                    setRawBalance(parseFloat(balRes.ton));
                } catch (e) { }
            }
        };

        await fetchBal();

        // POLL polling for 30 seconds (every 3s)
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            await fetchBal();
            if (attempts >= 10) clearInterval(interval);
        }, 3000);
    };

    // Fetch Ads Data Directly from Collection (for full details)
    const [fullAds, setFullAds] = useState([]);
    const fetchAds = async () => {
        try {
            const res = await get('/ads/my-ads');
            if (Array.isArray(res)) {
                setFullAds(res);
            }
        } catch (e) {
            console.error("Failed to fetch ads", e);
        }
    };

    useEffect(() => {
        fetchAds();
    }, [user]);

    // Derived Display Data
    const tgFullName = tgUser ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : null;
    const displayName = tgFullName || user?.displayName || user?.uid?.substring(0, 8) || "Anonymous";
    const displayHandle = tgUser?.username ? `@${tgUser.username}` : (user?.reloadUserInfo?.screenName ? `@${user.reloadUserInfo.screenName}` : "@user");
    const profileImage = tgUser?.photo_url || user?.photoURL || "https://i.pravatar.cc/150?u=99";

    const handleConnectClick = () => {
        if (userFriendlyAddress) {
            setShowDisconnectModal(true);
        } else {
            tonConnectUI.openModal();
        }
    };

    const handleDisconnect = async () => {
        await tonConnectUI.disconnect();
        setShowDisconnectModal(false);
    };

    const [selectedChannel, setSelectedChannel] = useState(null);
    const [isEditingPrice, setIsEditingPrice] = useState(false);
    const [newPrice, setNewPrice] = useState('');

    useEffect(() => {
        if (selectedChannel) {
            setNewPrice(selectedChannel.startPrice || '');
            setIsEditingPrice(false);
        }
    }, [selectedChannel]);

    // Helper: Calculate Time Stats
    const getChannelStats = (startedAt) => {
        if (!startedAt) return { timeLeft: null, elapsed: null, isReady: false };

        const now = Date.now();
        const start = typeof startedAt === 'number' ? startedAt : new Date(startedAt).getTime();
        const diff = now - start;
        const totalDuration = 24 * 60 * 60 * 1000; // 24 hours
        const left = totalDuration - diff;

        const isReady = left <= 0;

        // Format Elapsed
        const hoursElapsed = Math.floor(diff / (1000 * 60 * 60));
        const elapsedText = hoursElapsed > 0 ? `${hoursElapsed}h ago` : 'Just now';

        // Format Left
        let leftText = '';
        if (isReady) {
            leftText = 'Ready';
        } else {
            const h = Math.floor(left / (1000 * 60 * 60));
            const m = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
            leftText = `${h}h ${m}m left`;
        }

        return { timeLeft: leftText, elapsed: elapsedText, isReady };
    };

    // Content Section Component
    const ContentSection = ({ title, items, emptyText, actionText, styles, onAction, hasPriceIcon, isClientOffer, onAdd, type }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const hasItems = items && items.length > 0;

        // Show all if expanded, otherwise max 3
        const displayItems = isExpanded ? items : (hasItems ? items.slice(0, 3) : []);

        return (
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle} style={{ color: 'var(--text-main)' }}>
                        {title}
                        {hasItems && hasPriceIcon && <span className={styles.priceIcon}>💲</span>}
                    </div>
                    {/* Add Icon for Channels */}
                    {hasItems && onAdd && (
                        <div onClick={onAdd} style={{
                            cursor: 'pointer',
                            padding: '4px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </div>
                    )}
                </div>

                {hasItems ? (
                    <div className={styles.sectionList}>
                        {displayItems.map((item, i) => {

                            // --- AD ITEMS RENDER LOGIC ---
                            if (type === 'ads') {
                                // Dynamic Calculations
                                const now = Date.now();

                                // Parse createdAt (Firestore Timestamp handling)
                                let createdAtMs = now;
                                if (item.createdAt) {
                                    createdAtMs = typeof item.createdAt === 'number'
                                        ? item.createdAt
                                        : (item.createdAt.toMillis ? item.createdAt.toMillis() : new Date(item.createdAt).getTime());
                                }

                                const durationDays = parseInt(item.duration) || 0;
                                const durationMs = durationDays * 24 * 60 * 60 * 1000;
                                const expiryMs = createdAtMs + durationMs;

                                const msLeft = Math.max(0, expiryMs - now);
                                const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

                                // Progress %
                                const elapsedMs = now - createdAtMs;
                                let progressPercent = 0;
                                if (durationMs > 0) {
                                    progressPercent = Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));
                                }

                                const budgetTon = parseFloat(item.budget) || 0;
                                const estUsd = (budgetTon * 5.5).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); // Mock Rate 1 TON = $5.5

                                // Subject Badge Logic
                                let SubjectIcon = FiArrowUpRight; // Default
                                let subjectLabel = item.subject || 'CAMPAIGN';
                                let badgeColor = '#60a5fa'; // Blue

                                if (subjectLabel.toUpperCase() === 'WEBSITE') { SubjectIcon = () => <span>🌐</span>; badgeColor = '#60a5fa'; }
                                if (subjectLabel.toUpperCase().includes('BOT')) { SubjectIcon = () => <span>🤖</span>; badgeColor = '#a78bfa'; } // Purple
                                if (subjectLabel.toUpperCase().includes('CHANNEL')) { SubjectIcon = () => <span>📢</span>; badgeColor = '#34d399'; } // Green

                                const statusColor = item.status === 'active' ? '#4ade80' : (item.status === 'completed' ? '#f87171' : '#fbbf24');
                                const statusLabel = item.status === 'active' ? 'LIVE' : (item.status === 'completed' ? 'COMPLETED' : 'PENDING');

                                return (
                                    <div key={i} className={styles.itemCard}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '16px',
                                            padding: '16px',
                                            marginBottom: '12px',
                                            cursor: 'default'
                                        }}
                                    >
                                        {/* Header: Icon, Title, Status */}
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                            {/* Icon Box */}
                                            <div style={{
                                                width: '40px', height: '40px',
                                                borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '20px'
                                            }}>
                                                <SubjectIcon />
                                            </div>

                                            {/* Title & Badge */}
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ margin: '0 0 4px 0', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>{item.title}</h4>
                                                <span style={{
                                                    fontSize: '10px',
                                                    background: badgeColor,
                                                    color: '#fff',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {subjectLabel}
                                                </span>
                                            </div>

                                            {/* Status Badge */}
                                            <div style={{
                                                fontSize: '11px',
                                                background: statusColor,
                                                color: '#000',
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                height: 'fit-content',
                                                fontWeight: 'bold'
                                            }}>
                                                {statusLabel}
                                            </div>
                                        </div>

                                        {/* Details Matrix */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ccc' }}>
                                                <span>Budget: <span style={{ color: 'white' }}>{budgetTon} TON</span> <span style={{ color: '#888' }}>(${estUsd} USD)</span></span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ccc' }}>
                                                <span>Duration: <span style={{ color: 'white' }}>{durationDays} Days</span> <span style={{ color: '#888' }}>({daysLeft} days left)</span></span>
                                                <span style={{ fontWeight: 'bold' }}>{Math.round(progressPercent)}%</span>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
                                            <div style={{ width: `${progressPercent}%`, height: '100%', background: badgeColor, transition: 'width 0.5s' }}></div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button style={{
                                                flex: 1, padding: '8px', borderRadius: '12px', border: 'none',
                                                background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', cursor: 'pointer'
                                            }}>
                                                View Stats
                                            </button>
                                            <button style={{
                                                flex: 1, padding: '8px', borderRadius: '12px', border: 'none',
                                                background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', cursor: 'pointer'
                                            }}>
                                                Edit Campaign
                                            </button>
                                            <button style={{
                                                flex: 1, padding: '8px', borderRadius: '12px', border: 'none',
                                                background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', cursor: 'pointer'
                                            }}>
                                                View Results
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            // --- CHANNEL/DEFAULT RENDER LOGIC ---
                            const stats = item.startedAt ? getChannelStats(item.startedAt) : null;
                            return (
                                <div key={i} className={styles.itemCard}
                                    style={{ background: 'rgba(128,128,128,0.1)', cursor: onAdd ? 'pointer' : 'default' }}
                                    onClick={() => onAdd && setSelectedChannel(item)}
                                >
                                    {item.image && (
                                        <img src={item.image} alt="" className={styles.itemImage} onError={(e) => e.target.style.display = 'none'} />
                                    )}
                                    <div>
                                        <div className={styles.itemTitle} style={{ color: 'var(--text-main)' }}>{item.title}</div>
                                        {item.username ? `@${item.username}` : (item.sub ? item.sub : "Private")} • {item.subscribers ? `${item.subscribers} subs` : (item.memberCount ? `${item.memberCount} mem` : '')}
                                    </div>
                                    {stats && stats.timeLeft && (
                                        <div style={{ fontSize: '11px', color: stats.isReady ? '#4ade80' : 'var(--primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                            {stats.isReady ? "Ready to Calculate" : stats.timeLeft}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {items.length > 3 && (
                            <button
                                className={styles.moreButton}
                                style={{ color: 'var(--primary)' }}
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                {isExpanded ? 'Show Less' : `${t('common.more')} (${items.length - 3})`}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyText} style={{ color: 'var(--text-muted)' }}>{emptyText}</p>
                        {!isClientOffer && actionText && (
                            <button className={styles.createButton} onClick={onAction}>
                                {actionText}
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <PageContainer id="profile" activePage={activePage} index={index}>
            <div className={styles.page} style={{ background: 'var(--bg-dark)', transition: 'background 0.3s' }}>

                {/* Header Actions Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
                    {/* Inbox (Bell) */}
                    <div onClick={() => onNavigate && onNavigate('inbox')} style={{ cursor: 'pointer' }}>
                        <AnimatedIcon emojiId="5458603043203327669" size={28} />
                    </div>
                    {/* Settings (Gear) */}
                    <div onClick={() => onNavigate && onNavigate('setting')} style={{ cursor: 'pointer' }}>
                        <AnimatedIcon emojiId="5341715473882955310" size={28} />
                    </div>
                </div>

                {/* Header Identity */}
                <div className={styles.identitySection}>
                    <div className={styles.avatarWrapper}>
                        <img src={profileImage} alt="Profile" className={styles.avatar} />
                        <div className={styles.editBadge} style={{ background: 'var(--primary)' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <h2 className={styles.displayName} style={{ color: 'var(--text-main)' }}>{displayName}</h2>

                    {/* Wallet Section Merged into Header */}
                    <div className={styles.headerWallet}>
                        <div className={styles.balanceRowHeader}>
                            <span className={styles.balanceAmountHeader} style={{ color: 'var(--text-main)' }}>{displayBalance}</span>
                            <span className={styles.balanceUnitHeader} style={{ color: 'var(--text-muted)' }}>TON</span>
                        </div>

                        {/* Debug Info for Mobile Auth Issue */}
                        {!wallet && (
                            <div style={{ padding: '10px', background: '#333', borderRadius: '8px', marginTop: '10px', fontSize: '10px', color: '#fff', wordBreak: 'break-all' }}>
                                <p>DEBUG INFO:</p>
                                <p>TG Available: {window.Telegram ? "Yes" : "No"}</p>
                                <p>User: {user ? "Logged In" : "Null"}</p>
                                <p>Profile: {userProfile ? "Loaded" : "Null"}</p>
                                {userProfile && <p>Data: {JSON.stringify(userProfile).slice(0, 100)}</p>}
                                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                    <button onClick={() => window.location.reload()} style={{ padding: '4px' }}>Reload</button>
                                    <button onClick={() => refreshProfile()} style={{ padding: '4px' }}>Force Sync</button>
                                </div>
                            </div>
                        )}

                        {/* Wallet Display Address: Priority to Backend stored address */
                            /* User request: "userData.wallet address not conencted wallet address" */
                        }
                        {(() => {
                            const displayAddr = userFriendlyAddress;

                            return (
                                <div className={styles.addressContainer} onClick={handleConnectClick} style={{ cursor: 'pointer', background: 'rgba(128,128,128,0.1)' }}>
                                    {displayAddr ? (
                                        <>
                                            <span className={styles.addressTextHeader} style={{ color: 'var(--text-muted)' }}>
                                                {displayAddr.slice(0, 4) + '...' + displayAddr.slice(-4)}
                                            </span>
                                            {/* Disconnect Icon */}
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                                <line x1="12" y1="2" x2="12" y2="12"></line>
                                            </svg>
                                        </>
                                    ) : (
                                        <span className={styles.addressTextHeader} style={{ color: 'var(--primary)' }}>{t('common.connectWallet')}</span>
                                    )}
                                </div>
                            );
                        })()}

                        <div className={styles.walletActionsHeader}>
                            <button className={styles.actionIconButton} onClick={() => setModalType('deposit')}>
                                <div className={styles.iconCircle} style={{ background: 'var(--badge-blue-bg)', color: 'var(--primary)' }}>
                                    <FiArrowDownLeft />
                                </div>
                                <span className={styles.actionLabel} style={{ color: 'var(--text-muted)' }}>{t('profile.deposit')}</span>
                            </button>
                            <button className={styles.actionIconButton} onClick={() => setModalType('withdraw')}>
                                <div className={styles.iconCircle} style={{ background: 'var(--badge-blue-bg)', color: 'var(--primary)' }}>
                                    <FiArrowUpRight />
                                </div>
                                <span className={styles.actionLabel} style={{ color: 'var(--text-muted)' }}>{t('profile.withdraw')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Sections */}
                <ContentSection
                    title={t('profile.thoughts')}
                    items={userProfile?.thoughts || []}
                    emptyText={t('profile.noThoughts')}
                    actionText={t('profile.shareThoughts')}
                    styles={styles}
                    onAction={() => onNavigate('shareThought')}
                />

                <ContentSection
                    title={t('profile.channels')}
                    items={userProfile?.channels || []}
                    emptyText={t('profile.noChannels')}
                    actionText={t('profile.listChannel')}
                    styles={styles}
                    onAction={() => onNavigate('listChannel')}
                    onAdd={() => onNavigate('listChannel')}
                    hasPriceIcon={true}
                />

                <ContentSection
                    title={t('profile.ads')}
                    items={fullAds.length > 0 ? fullAds : (userProfile?.ads || [])}
                    emptyText={t('profile.noAds')}
                    actionText={t('profile.postAds')}
                    styles={styles}
                    onAction={() => onNavigate('postAds')}
                    hasPriceIcon={true}
                    type="ads"
                />

                <ContentSection
                    title={t('profile.offers')}
                    items={userProfile?.offers || []}
                    emptyText={t('profile.noOffers')}
                    actionText=""
                    styles={styles}
                    onAction={() => { }}
                    isClientOffer={true}
                />

            </div>

            {/* Modals */}
            <WalletActionModal
                type={modalType || 'deposit'}
                isOpen={!!modalType}
                onClose={() => setModalType(null)}
                walletAddress={wallet}
                balance={rawBalance} // Pass RAW balance
                onSuccess={toggleRefresh} // Trigger refresh on success
            />

            {/* Disconnect Confirmation Modal */}
            <Modal
                isOpen={showDisconnectModal}
                onClose={() => setShowDisconnectModal(false)}
                title={t('common.disconnect')}
            >
                <div>
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '20px' }}>
                        Are you sure you want to disconnect your wallet?
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setShowDisconnectModal(false)}
                            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'rgba(128,128,128,0.1)', color: 'var(--text-main)' }}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleDisconnect}
                            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#e53935', color: 'white', fontWeight: 'bold' }}
                        >
                            {t('common.disconnect')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Channel Details Modal */}
            <Modal
                isOpen={!!selectedChannel}
                onClose={() => setSelectedChannel(null)}
                title={t('profile.channelStatus')}
            >
                {selectedChannel && (() => {
                    const stats = getChannelStats(selectedChannel.startedAt);
                    const isCalculated = selectedChannel.purityScore !== null && selectedChannel.purityScore !== undefined;

                    const handleCalculate = async () => {
                        try {
                            const res = await post('/channels/calculate-purity', {
                                channelId: selectedChannel.channelId || selectedChannel.id,
                                userId: user.uid || user.id
                            });
                            if (res.success) {
                                addNotification('success', `Score Calculated: ${res.purityScore}%`);
                                toggleRefresh();
                                setSelectedChannel(null);
                            }
                        } catch (e) {
                            console.error(e);
                            addNotification('error', e.response?.data?.error || 'Calculation failed');
                        }
                    };

                    const handleStartVerification = () => {
                        sessionStorage.setItem('pendingChannel', JSON.stringify(selectedChannel));
                        addNotification('info', 'Redirecting to verification...');
                        setSelectedChannel(null); // Close modal
                        onNavigate('listChannel');
                    };

                    const handleDelete = async () => {
                        if (!confirm(t('common.confirmDelete'))) return;
                        try {
                            await del(`/channels/${selectedChannel.channelId || selectedChannel.id}`, { userId: user.uid || user.id });
                            addNotification('success', t('common.success'));
                            toggleRefresh();
                            setSelectedChannel(null);
                        } catch (e) {
                            addNotification('error', t('common.error'));
                        }
                    };


                    const handleUpdatePrice = async () => {
                        if (!newPrice || parseFloat(newPrice) < 0) return;
                        try {
                            await post('/channels/update-price', {
                                channelId: selectedChannel.id || selectedChannel.channelId, // Check ID field mapping
                                userId: user.uid || user.id,
                                price: newPrice
                            });
                            addNotification('success', 'Price Updated!');
                            setIsEditingPrice(false);
                            // Optimistic Update
                            setSelectedChannel(prev => ({ ...prev, startPrice: newPrice }));
                            toggleRefresh(); // Refresh list
                        } catch (error) {
                            console.error(error);
                            addNotification('error', 'Update Failed');
                        }
                    };

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Header Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <img
                                    src={selectedChannel.image || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                                    style={{ width: '60px', height: '60px', borderRadius: '50%' }}
                                />
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{selectedChannel.title}</h3>
                                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                                        {selectedChannel.username ? `@${selectedChannel.username}` : "Private Channel"}
                                    </p>
                                </div>
                            </div>

                            {/* Bio */}
                            {selectedChannel.description && (
                                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', border: '1px solid var(--glass-border)' }}>
                                    {selectedChannel.description}
                                </div>
                            )}

                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('channels.subs')}</div>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>{selectedChannel.subscribers || selectedChannel.memberCount || 0}</div>
                                </div>
                                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('profile.activityScore')}</div>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>{selectedChannel.activityScore || 0}</div>
                                </div>
                                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('profile.timeStatus')}</div>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: stats.timeLeft ? (stats.isReady ? '#4ade80' : 'var(--primary)') : '#EF4444' }}>
                                        {stats.timeLeft || 'Not Started'}
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: isCalculated ? '#4ade80' : 'var(--text-main)' }}>
                                        {isCalculated ? `${selectedChannel.purityScore}%` : 'Pending'}
                                    </div>
                                </div>
                            </div>

                            {/* Start Price Section */}
                            <div style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                padding: '16px',
                                borderRadius: '16px',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                marginTop: '8px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', color: '#93c5fd' }}>{t('profile.startPrice')}</span>
                                    <button
                                        onClick={() => setIsEditingPrice(!isEditingPrice)}
                                        style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        {isEditingPrice ? t('common.cancel') : t('common.edit')}
                                    </button>
                                </div>

                                {isEditingPrice ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="number"
                                            placeholder={t('ads.amount')}
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: '1px solid #3b82f6',
                                                background: 'var(--bg-dark)',
                                                color: 'var(--text-main)'
                                            }}
                                        />
                                        <button
                                            onClick={handleUpdatePrice}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                background: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {t('common.update')}
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#60a5fa', textAlign: 'center' }}>
                                        ${selectedChannel.startPrice || 0}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            {!isCalculated && (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.5' }}>
                                    {stats.timeLeft
                                        ? (stats.isReady
                                            ? t('profile.ready')
                                            : t('profile.collectingData'))
                                        : t('profile.notStarted')
                                    }
                                </p>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {stats.timeLeft ? (
                                    <button
                                        disabled={!stats.isReady && !isCalculated}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            borderRadius: '16px',
                                            background: stats.isReady ? 'var(--primary)' : 'rgba(128,128,128,0.1)', // Neutral disabled
                                            color: stats.isReady ? 'white' : 'var(--text-muted)',
                                            border: 'none',
                                            fontWeight: 'bold',
                                            fontSize: '16px',
                                            cursor: stats.isReady ? 'pointer' : 'not-allowed'
                                        }}
                                        onClick={handleCalculate}
                                    >
                                        {isCalculated ? t('profile.calculateAgain') : (stats.isReady ? t('profile.check') : `${t('profile.check')} (${stats.timeLeft})`)}
                                    </button>
                                ) : (
                                    <button
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            borderRadius: '16px',
                                            background: 'var(--primary)',
                                            color: 'white',
                                            border: 'none',
                                            fontWeight: 'bold',
                                            fontSize: '16px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={handleStartVerification}
                                    >
                                        {t('profile.startVerification')}
                                    </button>
                                )}

                                <button
                                    onClick={handleDelete}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: 'transparent',
                                        color: '#ef4444',
                                        border: '1px solid #ef4444',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t('common.delete')}
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </PageContainer>
    );
};

export default Profile;
