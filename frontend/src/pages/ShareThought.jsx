import React from 'react';
import styles from './BottomPage.module.css';
import { useTranslation } from 'react-i18next';
import { FiChevronDown } from 'react-icons/fi';

const ShareThought = ({ activePage, onNavigate }) => {
    const { t } = useTranslation();
    const isVisible = activePage === 'shareThought';

    const style = {
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
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
                <p>Share your thoughts here... (Form coming soon)</p>
            </div>
        </div>
    );
};

export default ShareThought;
