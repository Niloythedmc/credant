import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useApi } from '../auth/useApi';
import styles from './UserProfileModal.module.css';

const UserProfileModal = ({ isOpen, onClose, userId, username }) => {
    const { get } = useApi();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen) return;

        // Reset state on open
        setData(null);
        setLoading(true);
        setError(null);

        let isMounted = true;
        const fetchData = async () => {
            try {
                let res;
                if (username) {
                    res = await get(`/users/resolve/${username}`);
                } else if (userId) {
                    res = await get(`/users/${userId}/profile`);
                }

                if (isMounted) {
                    setData(res);
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Failed to fetch profile", err);
                    setError("Failed to load profile");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [isOpen, userId, username]);

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            {loading && <div className={styles.loading}>Loading...</div>}

            {error && <div className={styles.error}>{error}</div>}

            {!loading && !error && data && (
                <div className={styles.profileContainer}>
                    <div className={styles.header}>
                        <img
                            src={data.photoUrl || "https://i.pravatar.cc/150"}
                            alt={data.name}
                            className={styles.avatar}
                        />
                        <div className={styles.nameBlock}>
                            <h2 className={styles.name}>
                                {data.name}
                                {data.verified && (
                                    <svg className={styles.verifiedIcon} viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                )}
                            </h2>
                            <p className={styles.username}>
                                {data.username ? `@${data.username}` : ''}
                                {data.type === 'bot' && <span className={styles.botTag}>BOT</span>}
                            </p>
                        </div>
                    </div>

                    {data.bio && (
                        <div className={styles.bioSection}>
                            {data.bio}
                        </div>
                    )}

                    <div className={styles.statsGrid}>
                        {data.type === 'channel' && (
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>{data.subscribers}</span>
                                <span className={styles.statLabel}>Subscribers</span>
                            </div>
                        )}
                        {/* Only show if we have data (e.g. backend sends it for users too) */}
                        {data.joinedAt && (
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>{new Date(data.joinedAt).getFullYear()}</span>
                                <span className={styles.statLabel}>Joined</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className={styles.actions}>
                        <button className={styles.functionButton}>
                            Message
                        </button>
                        {/* More actions like 'View Channel' if it's a channel link? */}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default UserProfileModal;
