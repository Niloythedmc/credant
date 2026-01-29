import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';
import styles from './Feed.module.css';

const Feed = ({ activePage }) => {
    const index = 0;
    const { get, post } = useApi();
    const { user, tgUser } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
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
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return { ...p, likesCount: (p.likesCount || 0) + 1 };
                }
                return p;
            }));
        } catch (e) {
            console.error("Like failed", e);
        }
    };

    const VerifiedIcon = () => (
        <svg className={styles.verifiedIcon} viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
    );

    const CoinIcon = ({ color }) => (
        <div className={styles.coinIcon} style={{
            background: color === 'blue' ? 'var(--badge-blue-text)' : 'var(--badge-yellow-text)',
        }}>
            <div className={styles.coinInner}></div>
        </div>
    );

    return (
        <PageContainer id="feed" activePage={activePage} index={index}>
            <div className={styles.page}>
                <header className={styles.header}>
                    <h1 className={styles.headerTitle}>Feed</h1>
                </header>

                <div className={styles.profileCard}>
                    <div className={styles.userInfo}>
                        <img
                            src={tgUser?.photo_url || user?.photoURL || "https://i.pravatar.cc/150?u=99"}
                            alt="Me"
                            className={styles.avatar}
                        />
                        <div>
                            <h2 className={styles.userName}>
                                {tgUser ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : (user?.displayName || "Guest")}
                            </h2>
                            <p className={styles.userStatus}>Verified Grand Owner</p>
                        </div>
                    </div>
                    <button className={styles.inviteButton}>
                        8 invited
                    </button>
                </div>

                <div className={styles.feedList}>
                    {loading && <div className={styles.loading}>Loading Feed...</div>}

                    {!loading && posts.length === 0 && (
                        <div className={styles.emptyState}>
                            <p>No posts yet.</p>
                        </div>
                    )}

                    {posts.map(post => (
                        <div key={post.id} className={styles.postCard}>
                            <div className={styles.postHeader}>
                                <div className={styles.postUser}>
                                    <img
                                        src={post.avatar || "https://i.pravatar.cc/150"}
                                        alt={post.name}
                                        className={styles.postAvatar}
                                    />
                                    <div>
                                        <div className={styles.postUserInfo}>
                                            <h3 className={styles.postName}>{post.name || "Unknown User"}</h3>
                                            {post.verified && <VerifiedIcon />}
                                        </div>
                                    </div>
                                </div>
                                {post.genre && (
                                    <span className={styles.genreBadge}>
                                        <span style={{ fontSize: '12px' }}>⚡</span> {post.genre}
                                    </span>
                                )}
                            </div>

                            <p className={styles.postContent}>
                                {post.content}
                            </p>

                            <div className={styles.postActions}>
                                <button
                                    onClick={() => handleLike(post.id)}
                                    className={styles.likeButton}
                                >
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
