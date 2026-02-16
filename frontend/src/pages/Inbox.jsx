import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import Modal from '../components/Modal';
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
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)', // Slide from Right now (standard for subpages) or keep left? User said "Inbox page items looking bad". Let's slide from right like others or keep consistency. Actually profile is right, feed is left. Inbox usually right side overlay or modal. Let's stick to existing but fix the "white box" issue.
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2001,
        transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        // background: 'var(--bg-dark)', // Handled in CSS module .overlayPage
    };

    const [selectedNote, setSelectedNote] = useState(null);

    const handleItemClick = (note) => {
        setSelectedNote(note);
        if (!note.read) {
            // Optional: mark as read immediately or keep existing logic
            // For now just open modal
        }
    };

    return (
        <div className={styles.overlayPage} style={style}>
            <div className={styles.list}>
                {loading && <div className={styles.emptyState}>{t('common.loading')}</div>}

                {!loading && notifications.length === 0 && (
                    <div className={styles.emptyState}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
                        <p>{t('inbox.empty')}</p>
                    </div>
                )}

                {notifications.map(note => (
                    <div
                        key={note.id}
                        className={`${styles.item} ${!note.read ? styles.unread : ''}`}
                        onClick={() => handleItemClick(note)}
                        style={{ cursor: 'pointer' }}
                    >
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

            {/* Details Modal */}
            {selectedNote && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 3000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none' // Let clicks pass to modal backdrop
                }}>
                    {/* We can reuse the Modal component if it supports custom content effectively */}
                    {/* However, since Modal.jsx is a full component, let's use it directly */}
                </div>
            )}

            {/* Import Modal at top and use here */}
            <Modal
                isOpen={!!selectedNote}
                onClose={() => setSelectedNote(null)}
                title={selectedNote ? t('inbox.details') : ''}
                zIndex={3000}
            >
                {selectedNote && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '20px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '16px',
                            background: 'var(--bg-dark)',
                            borderRadius: '16px',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <div style={{ fontSize: '32px' }}>{getIcon(selectedNote.type)}</div>
                            <div>
                                <div style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                    {selectedNote.type}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {selectedNote.time}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            fontSize: '16px',
                            lineHeight: '1.6',
                            color: 'var(--text-main)',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {getMessage(selectedNote)}
                        </div>

                        <button
                            onClick={() => setSelectedNote(null)}
                            style={{
                                padding: '14px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '600',
                                fontSize: '16px',
                                marginTop: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            {t('common.close')}
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Inbox;
