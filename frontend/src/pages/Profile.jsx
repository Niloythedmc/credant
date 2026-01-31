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

const Profile = ({ activePage }) => {
    const index = 4;
    const { user, tgUser, userProfile, refreshProfile } = useAuth();
    const { post, get } = useApi();
    const { addNotification } = useNotification();
    const [tonConnectUI] = useTonConnectUI();
    const userFriendlyAddress = useTonAddress();

    const [wallet, setWallet] = useState(null); // Internal wallet address
    const [balance, setBalance] = useState("0.00");

    // Modal State
    const [modalType, setModalType] = useState(null); // 'deposit' | 'withdraw' | null
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);

    useEffect(() => {
        const fetchWallet = async () => {
            if (userProfile?.wallet?.address) {
                setWallet(userProfile.wallet.address);
                try {
                    const balRes = await get(`/wallet/balance/${userProfile.wallet.address}`);
                    setBalance(balRes.ton);
                } catch (e) {
                    console.error("Failed to fetch balance", e);
                }
            }
        };
        fetchWallet();
    }, [userProfile]);

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
                    <div className={styles.sectionTitle}>
                        {title}
                        {hasItems && hasPriceIcon && <span className={styles.priceIcon}>💲</span>}
                    </div>
                </div>

                {hasItems ? (
                    <div className={styles.sectionList}>
                        {displayItems.map((item, i) => (
                            <div key={i} className={styles.itemCard}>
                                <div className={styles.itemTitle}>{item.title}</div>
                                <div className={styles.itemSubtitle}>{item.sub}</div>
                            </div>
                        ))}
                        {items.length > 3 && (
                            <button className={styles.moreButton}>More</button>
                        )}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyText}>{emptyText}</p>
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
            <div className={styles.page}>

                {/* Header Identity */}
                <div className={styles.identitySection}>
                    <div className={styles.avatarWrapper}>
                        <img src={profileImage} alt="Profile" className={styles.avatar} />
                        <div className={styles.editBadge}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <h2 className={styles.displayName}>{displayName}</h2>

                    {/* Wallet Section Merged into Header */}
                    <div className={styles.headerWallet}>
                        <div className={styles.balanceRowHeader}>
                            <span className={styles.balanceAmountHeader}>{balance}</span>
                            <span className={styles.balanceUnitHeader}>TON</span>
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

                        <div className={styles.addressContainer} onClick={handleConnectClick} style={{ cursor: 'pointer' }}>
                            {userFriendlyAddress ? (
                                <>
                                    <span className={styles.addressTextHeader}>
                                        {userFriendlyAddress.slice(0, 4) + '...' + userFriendlyAddress.slice(-4)}
                                    </span>
                                    {/* Using a power/disconnect icon */}
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                        <line x1="12" y1="2" x2="12" y2="12"></line>
                                    </svg>
                                </>
                            ) : (
                                <span className={styles.addressTextHeader}>Connect Wallet</span>
                            )}
                        </div>

                        <div className={styles.walletActionsHeader}>
                            <button className={styles.actionIconButton} onClick={() => setModalType('deposit')}>
                                <div className={styles.iconCircle}>
                                    <FiArrowDownLeft />
                                </div>
                                <span className={styles.actionLabel}>Deposit</span>
                            </button>
                            <button className={styles.actionIconButton} onClick={() => setModalType('withdraw')}>
                                <div className={styles.iconCircle}>
                                    <FiArrowUpRight />
                                </div>
                                <span className={styles.actionLabel}>Withdraw</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Sections */}
                <ContentSection
                    title="My Thoughts"
                    items={[]} // Mock: [] for empty, or fill for data
                    emptyText="You have no thoughts"
                    actionText="Share Thoughts"
                    styles={styles}
                    onAction={() => addNotification('info', 'Share Thoughts coming soon')}
                />

                <ContentSection
                    title="My Channels"
                    items={[{ id: 1, title: 'Tech News Daily', sub: '12.5k subs' }, { id: 2, title: 'Crypto Alerts', sub: '5.2k subs' }, { id: 3, title: 'Daily Memes', sub: '8.1k subs' }]}
                    emptyText="You have no channels"
                    actionText="List Channel"
                    styles={styles}
                    onAction={() => addNotification('info', 'List Channel coming soon')}
                    hasPriceIcon={true}
                />

                <ContentSection
                    title="My Ads"
                    items={[{ id: 1, title: 'Promo: Wallet App', sub: 'Active • 120 clicks' }]}
                    emptyText="You have no ads"
                    actionText="Post Ads"
                    styles={styles}
                    onAction={() => addNotification('info', 'Post Ads coming soon')}
                    hasPriceIcon={true}
                />

                <ContentSection
                    title="Offers"
                    items={[]}
                    emptyText="You have no offers"
                    actionText="" // No action for offers as per req ("created by clients")
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
                walletAddress={wallet} // Passes Internal Wallet Address
            />

            {/* Disconnect Confirmation Modal */}
            <Modal
                isOpen={showDisconnectModal}
                onClose={() => setShowDisconnectModal(false)}
                title="Disconnect Wallet"
            >
                <div>
                    <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '20px' }}>
                        Are you sure you want to disconnect your wallet?
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setShowDisconnectModal(false)}
                            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDisconnect}
                            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#e53935', color: 'white', fontWeight: 'bold' }}
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            </Modal>
        </PageContainer>
    );
};

export default Profile;
