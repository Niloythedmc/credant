import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { useAuth } from '../auth/AuthProvider';
import { useApi } from '../auth/useApi';

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
        <button className="glass" onClick={onClick} style={{
            width: '100%',
            padding: '16px', borderRadius: '16px',
            marginBottom: '12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', textAlign: 'left'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px', color: 'var(--primary)' }}>{icon}</span>
                <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>{label}</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>
    );

    return (
        <PageContainer id="profile" activePage={activePage} index={index}>
            <div style={{
                padding: '24px',
                paddingTop: 'env(safe-area-inset-top, 24px)',
                minHeight: '100%',
                background: 'var(--bg-dark)'
            }}>

                {/* Header Identity */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ position: 'relative' }}>
                        <img src={profileImage} alt="Profile" style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            border: '3px solid var(--bg-card)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }} />
                        <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            background: '#3b82f6', color: 'white',
                            borderRadius: '50%', width: '24px', height: '24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid var(--bg-dark)'
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', marginTop: '12px' }}>{displayName}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{displayHandle}</span>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)' }}></span>
                        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                            Verified Publisher
                        </span>
                    </div>
                </div>

                {/* Wallet Card */}
                <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', // Generic dark gradient base
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                    marginBottom: '24px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {/* Decorative Circles */}
                    <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Total Earnings</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '20px' }}>
                            <h1 style={{ fontSize: '36px', fontWeight: '800', color: 'white', letterSpacing: '-1px' }}>{balance}</h1>
                            <span style={{ fontSize: '18px', fontWeight: '600', color: '#cbd5e1' }}>TON</span>
                        </div>

                        {wallet && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
                                background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', width: 'fit-content'
                            }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                                    {wallet.slice(0, 4) + '...' + wallet.slice(-4)}
                                </span>
                                <button onClick={() => { navigator.clipboard.writeText(wallet); alert('Address copied!'); }} style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex'
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={handleCreateWallet} disabled={loadingWallet} style={{
                                flex: 2, background: 'white', color: '#0f172a', border: 'none',
                                padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '700',
                                cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}>
                                {loadingWallet ? "Processing..." : (wallet ? "Withdraw" : "Create Wallet")}
                            </button>
                            <button style={{
                                flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none',
                                padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                                cursor: 'pointer', backdropFilter: 'blur(5px)'
                            }}>
                                History
                            </button>
                        </div>
                    </div>
                </div>

                {/* Publisher Stats - Using Defaults for MVP since backend stats aren't hooked up yet */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
                    {[
                        { label: 'Channels', value: '3', icon: '📢' },
                        { label: 'Ads Posted', value: '12', icon: '⚡' },
                        { label: 'Trust Score', value: '98', icon: '🛡️', color: '#10b981' },
                    ].map((stat, i) => (
                        <div key={i} className="glass" style={{
                            padding: '16px', borderRadius: '16px',
                            background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                            textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px'
                        }}>
                            <span style={{ fontSize: '20px' }}>{stat.icon}</span>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: stat.color || 'var(--text-main)' }}>{stat.value}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Menu */}
                <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '16px', paddingLeft: '4px', textTransform: 'uppercase' }}>Management</h3>
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
