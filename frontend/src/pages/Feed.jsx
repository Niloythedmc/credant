import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';

const Feed = ({ activePage }) => {
    const index = 0;
    const { get, post } = useApi();
    const { user, tgUser } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                // In a real app, you might want to handle pagination here
                const data = await get('/feed');
                setPosts(data.posts || []);
            } catch (error) {
                console.error("Failed to load feed", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, []);

    const handleLike = async (postId) => {
        try {
            await post('/feed/like', { postId });
            // Optimistic Update
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    // Start simple toggle logic (in real app, check if liked by user)
                    return { ...p, likesCount: (p.likesCount || 0) + 1 };
                }
                return p;
            }));
        } catch (e) {
            console.error("Like failed", e);
        }
    };

    // Icons
    const VerifiedIcon = () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--icon-verified)" stroke="none" style={{ marginLeft: '4px' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
    );

    const CoinIcon = ({ color }) => (
        <div style={{
            width: '16px', height: '16px', borderRadius: '4px',
            background: color === 'blue' ? 'var(--badge-blue-text)' : 'var(--badge-yellow-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '6px'
        }}>
            <div style={{ width: '8px', height: '8px', border: '2px solid white', borderRadius: '50%' }}></div>
        </div>
    );

    return (
        <PageContainer id="feed" activePage={activePage} index={index}>
            <div style={{
                padding: '16px',
                paddingTop: 'env(safe-area-inset-top, 20px)',
                minHeight: '100%',
                background: 'var(--bg-dark)' // Ensure background matches
            }}>
                {/* Header */}
                <header style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '20px',
                    position: 'relative',
                    justifyContent: 'center',
                    padding: '10px 0'
                }}>
                    <h1 style={{
                        color: 'var(--text-main)',
                        fontSize: '20px',
                        fontWeight: '700',
                        margin: 0
                    }}>
                        Feed
                    </h1>
                    {/* User Mini Profile Top Right if needed? Image shows something indistinct. Skipping for clean look. */}
                </header>

                {/* Top Profile Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '0 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={tgUser?.photo_url || user?.photoURL || "https://i.pravatar.cc/150?u=99"} alt="Me" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--bg-card)' }} />
                        <div>
                            <h2 style={{ fontSize: '16px', fontWeight: '700', lineHeight: '1.2' }}>{tgUser ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : (user?.displayName || "Guest")}</h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Verified Grand Owner</p>
                        </div>
                    </div>
                    <button style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        color: 'var(--text-muted)'
                    }}>
                        8 invited
                    </button>
                </div>

                {/* Feed List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
                    {loading && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Loading Feed...</div>}

                    {!loading && posts.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                            <p>No posts yet.</p>
                        </div>
                    )}

                    {posts.map(post => (
                        <div key={post.id} style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            padding: '16px',
                            boxShadow: 'var(--card-shadow)',
                            border: '1px solid var(--glass-border)'
                        }}>
                            {/* Card Header & Content (Reused Structure) */}
                            {/* Note: In a real app, ensure API returns 'avatar', 'name', 'verified', etc. */}
                            {/* Falling back to defaults if missing from backend schema */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <img src={post.avatar || "https://i.pravatar.cc/150"} alt={post.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginRight: '4px' }}>{post.name || "Unknown User"}</h3>
                                            {post.verified && <VerifiedIcon />}
                                        </div>
                                    </div>
                                </div>
                                {/* Genre Badge */}
                                {post.genre && (
                                    <span style={{
                                        background: 'var(--badge-blue-bg)',
                                        color: 'var(--badge-blue-text)',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        <span style={{ fontSize: '12px' }}>⚡</span> {post.genre}
                                    </span>
                                )}
                            </div>

                            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-main)', marginBottom: '16px' }}>
                                {post.content}
                            </p>

                            {/* Likes / Actions */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => handleLike(post.id)}
                                    style={{
                                        background: 'none', border: 'none', color: 'var(--badge-yellow-text)',
                                        fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                    ❤️ {post.likesCount || 0} Likes
                                </button>
                            </div>
                        </div>
                    ))}
                </div>



            </div>
        </PageContainer>
    );
};

export default Feed;
