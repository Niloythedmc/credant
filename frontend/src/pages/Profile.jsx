import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { useAuth } from '../auth/AuthProvider';
import { useApi } from '../auth/useApi';
import styles from './Profile.module.css';

const Profile = ({ activePage }) => {
    const index = 4;
    const { user, tgUser, userProfile } = useAuth();
    const { post, get } = useApi();

    const [wallet, setWallet] = useState(null);
    const [balance, setBalance] = useState("0.00");
    const [loadingWallet, setLoadingWallet] = useState(false);

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

    const handleCreateWallet = async () => {
        setLoadingWallet(true);
        try {
            const res = await post('/wallet/create', {});
            setWallet(res.address);
            alert("Wallet Created: " + res.address);
            // Fetch balance immediately (likely 0)
            const balRes = await get(`/wallet/balance/${res.address}`);
            setBalance(balRes.ton);
        } catch (e) {
            console.error(e);
            alert("Error creating wallet: " + e.message);
        } finally {
            setLoadingWallet(false);
        }
    };

    // Derived Display Data
    const tgFullName = tgUser ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : null;
    const displayName = tgFullName || user?.displayName || user?.uid?.substring(0, 8) || "Anonymous";
    const displayHandle = tgUser?.username ? `@${tgUser.username}` : (user?.reloadUserInfo?.screenName ? `@${user.reloadUserInfo.screenName}` : "@user");
    const profileImage = tgUser?.photo_url || user?.photoURL || "https://i.pravatar.cc/150?u=99";

    const MenuButton = ({ icon, label, onClick }) => (
        <button className={styles.menuButton} onClick={onClick}>
            <div className={styles.menuButtonInner}>
                <span className={styles.menuIcon}>{icon}</span>
                <span className={styles.menuLabel}>{label}</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>
    );

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
                    <div className={styles.handleContainer}>
                        <span className={styles.handle}>{displayHandle}</span>
                        <span className={styles.dot}></span>
                        <span className={styles.verifiedBadge}>
                            Verified Publisher
                        </span>
                    </div>
                </div>

                {/* Wallet Card */}
                <div className={styles.walletCard}>
                    {/* Decorative Circles */}
                    <div className={styles.decoCircle} />

                    <div className={styles.walletContent}>
                        <p className={styles.label}>Total Earnings</p>
                        <div className={styles.balanceRow}>
                            <h1 className={styles.balanceAmount}>{balance}</h1>
                            <span className={styles.balanceUnit}>TON</span>
                        </div>

                        {wallet && (
                            <div className={styles.addressRow}>
                                <span className={styles.addressText}>
                                    {wallet.slice(0, 4) + '...' + wallet.slice(-4)}
                                </span>
                                <button onClick={(e) => {
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
                                            alert('Address copied!');
                                        } catch (err) {
                                            console.error('Fallback copy failed', err);
                                            alert('Failed to copy address');
                                        }
                                        document.body.removeChild(textArea);
                                    };

                                    if (navigator.clipboard && window.isSecureContext) {
                                        navigator.clipboard.writeText(text)
                                            .then(() => alert('Address copied!'))
                                            .catch((err) => {
                                                console.error('Clipboard API failed', err);
                                                fallbackCopy();
                                            });
                                    } else {
                                        fallbackCopy();
                                    }
                                }} className={styles.copyButton}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                        )}

                        <div className={styles.actionRow}>
                            <button onClick={handleCreateWallet} disabled={loadingWallet} className={styles.primaryButton}>
                                {loadingWallet ? "Processing..." : (wallet ? "Withdraw" : "Create Wallet")}
                            </button>
                            <button className={styles.secondaryButton}>
                                History
                            </button>
                        </div>
                    </div>
                </div>

                {/* Publisher Stats - Using Defaults for MVP since backend stats aren't hooked up yet */}
                <div className={styles.statsGrid}>
                    {[
                        { label: 'Channels', value: '3', icon: '📢' },
                        { label: 'Ads Posted', value: '12', icon: '⚡' },
                        { label: 'Trust Score', value: '98', icon: '🛡️', color: '#10b981' },
                    ].map((stat, i) => (
                        <div key={i} className={styles.statCard}>
                            <span style={{ fontSize: '20px' }}>{stat.icon}</span>
                            <div>
                                <div className={styles.statValue} style={stat.color ? { color: stat.color } : {}}>{stat.value}</div>
                                <div className={styles.statLabel}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Menu */}
                <div>
                    <h3 className={styles.menuTitle}>Management</h3>
                    <MenuButton icon="📢" label="My Channels" onClick={() => { }} />
                    <MenuButton icon="📊" label="Ad Performance" onClick={() => { }} />
                    <MenuButton icon="⚙️" label="Settings" onClick={() => { }} />
                    <MenuButton icon="❓" label="Help & Support" onClick={() => { }} />
                </div>

            </div>
        </PageContainer>
    );
};

export default Profile;
