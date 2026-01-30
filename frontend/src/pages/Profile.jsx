import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { useAuth } from '../auth/AuthProvider';
import { useApi } from '../auth/useApi';
import { useNotification } from '../context/NotificationContext';
import { FiArrowDownLeft, FiArrowUpRight } from 'react-icons/fi';
import styles from './Profile.module.css';

const Profile = ({ activePage }) => {
    const index = 4;
    const { user, tgUser, userProfile, refreshProfile } = useAuth();
    const { post, get } = useApi();
    const { addNotification } = useNotification();

    const [wallet, setWallet] = useState(null);
    const [balance, setBalance] = useState("0.00");

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
                            <div style={{ padding: '10px', background: '#333', borderRadius: '8px', marginTop: '10px', fontSize: '10px', color: '#fff' }}>
                                <p>DEBUG INFO:</p>
                                <p>TG Available: {window.Telegram ? "Yes" : "No"}</p>
                                <p>TG WebApp: {window.Telegram?.WebApp ? "Yes" : "No"}</p>
                                <p>InitData Len: {window.Telegram?.WebApp?.initData?.length || 0}</p>
                                <p>User: {user ? "Logged In" : "Null"}</p>
                                <p>Profile: {userProfile ? "Loaded" : "Null"}</p>
                                <button onClick={() => window.location.reload()} style={{ marginTop: '5px', padding: '4px' }}>Reload</button>
                            </div>
                        )}

                        {wallet && (
                            <div className={styles.addressContainer} onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const text = wallet;
                                const fallbackCopy = () => {
                                    const textArea = document.createElement("textarea");
                                    textArea.value = text;
                                    textArea.style.position = "fixed";
                                    textArea.style.left = "-9999px";
                                    document.body.appendChild(textArea);
                                    textArea.focus();
                                    textArea.select();
                                    try {
                                        document.execCommand('copy');
                                        addNotification('chain', 'Address copied');
                                    } catch (err) {
                                        console.error('Fallback copy failed', err);
                                        addNotification('error', 'Failed to copy address');
                                    }
                                    document.body.removeChild(textArea);
                                };
                                if (navigator.clipboard && window.isSecureContext) {
                                    navigator.clipboard.writeText(text)
                                        .then(() => addNotification('chain', 'Address copied'))
                                        .catch((err) => {
                                            console.error('Clipboard API failed', err);
                                            fallbackCopy();
                                        });
                                } else {
                                    fallbackCopy();
                                }
                            }}>
                                <span className={styles.addressTextHeader}>
                                    {wallet.slice(0, 4) + '...' + wallet.slice(-4)}
                                </span>
                                <svg className={styles.copyIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </div>
                        )}

                        <div className={styles.walletActionsHeader}>
                            <button className={styles.actionIconButton} onClick={() => addNotification('info', 'Deposit feature coming soon')}>
                                <div className={styles.iconCircle}>
                                    <FiArrowDownLeft />
                                </div>
                                <span className={styles.actionLabel}>Deposit</span>
                            </button>
                            <button className={styles.actionIconButton} onClick={() => addNotification('info', 'Withdraw feature coming soon')}>
                                <div className={styles.iconCircle}>
                                    <FiArrowUpRight />
                                </div>
                                <span className={styles.actionLabel}>Withdraw</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Wallet Card Removed */}

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
        </PageContainer>
    );
};

export default Profile;
