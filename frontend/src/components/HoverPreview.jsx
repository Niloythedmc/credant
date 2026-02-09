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

    // Calculate adjusted position to keep in viewport
    // Default: centered above the mention
    // We assume 200px width (from CSS) + padding/border ~ 220px
    const cardWidth = 220;
    const windowWidth = window.innerWidth;

    // Initial left position (centered)
    let leftPos = position.x;

    // Check right edge
    if (leftPos + cardWidth / 2 > windowWidth - 10) {
        leftPos = windowWidth - cardWidth / 2 - 10;
    }

    // Check left edge
    if (leftPos - cardWidth / 2 < 10) {
        leftPos = cardWidth / 2 + 10;
    }

    // Apply transform in CSS matches logic, but we need to pass style
    // The CSS has `transform: translateY(-100%)` which handles the vertical.
    // We just need to ensure `left` doesn't push it off screen.
    // But `left: position.x` sets the center anchor? 
    // No, standard `left` sets the left edge unless we translate.
    // The CSS is: .popover { ... top: position.y; left: position.x; transform: translateY(-100%); ... }
    // It seems the current implementation treats `position.x` as the left edge or expected anchor.
    // If `position.x` is the mouse/element center, we typically want to center the popover.
    // Let's assume we want to center it. We should probably translate X too.
    // But failing that, let's just clamp the `left` value so the *box* (starting at `left`) + width < window.
    // Wait, if we don't have translateX(-50%), then `left` IS the left edge.
    // If the mention is at right side of screen, position.x is large. card draws to the right -> overflow.

    // Let's define the style more explicitly.

    const style = {
        top: position.y,
        left: Math.min(Math.max(position.x, 10), window.innerWidth - 210), // Clamp left edge
    };

    return (
        <div className={styles.popover} style={style}>
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

        </div>
    );
};

export default HoverPreview;
