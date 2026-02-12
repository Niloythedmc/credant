import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import styles from './Inbox.module.css';
import { useTranslation } from 'react-i18next';
import { useApi } from '../auth/useApi';

const Inbox = ({ activePage }) => {
    const { t } = useTranslation();
    const { get, post } = useApi();
    const index = 4.1;
    const isVisible = activePage === 'inbox';

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isVisible) {
            setLoading(true);
            const fetchInbox = async () => {
                try {
                    const data = await get('/inbox');
                    if (data && data.notifications) {
                        setNotifications(data.notifications);
                    }
                } catch (error) {
                    console.error("Failed to load inbox", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchInbox();
        }
    }, [isVisible]);

    const markAllRead = async () => {
        try {
            await post('/inbox/read', {});
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (e) {
            console.error(e);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'wallet': return '💰';
            case 'security': return '🛡️';
            case 'system': return '🔔';
            case 'social': return '👥';
            default: return '📩';
        }
    };

    const getMessage = (note) => {
        if (note.translationKey) {
            return t(note.translationKey, note.params || {});
        }
        return note.message;
    };

    // Calculate dynamic transform based on activePage
    const style = {
        transform: isVisible ? 'translateX(0)' : 'translateX(-100%)', // Slide from Left
        position: 'fixed',
        top: 0,
        left: 0, // Ensure left alignment
        width: '100%',
        height: '100%',
        zIndex: 2001, // Ensure above Bottom Nav
        transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        background: 'var(--bg-dark)',
        paddingTop: '80px', // Added padding
    };

    return (
        <div className={styles.overlayPage} style={style}>
            {/* Header Removed */}

            <div className={styles.list}>
                {loading && <div className={styles.emptyState}>{t('common.loading')}</div>}

                {!loading && notifications.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>{t('inbox.empty')}</p>
                    </div>
                )}

                {notifications.map(note => (
                    <div key={note.id} className={`${styles.item} ${!note.read ? styles.unread : ''}`}>
                        <div className={styles.iconCircle}>
                            {getIcon(note.type)}
                        </div>
                        <div className={styles.content}>
                            <p className={styles.msg}>{getMessage(note)}</p>
                            <span className={styles.time}>{note.time}</span>
                        </div>
                        {!note.read && <div className={styles.dot} />}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Inbox;
