import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PageContainer from '../components/PageContainer';
import { useApi } from '../auth/useApi';
import styles from './Ads.module.css';
import { useTranslation } from 'react-i18next';
import AdCard from '../components/AdCard';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../auth/AuthProvider';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import WebApp from '@twa-dev/sdk';
import AdDetailsModal from '../components/AdDetailsModal';
import TelegramPostRenderer from '../components/TelegramPostRenderer';
import { useTelegram } from '../context/TelegramContext';
import { useUserCache } from '../context/UserCacheContext';

const Ads = ({ activePage, onNavigate, isOverlayOpen }) => {
    const { t } = useTranslation();
    const index = 1;

    const { get, post } = useApi();
    const { userProfile } = useAuth();
    const { addNotification } = useNotification();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAd, setSelectedAd] = useState(null);
    const { registerBackHandler } = useTelegram();

    // TWA Back Button Logic (Layer 10 - Page Level Modal)
    useEffect(() => {
        if (selectedAd && !isOverlayOpen) {
            return registerBackHandler(10, () => setSelectedAd(null));
        }
    }, [selectedAd, isOverlayOpen, registerBackHandler]);

    // Deal Request State - REMOVED (Moved to RequestDeal.jsx)

    const handleOpenDealModal = () => {
        if (!userProfile?.channels || userProfile.channels.length === 0) {
            addNotification('warning', t('ads.connectChannelWarning', 'Please connect a channel in Profile first.'));
            return;
        }

        // Store selected ad ID for the next page to pick up
        sessionStorage.setItem('selectedAdId', selectedAd.id);

        // Navigate to Request Deal Page
        onNavigate('requestDeal');
    };


    useEffect(() => {
        const fetchAds = async () => {
            try {
                const data = await get('/ads'); // Public ads endpoint
                // Response is array directly
                setCampaigns(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchAds();
    }, []);

    // Check for "Open Ad" request from Feed
    useEffect(() => {
        if (activePage === 'ads' && campaigns.length > 0) {
            const openId = sessionStorage.getItem('openAdId');
            if (openId) {
                const found = campaigns.find(c => c.id === openId);
                if (found) {
                    setSelectedAd(found);
                    sessionStorage.removeItem('openAdId');
                }
            }
        }
    }, [campaigns, activePage]);

    // Calculate Stats from Real Data
    const totalSpend = campaigns.reduce((acc, curr) => acc + (parseFloat(curr.budget) || 0), 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

    const stats = [
        { label: t('ads.totalSpend'), value: `${totalSpend.toFixed(1)} TON`, change: "+12%", bg: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(196, 181, 253, 0.05))" },
        { label: t('ads.activeAds'), value: activeCampaigns.toString(), change: "+5%", bg: "linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(251, 207, 232, 0.05))" },
        { label: t('ads.impressions'), value: "0", change: "-", bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(191, 219, 254, 0.05))" },
    ];

    const getStatusColor = (status) => {
        if (status === 'active') return '#10b981'; // Green
        if (status === 'completed') return '#9ca3af'; // Gray
        return '#f59e0b'; // Amber (pending)
    };

    const getStatusText = (status) => {
        return status ? status.toUpperCase() : 'UNKNOWN';
    };

    return (
        <PageContainer id="ads" activePage={activePage} index={index}>
            <div className={styles.page}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>{t('ads.title')}</h1>
                        <p className={styles.subtitle}>{t('ads.subtitle')}</p>
                    </div>
                </div>

                {/* Active Campaigns */}
                <h2 className={styles.activityTitle}>{t('ads.recent')}</h2>
                <div className={styles.campaignList}>
                    {loading && <div className={styles.loading}>{t('ads.loading')}</div>}
                    {!loading && campaigns.length === 0 && <div className={styles.emptyState}>{t('ads.empty')}</div>}

                    {campaigns.map(camp => (
                        <AdCard
                            key={camp.id}
                            ad={camp}
                            variant="public"
                            isExpanded={false} // No expansion, just click to open details
                            onToggle={() => setSelectedAd(camp)}
                        />
                    ))}
                </div>

                {/* Ads Details Modal */}
                <AdDetailsModal
                    selectedAd={selectedAd}
                    onClose={() => setSelectedAd(null)}
                    onRequestDeal={handleOpenDealModal}
                />
            </div>

        </PageContainer >
    );
};



export default Ads;
