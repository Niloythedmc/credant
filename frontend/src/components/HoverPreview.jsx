import React, { useState, useEffect } from 'react';
import { useUserCache } from '../context/UserCacheContext';
import { useAuth } from '../auth/AuthProvider';
import Modal from './Modal';
import styles from './HoverPreview.module.css';

const HoverPreview = ({ username, position, onClose }) => {
    const { resolveUser, getCachedUser } = useUserCache();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                // Check cache first (sync)
                const cached = getCachedUser(username);
                if (cached) {
                    if (isMounted) {
                        setData(cached);
                        setLoading(false);
                    }
                    return;
                }

                // If not cached, resolve (handles fetching and caching)
                const res = await resolveUser(username);
                if (isMounted) {
                    if (res) {
                        setData(res);
                    } else {
                        setError("User not found");
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError("User not found");
                    setLoading(false);
                }
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [username, resolveUser, getCachedUser]);

    if (loading) {
        return (
            <div className={styles.popover} style={{ top: position.y, left: position.x }}>
                <div className={styles.header}>
                    <div className={`${styles.skeleton} ${styles.skeletonAvatar}`}></div>
                    <div className={styles.info}>
                        <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '60%' }}></div>
                        <div className={`${styles.skeleton} ${styles.skeletonText} ${styles.short}`}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) return null; // Or show error state?

    return (
        <div className={styles.popover} style={{ top: position.y, left: position.x }}>
            <div className={styles.header}>
                <img
                    src={data.photoUrl || "https://i.pravatar.cc/150?u=fake"}
                    alt={data.name}
                    className={styles.avatar}
                />
                <div className={styles.info}>
                    <div className={styles.nameRow}>
                        <span className={styles.name}>{data.name}</span>
                        {data.verified && (
                            <svg className={styles.verifiedIcon} viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                        )}
                        {data.type === 'bot' && <span className={styles.botTag}>BOT</span>}
                    </div>
                    <span className={styles.username}>@{data.username}</span>
                </div>
            </div>

            {data.bio && <p className={styles.bio}>{data.bio}</p>}

            {/* Stats based on type */}
            <div className={styles.stats}>
                {data.type === 'channel' && (
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{data.subscribers}</span>
                        <span className={styles.statLabel}>subscribers</span>
                    </div>
                )}
                {/* Add more stats if available for users */}
            </div>
        </div>
    );
};

export default HoverPreview;
