import React, { useState } from 'react';
import styles from './BottomPage.module.css';
import { useTranslation } from 'react-i18next';
import { FiChevronDown, FiImage, FiSmile } from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';

const ShareThought = ({ activePage, onNavigate }) => {
    const { t } = useTranslation();
    const { addNotification } = useNotification();
    const isVisible = activePage === 'shareThought';
    const [thought, setThought] = useState('');

    const style = {
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
    };

    const handleSubmit = () => {
        if (!thought.trim()) return;
        // API call would go here
        addNotification('success', 'Thought shared successfully!');
        setThought('');
        window.history.back();
    };

    return (
        <div className={styles.page} style={style}>
            <div className={styles.header}>
                <button className={styles.backButton} onClick={() => window.history.back()}>
                    <FiChevronDown size={24} />
                </button>
                <h2 className={styles.title}>{t('profile.shareThoughts')}</h2>
            </div>
            <div className={styles.content}>
                <div className={styles.formGroup}>
                    <textarea
                        className={styles.textarea}
                        placeholder="What's on your mind? Use @ to mention, # for hashtag..."
                        value={thought}
                        onChange={(e) => setThought(e.target.value)}
                        autoFocus={isVisible}
                    />
                </div>

                <div style={{ display: 'flex', gap: '16px', color: 'var(--primary)' }}>
                    <FiImage size={24} style={{ cursor: 'pointer' }} />
                    <FiSmile size={24} style={{ cursor: 'pointer' }} />
                </div>

                <button className={styles.submitButton} onClick={handleSubmit}>
                    Share Post
                </button>
            </div>
        </div>
    );
};

export default ShareThought;
