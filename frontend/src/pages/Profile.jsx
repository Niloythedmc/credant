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
    const { post, get } = useApi();
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

    const ContentSection = ({ title, items, emptyText, actionText, styles, onAction, hasPriceIcon, isClientOffer }) => {
        const hasItems = items && items.length > 0;
        const displayItems = hasItems ? items.slice(0, 3) : [];

        return (
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle} style={{ color: 'var(--text-main)' }}>
                        {title}
                        {hasItems && hasPriceIcon && <span className={styles.priceIcon}>💲</span>}
                    </div>
                </div>

                {hasItems ? (
                    <div className={styles.sectionList}>
                        {displayItems.map((item, i) => (
                            <div key={i} className={styles.itemCard} style={{ background: 'rgba(128,128,128,0.1)' }}>
                                <div className={styles.itemTitle} style={{ color: 'var(--text-main)' }}>{item.title}</div>
                                <div className={styles.itemSubtitle} style={{ color: 'var(--text-muted)' }}>{item.sub}</div>
                            </div>
                        ))}
                        {items.length > 3 && (
                            <button className={styles.moreButton} style={{ color: 'var(--primary)' }}>{t('common.more')}</button>
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

                        <div className={styles.addressContainer} onClick={handleConnectClick} style={{ cursor: 'pointer', background: 'rgba(128,128,128,0.1)' }}>
                            {userFriendlyAddress ? (
                                <>
                                    <span className={styles.addressTextHeader} style={{ color: 'var(--text-muted)' }}>
                                        {userFriendlyAddress.slice(0, 4) + '...' + userFriendlyAddress.slice(-4)}
                                    </span>
                                    {/* Using a power/disconnect icon */}
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                        <line x1="12" y1="2" x2="12" y2="12"></line>
                                    </svg>
                                </>
                            ) : (
                                <span className={styles.addressTextHeader} style={{ color: 'var(--primary)' }}>{t('common.connectWallet')}</span>
                            )}
                        </div>

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
                    hasPriceIcon={true}
                />

                <ContentSection
                    title={t('profile.ads')}
                    items={userProfile?.ads || []}
                    emptyText={t('profile.noAds')}
                    actionText={t('profile.postAds')}
                    styles={styles}
                    onAction={() => onNavigate('postAds')}
                    hasPriceIcon={true}
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
        </PageContainer>
    );
};

export default Profile;
