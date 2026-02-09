import React, { useState, useEffect } from 'react';
import styles from './Post.module.css';
import RichTextParser from './RichTextParser';
import { useUserCache } from '../context/UserCacheContext';

const Post = ({ post, onLike, onProfileClick }) => {
    const { resolveUser, getCachedUser } = useUserCache();
    const [userData, setUserData] = useState(null);
    const [loadingUser, setLoadingUser] = useState(false);

    // Fetch user data if userId is present
    useEffect(() => {
        let isMounted = true;
        const fetchUser = async () => {
            if (post.userId) {

                // Check cache first (sync)
                const cached = getCachedUser(post.userId);
                if (cached) {
                    if (isMounted) {
                        setUserData(cached);
                    }
                    return;
                }

                setLoadingUser(true);
                try {
                    // Use resolveUser from context
                    const res = await resolveUser(post.userId);
                    if (isMounted) {
                        setUserData(res);
                    }
                } catch (e) {
                    console.error("Failed to fetch post user", e);
                } finally {
                    if (isMounted) setLoadingUser(false);
                }
            }
        };

        // Only fetch if we don't have rich data or if we want to ensure freshness
        // The post object from feed might have stale name/avatar
        fetchUser();

        return () => { isMounted = false; };
    }, [post.userId, resolveUser, getCachedUser]);

    // Use fetched data or fallback to post data
    const resolvedName = userData?.name || userData?.title;
    // Fallback priority: Resolved Name -> Post Name -> Post Username -> "User"
    const displayName = (resolvedName && resolvedName !== 'User' && resolvedName !== 'Unknown')
        ? resolvedName
        : (post.name || post.username || 'User');

    const displayAvatar = userData?.photoUrl
        ? userData.photoUrl
        : (post.userPhoto || post.avatar || `https://i.pravatar.cc/150?u=${post.userId}`);

    const isVerified = userData ? userData.verified : (post.verified || false);
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
