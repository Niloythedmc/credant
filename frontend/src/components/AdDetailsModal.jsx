import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import TelegramPostRenderer from './TelegramPostRenderer';
import { useUserCache } from '../context/UserCacheContext';
import { useState, useEffect } from 'react';

import { ArrowRight, Globe, Users, Megaphone, CheckCircle, ExternalLink } from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';

const AdDetailsModal = ({ selectedAd, onClose, onRequestDeal }) => {
    const { t } = useTranslation();
    const { registerBackHandler } = useTelegram();

    // Handle Back Button via Context
    useEffect(() => {
        if (selectedAd) {
            // Layer 15: Interaction Modals (Lower than App Overlays/Pages which are 20)
            // This allows RequestDeal (Layer 20) to take precedence, and when closed, this handler becomes active again.
            const unregister = registerBackHandler(15, onClose);
            return () => unregister();
        }
    }, [selectedAd, registerBackHandler, onClose]);

    if (!selectedAd) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'var(--bg-dark)',
                    zIndex: 1001, // Higher than Nav (100)
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden' // Important for sticky header
                }}
            >
                {/* Back Button / Close Area */}
                <div style={{ padding: '20px 20px 0', zIndex: 12 }}>
                    {/* Native Back Handling expected, but visual spacer or close can exist if needed. 
                         For now, we rely on Native Back or a dedicated Close button if user implies.
                         User said "Native Back Button only" previously, but here we might need a way to close if not using native back.
                         However, let's stick to the previous implementation which had no explicit header.
                     */}
                </div>


                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingTop: '40px', paddingBottom: '100px' }}>

                    {/* 2. Main Post Content */}
                    <div style={{ marginBottom: 32 }}>
                        <h3 style={{
                            fontSize: '14px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px',
                            marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            <span style={{ width: 4, height: 16, background: '#3b82f6', borderRadius: 2 }} />
                            {t('ads.postContent', 'Post Content')}
                        </h3>
                        <div>
                            <TelegramPostRenderer
                                text={selectedAd.postText || selectedAd.description || 'No content text.'}
                                entities={selectedAd.entities}
                                staticEmoji={true}
                                showCard={true}
                                mediaPreview={selectedAd.mediaPreview}
                                buttonText={selectedAd.buttonText}
                                link={selectedAd.link}
                            />
                        </div>
                    </div>

                    {/* 3. Targeting & Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
                        {/* GEO */}
                        <div style={{
                            background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Globe size={14} /> {t('ads.targetGeo', 'Target GEO')}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {selectedAd.geo && selectedAd.geo.length > 0 ? (
                                    selectedAd.geo.map((g, i) => (
                                        <span key={i} style={{
                                            fontSize: 13, background: 'rgba(59, 130, 246, 0.15)',
                                            color: '#60a5fa', padding: '4px 8px', borderRadius: 6
                                        }}>
                                            {g}
                                        </span>
                                    ))
                                ) : <span style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Global / Any</span>}
                            </div>
                        </div>

                        {/* Age */}
                        <div style={{
                            background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Users size={14} /> {t('ads.ageGroup', 'Age Group')}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: '600' }}>
                                {selectedAd.ageRange ? `${selectedAd.ageRange[0]} - ${selectedAd.ageRange[1]}` : '18 - 65+'}
                            </div>
                        </div>
                    </div>

                    {/* 4. Channels List */}
                    <div style={{ marginBottom: 32 }}>
                        <h3 style={{
                            fontSize: '14px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px',
                            marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            <span style={{ width: 4, height: 16, background: '#10b981', borderRadius: 2 }} />
                            {t('ads.targetedChannels', 'Targeted Channels')}
                        </h3>

                        {selectedAd.channels && selectedAd.channels.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {selectedAd.channels.map((ch, i) => (
                                    <TargetedChannelRow key={i} channel={ch} />
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                padding: 20, textAlign: 'center', borderRadius: 16,
                                background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)'
                            }}>
                                {t('ads.noSpecificChannels', 'No specific channels selected (Run of Network)')}
                            </div>
                        )}
                    </div>

                </div>

                {/* Sticky Footer CTA */}
                <div style={{
                    padding: '20px',
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', gap: 16, alignItems: 'center',
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    zIndex: 11
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t('ads.totalBudgetCaption', 'Total Budget')}</span>
                        <span style={{ fontSize: 20, fontWeight: 'bold' }}>{selectedAd.budget} TON</span>
                    </div>

                    {/* Request Deal Button */}
                    <button
                        onClick={onRequestDeal}
                        style={{
                            flex: 1,
                            height: '52px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            fontWeight: '600', fontSize: '14px',
                            cursor: 'pointer',
                        }}
                    >
                        {t('ads.requestDeal', 'Request Deal')}
                    </button>

                    {selectedAd.link ? (
                        <button
                            onClick={() => window.open(selectedAd.link, '_blank')}
                            style={{
                                flex: 1,
                                height: '52px',
                                borderRadius: '16px',
                                background: 'linear-gradient(90deg, #3b82f6, #9333ea)',
                                border: 'none', color: 'white',
                                fontWeight: '600', fontSize: '16px',
                                boxShadow: '0 8px 24px -6px rgba(59, 130, 246, 0.5)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}
                        >
                            {t('ads.visitLink', 'Visit Link')}
                            <ExternalLink size={18} />
                        </button>
                    ) : (
                        <button disabled style={{
                            flex: 1, height: '52px', borderRadius: '16px',
                            background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)',
                            border: 'none', fontWeight: '600'
                        }}>
                            {t('ads.noLink', 'No Link Available')}
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

// Reused Component
const TargetedChannelRow = ({ channel }) => {
    const { t } = useTranslation();
    const { resolveUser } = useUserCache();
    const initialData = typeof channel === 'object' ? channel : null;
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);

    const channelId = typeof channel === 'object' ? channel.id : channel;

    useEffect(() => {
        let isMounted = true;
        if (channelId) {
            setLoading(true);
            resolveUser(channelId).then(res => {
                if (isMounted && res) {
                    setData(res);
                }
                if (isMounted) setLoading(false);
            });
        }
        return () => { isMounted = false; };
    }, [channelId, resolveUser]);

    const displayName = data?.title || data?.name || (typeof channel === 'object' ? channel.name : 'Unknown');
    const displaySubs = data?.subscribers || data?.subs || (typeof channel === 'object' ? channel.subscribers : 0);
    const displayPhoto = data?.photoUrl || (typeof channel === 'object' ? channel.photoUrl : null);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(255,255,255,0.03)', padding: '12px',
            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'
        }}>
            {displayPhoto ? (
                <img src={displayPhoto} style={{ width: 40, height: 40, borderRadius: '50%' }} alt="CH" />
            ) : (
                <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `hsl(${Math.random() * 360}, 70%, 20%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white'
                }}>
                    <Megaphone size={18} />
                </div>
            )}

            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: 15 }}>
                    {displayName}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    {loading ? t('common.loading') : `${displaySubs || 'N/A'} ${t('ads.subscribers', 'subscribers')}`}
                </div>
            </div>

            <a
                href={data?.username ? `https://t.me/${data.username}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                    padding: '4px 8px', borderRadius: 8, fontSize: 11,
                    textDecoration: 'none',
                    pointerEvents: data?.username ? 'auto' : 'none',
                    opacity: data?.username ? 1 : 0.5,
                    display: 'flex', alignItems: 'center', gap: 4
                }}
            >
                {data?.username ? <span>{t('common.view', 'View')}</span> : <span>{t('ads.verified', 'Verified')}</span>}
                <CheckCircle size={10} />
            </a>
        </div>
    );
};

export default AdDetailsModal;
