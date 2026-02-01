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
        addNotification('success', t('profile.thoughtShared'));
        setThought('');
        window.history.back();
    };

    return (
        <div className={styles.page} style={style}>

            <div className={styles.content}>
                <div className={styles.formGroup}>
                    <textarea
                        className={styles.textarea}
                        placeholder={t('profile.thoughtPlaceholder')}
                        value={thought}
                        onChange={(e) => setThought(e.target.value)}
                        autoFocus={isVisible}
                        style={{ background: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--glass-border)' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '16px', color: 'var(--primary)' }}>
                    <FiImage size={24} style={{ cursor: 'pointer' }} />
                    <FiSmile size={24} style={{ cursor: 'pointer' }} />
                </div>

                <button className={styles.submitButton} onClick={handleSubmit}>
                    {t('profile.shareAction')}
                </button>
            </div>
        </div>
    );
};

export default ShareThought;
