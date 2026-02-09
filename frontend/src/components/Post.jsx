import React, { useState, useEffect } from 'react';
import styles from './Post.module.css';
import RichTextParser from './RichTextParser';
import { useUserCache } from '../context/UserCacheContext';

const Post = ({ post, onLike, onProfileClick }) => {
    const { resolveUser, getCachedUser } = useUserCache();

    // Initialize with cached data if available
    const cachedInitial = post.userId ? getCachedUser(post.userId) : null;
    const [userData, setUserData] = useState(cachedInitial);

    // If we have userId but no data, we are loading.
    const [loadingUser, setLoadingUser] = useState(!cachedInitial && !!post.userId);

    // Fetch user data if userId is present
    useEffect(() => {
        let isMounted = true;

        // If we already have initial data from cache, we don't need to do anything 
        // unless we want to re-validate? For now, assume cache is good.
        if (userData) {
            // console.log(`[Post] Already have userData for ${post.userId}`, userData);
            return;
        }

        const fetchUser = async () => {
            if (post.userId) {
                console.log(`[Post] Fetching user ${post.userId} for post ${post.id}`);
                // Double check cache in effect (in case it updated between render and effect?)
                // Actually, if we initialized with it, we are good.
                // But just in case we didn't have it at init but do now:
                const cached = getCachedUser(post.userId);
                if (cached) {
                    if (isMounted) {
                        console.log(`[Post] Found in cache inside effect for ${post.userId}`, cached);
                        setUserData(cached);
                        setLoadingUser(false);
                    }
                    return;
                }

                setLoadingUser(true); // Ensure loading is true
                try {
                    // Use resolveUser from context
                    const res = await resolveUser(post.userId);
                    console.log(`[Post] Resolved user ${post.userId}:`, res);
                    if (isMounted) {
                        setUserData(res);
                    }
                } catch (e) {
                    console.error("Failed to fetch post user", e);
                } finally {
                    if (isMounted) setLoadingUser(false);
                }
            } else {
                console.warn(`[Post] No userId for post ${post.id}`, post);
            }
        };

        fetchUser();

        return () => { isMounted = false; };
    }, [post.userId, resolveUser, getCachedUser, userData]);

    // Use fetched data or fallback to post data
    // Use fetched data or fallback to post data
    const resolvedName = userData?.name || userData?.title || userData?.username;

    // If userData is available, use it (even if it is 'User' or generic).
    // Only use post data if userData is not yet loaded.
    const displayName = userData
        ? (resolvedName || 'Unknown')
        : (post.name || post.username || 'User');

    // If userData is available, use its photo (or default). NEVER use post.userPhoto if userData is present.
    const displayAvatar = userData
        ? (userData.photoUrl || `https://i.pravatar.cc/150?u=${post.userId}`)
        : (post.userPhoto || post.avatar || `https://i.pravatar.cc/150?u=${post.userId}`);

    const isVerified = userData ? (userData.verified || false) : (post.verified || false);
    const username = userData ? userData.username : (post.username || null); // To pass to profile click

    // Format time (assuming firestore timestamp or iso string)
    const formatTime = (ts) => {
        if (!ts) return '';

        let date;
        if (ts?.seconds) {
            date = new Date(ts.seconds * 1000);
        } else if (ts?._seconds) {
            date = new Date(ts._seconds * 1000);
        } else {
            const parsed = new Date(ts);
            date = isNaN(parsed.getTime()) ? null : parsed;
        }

        if (!date) return '';

        const now = new Date();
        const diff = (now - date) / 1000; // seconds

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    const handleProfileClick = (e) => {
        e.stopPropagation();
        // Prefer username if available, else userId
        if (onProfileClick) {
            onProfileClick(username || post.userId);
        }
    };

    return (
        <div className={styles.postCard}>
            <div className={styles.postHeader}>
                {loadingUser ? (
                    <div className={styles.postUser}>
                        <div className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
                        <div style={{ marginLeft: '10px' }}>
                            <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '100px' }} />
                            <div className={`${styles.skeleton} ${styles.skeletonText} ${styles.short}`} />
                        </div>
                    </div>
                ) : (
                    <div className={styles.postUser} onClick={handleProfileClick}>
                        <img
                            src={displayAvatar}
                            alt={displayName}
                            className={styles.postAvatar}
                        />
                        <div>
                            <div className={styles.postUserInfo}>
                                <h3 className={styles.postName}>{displayName}</h3>
                                {isVerified && (
                                    <svg className={styles.verifiedIcon} viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                )}
                            </div>
                            <span className={styles.postTime}>{formatTime(post.createdAt)}</span>
                        </div>
                    </div>
                )}
                {post.genre && (
                    <span className={styles.genreBadge}>
                        <span style={{ fontSize: '12px' }}>⚡</span> {post.genre}
                    </span>
                )}
            </div>

            <div className={styles.postContent}>
                <RichTextParser
                    content={post.content}
                    onProfileClick={onProfileClick} // Pass handler for mentions
                />
            </div>

            <div className={styles.postActions}>
                <button
                    onClick={(e) => { e.stopPropagation(); onLike(post.id); }}
                    className={styles.likeButton}
                >
                    ❤️ {post.likesCount || 0} Like
                </button>
            </div>
        </div>
    );
};

export default Post;
