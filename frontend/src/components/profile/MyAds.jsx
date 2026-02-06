import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiActivity, FiClock, FiDollarSign, FiBarChart2, FiGlobe, FiCpu, FiMessageCircle, FiMonitor } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import AdCard from '../AdCard';

const MyAds = ({ ads, onNavigate, onRefresh }) => {
    const { t } = useTranslation();
    const [expandedId, setExpandedId] = useState(null);

    if (!ads || ads.length === 0) {
        return (
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '24px',
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                marginTop: '10px'
            }}>
                <div style={{
                    width: '60px', height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '24px'
                }}>
                    📢
                </div>
                <h3 style={{ color: 'var(--text-main)', margin: '0 0 8px', fontSize: '18px' }}>{t('profile.noAds')}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 24px', maxWidth: '80%', display: 'inline-block' }}>
                    Start promoting your channel or project today and reach thousands of users.
                </p>
                <button
                    onClick={() => onNavigate('postAds')}
                    style={{
                        background: 'linear-gradient(90deg, #3b82f6, #9333ea)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '16px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                        transition: 'transform 0.2s'
                    }}
                >
                    {t('profile.postAds')}
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {t('profile.ads')}
                    <span style={{
                        fontSize: '12px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#60a5fa',
                        padding: '2px 8px',
                        borderRadius: '12px'
                    }}>{ads.length}</span>
                </h3>
                <button
                    onClick={() => onNavigate('postAds')}
                    style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        border: 'none',
                        width: '32px', height: '32px',
                        borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {ads.map((ad, i) => (
                    <AdCard key={ad.id || i} ad={ad} isExpanded={expandedId === ad.id} onToggle={() => setExpandedId(expandedId === ad.id ? null : ad.id)} />
                ))}
            </div>
        </div>
    );
};



export default MyAds;
