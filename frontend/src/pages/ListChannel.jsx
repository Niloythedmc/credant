import React, { useState } from 'react';
import styles from './BottomPage.module.css';
import { useTranslation } from 'react-i18next';
import { FiChevronDown, FiUsers, FiCheckCircle, FiXCircle, FiRefreshCw, FiAlertCircle, FiSend } from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';

const TEMPLATES = [
    { id: 1, text: "🚀 We are verifying our channel... Click below to support us!", btn: "Verify & Boost ⚡" },
    { id: 2, text: "👋 Hey everyone! Help us calculate our 'Purity Score'...", btn: "Calculate Purity 📊" },
    { id: 3, text: "🛡️ Official Channel Verification. Please verify your humanity...", btn: "I am Human 🤖" }
];

const ListChannel = ({ activePage, onNavigate }) => {
    const { t } = useTranslation();
    const { addNotification } = useNotification();
    const { post } = useApi();
    const { user, refreshProfile } = useAuth();
    const isVisible = activePage === 'listChannel';

    // State
    const [step, setStep] = useState('input'); // input | preview | templates
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [channelData, setChannelData] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState(1);
    const [startPrice, setStartPrice] = useState(''); // New State for Price

    const style = {
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
    };

    // Auto-resume verification flow if redirected from Profile
    React.useEffect(() => {
        if (isVisible && step === 'input') {
            const pending = sessionStorage.getItem('pendingChannel');
            if (pending) {
                try {
                    const data = JSON.parse(pending);
                    setChannelData(data);
                    setStep('templates'); // Skip preview, go straight to templates
                    sessionStorage.removeItem('pendingChannel'); // Clean up
                } catch (e) {
                    console.error("Failed to parse pending channel", e);
                }
            }
        }
    }, [isVisible, step]);

    const handleFetchPreview = async () => {
        if (!username) return;
        setLoading(true);
        try {
            const data = await post('/channels/preview', {
                username,
                userId: user?.uid || user?.id
            });

            if (data.isListed) {
                addNotification('error', 'This channel is already listed on Credant.');
                return;
            }

            setChannelData(data);
            setStep('preview');
        } catch (error) {
            console.error(error);
            addNotification('error', 'Channel not found or bot cannot access it.');
        } finally {
            setLoading(false);
        }
    };

    const handleListLater = async () => {
        if (!channelData || !user) return;

        // Validation: Start Price Required
        if (!startPrice || parseFloat(startPrice) <= 0) {
            addNotification('warning', 'Please enter a valid Start Price.');
            return;
        }

        setLoading(true);
        try {
            await post('/channels/list-later', {
                channelId: channelData.id,
                userId: user.uid || user.id,
                memberCount: channelData.memberCount,
                startPrice: parseFloat(startPrice) // Send Start Price
            });

            // Refresh Profile to get new channel list
            await refreshProfile();

            addNotification('success', 'Channel listed successfully!');
            onNavigate('profile');

            // Reset state
            setTimeout(() => {
                setStep('input');
                setUsername('');
                setStartPrice(''); // Reset
                setChannelData(null);
            }, 500);

        } catch (error) {
            console.error(error);
            addNotification('error', 'Failed to list channel.');
        } finally {
            setLoading(false);
        }
    };

    const handlePostVerification = async () => {
        if (!channelData || !user) return;

        // Validation: Start Price Required
        if (!startPrice || parseFloat(startPrice) <= 0) {
            addNotification('warning', 'Please enter a valid Start Price.');
            return;
        }

        setLoading(true);
        try {
            await post('/channels/verify-post', {
                channelId: channelData.id,
                userId: user.uid || user.id,
                templateId: selectedTemplate,
                memberCount: channelData.memberCount,
                startPrice: parseFloat(startPrice) // Send Start Price
            });

            // Refresh Profile to get new channel list
            await refreshProfile();

            addNotification('success', 'Verification post sent! Checking audience purity...');
            // Explicitly navigate back to profile to close the overlay
            onNavigate('profile');

            // Reset state
            setTimeout(() => {
                setStep('input');
                setUsername('');
                setStartPrice(''); // Reset
                setChannelData(null);
            }, 500);

        } catch (error) {
            console.error(error);
            addNotification('error', 'Failed to post message. Ensure Bot is Admin.');
        } finally {
            setLoading(false);
        }
    };

    // Derived state for checks
    const checks = channelData?.checks || {};
    // STRICT check: Bot must be Admin AND have Post rights. User must be checking.
    const allChecksPassed = checks.botIsAdmin && checks.botCanPost && checks.userIsAdmin;

    return (
        <div className={styles.page} style={style}>
            <div className={styles.header}>
                <button className={styles.backButton} onClick={() => window.history.back()}>
                    <FiChevronDown size={24} />
                </button>
                <h2 className={styles.title} style={{ color: 'var(--text-main)' }}>
                    {step === 'templates' ? t('listChannel.selectStyle') : (step === 'input' ? t('profile.listChannel') : t('listChannel.title'))}
                </h2>
            </div>

            <div className={styles.content}>
                {step === 'input' && (
                    <>
                        <div className={styles.helperText} style={{ color: 'var(--text-muted)' }}>
                            <strong>{t('listChannel.howTo')}</strong><br />
                            {t('listChannel.step1')}<br />
                            {t('listChannel.step2')}<br />
                            {t('listChannel.step3')}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} style={{ color: 'var(--text-main)' }}>{t('listChannel.usernameLabel')}</label>
                            <input
                                className={styles.input}
                                placeholder="@my_channel"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{ background: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--glass-border)' }}
                            />
                        </div>

                        <button
                            className={styles.submitButton}
                            onClick={handleFetchPreview}
                            disabled={loading}
                        >
                            {loading ? t('listChannel.fetching') : t('listChannel.fetch')}
                        </button>
                    </>
                )}

                {step === 'preview' && channelData && (
                    <>
                        <div className={styles.previewCard} style={{ background: 'var(--bg-card)', borderColor: 'var(--glass-border)' }}>
                            <div className={styles.previewHeader}>
                                <img
                                    src={channelData.photoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                                    alt="Channel"
                                    className={styles.previewImage}
                                />
                                <div className={styles.previewInfo}>
                                    <div className={styles.previewTitle} style={{ color: 'var(--text-main)' }}>{channelData.title}</div>
                                    <div className={styles.previewUsername} style={{ color: 'var(--primary)' }}>@{channelData.username}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {channelData.memberCount} {t('channels.subs')} • {channelData.type}
                                    </div>
                                </div>
                            </div>

                            <div className={`${styles.requirementsBox} ${allChecksPassed ? styles.success : ''}`} style={{ marginTop: '16px' }}>
                                <div className={styles.reqHeader}>
                                    {allChecksPassed ? <FiCheckCircle /> : <FiAlertCircle />}
                                    {allChecksPassed ? t('listChannel.readyVerify') : t('listChannel.requirementsMissing')}
                                </div>
                                <div className={styles.checkList}>
                                    <div className={`${styles.checkItem} ${checks.botIsAdmin ? styles.pass : styles.fail}`}>
                                        {checks.botIsAdmin ? <FiCheckCircle /> : <FiXCircle />} {t('listChannel.botAdmin')}
                                    </div>
                                    <div className={`${styles.checkItem} ${checks.userIsAdmin ? styles.pass : styles.fail}`}>
                                        {checks.userIsAdmin ? <FiCheckCircle /> : <FiXCircle />} {t('listChannel.creator')}
                                    </div>
                                </div>
                            </div>

                            {/* Start Price Input - Only if checks passed */}
                            {allChecksPassed && (
                                <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                                    <label className={styles.label} style={{ color: 'var(--text-main)' }}>{t('profile.startPrice')} (USD)</label>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        placeholder="e.g. 100"
                                        value={startPrice}
                                        onChange={(e) => setStartPrice(e.target.value)}
                                        style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', borderColor: 'var(--primary)' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {allChecksPassed ? (
                                <>
                                    <div style={{ textAlign: 'center', marginBottom: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                        Choose verification method:
                                    </div>
                                    <button className={styles.submitButton} onClick={() => setStep('templates')}>
                                        {t('listChannel.calculateNow')}
                                    </button>
                                    <button
                                        className={styles.secondaryButton}
                                        onClick={handleListLater}
                                        disabled={loading}
                                        style={{ background: 'rgba(128,128,128,0.1)', color: 'var(--text-muted)', border: 'none' }}
                                    >
                                        {loading ? t('common.loading') : t('listChannel.later')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className={styles.submitButton} onClick={handleFetchPreview} disabled={loading}>
                                        {loading ? t('listChannel.fetching') : 'Recheck Requirements'}
                                    </button>
                                    <button className={styles.secondaryButton} onClick={() => setStep('input')}>{t('common.back')}</button>
                                </>
                            )}
                        </div>
                    </>
                )}

                {step === 'templates' && (
                    <>
                        <div className={styles.helperText} style={{ color: 'var(--text-muted)' }}>
                            {t('listChannel.postStyleDesc')}
                        </div>

                        <div className={styles.templateGrid}>
                            {TEMPLATES.map(t => (
                                <div
                                    key={t.id}
                                    className={`${styles.templateCard} ${selectedTemplate === t.id ? styles.selected : ''}`}
                                    onClick={() => setSelectedTemplate(t.id)}
                                    // Should refactor card styles to support theme
                                    style={{
                                        background: selectedTemplate === t.id ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                                        borderColor: selectedTemplate === t.id ? 'var(--primary)' : 'var(--glass-border)',
                                        color: 'var(--text-main)'
                                    }}
                                >
                                    <div className={styles.templateText} style={{ color: 'var(--text-main)' }}>{t.text}</div>
                                    <div className={styles.templateBtnPreview}>{t.btn}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <button className={styles.submitButton} onClick={handlePostVerification} disabled={loading}>
                                {loading ? t('common.loading') : t('listChannel.postVerify')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ListChannel;
