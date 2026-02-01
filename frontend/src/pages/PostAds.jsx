import React, { useState } from 'react';
import styles from './BottomPage.module.css';
import { useTranslation } from 'react-i18next';
import { FiChevronDown } from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';

const PostAds = ({ activePage, onNavigate }) => {
    const { t } = useTranslation();
    const { addNotification } = useNotification();
    const isVisible = activePage === 'postAds';
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        budget: '',
        link: ''
    });

    const style = {
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
    };

    const handleChange = (f, v) => setFormData(p => ({ ...p, [f]: v }));

    const handleSubmit = () => {
        if (!formData.title || !formData.budget) return;
        addNotification('success', 'Ad campaign created!');
        window.history.back();
    };

    return (
        <div className={styles.page} style={style}>
            <div className={styles.header}>
                <button className={styles.backButton} onClick={() => window.history.back()}>
                    <FiChevronDown size={24} />
                </button>
                <h2 className={styles.title}>{t('profile.postAds')}</h2>
            </div>
            <div className={styles.content}>

                <div className={styles.formGroup}>
                    <label className={styles.label} style={{ color: 'var(--text-main)' }}>{t('ads.campaignTitle')}</label>
                    <input className={styles.input} placeholder={t('ads.titlePlaceholder')} onChange={e => handleChange('title', e.target.value)} style={{ background: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--glass-border)' }} />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} style={{ color: 'var(--text-main)' }}>{t('ads.description')}</label>
                    <textarea className={styles.textarea} placeholder={t('ads.contentPlaceholder')} style={{ minHeight: '80px', background: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--glass-border)' }} onChange={e => handleChange('description', e.target.value)} />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} style={{ color: 'var(--text-main)' }}>{t('ads.targetLink')}</label>
                    <input className={styles.input} placeholder={t('ads.linkPlaceholder')} onChange={e => handleChange('link', e.target.value)} style={{ background: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--glass-border)' }} />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} style={{ color: 'var(--text-main)' }}>{t('ads.budget')}</label>
                    <input className={styles.input} type="number" placeholder="0.0" onChange={e => handleChange('budget', e.target.value)} style={{ background: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--glass-border)' }} />
                </div>

                <button className={styles.submitButton} onClick={handleSubmit}>
                    {t('ads.create')}
                </button>
            </div>
        </div>
    );
};

export default PostAds;
