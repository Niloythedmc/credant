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
        setLoading(true);
        try {
            await post('/channels/list-later', {
                channelId: channelData.id,
                userId: user.uid || user.id
            });

            // Refresh Profile to get new channel list
            await refreshProfile();

            addNotification('success', 'Channel listed successfully!');
            onNavigate('profile');

            // Reset state
            setTimeout(() => {
                setStep('input');
                setUsername('');
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
        setLoading(true);
        try {
            await post('/channels/verify-post', {
                channelId: channelData.id,
                userId: user.uid || user.id,
                templateId: selectedTemplate
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
                <h2 className={styles.title}>
                    {step === 'templates' ? 'Select Post Style' : (step === 'input' ? t('profile.listChannel') : 'Verify Channel')}
                </h2>
            </div>

            <div className={styles.content}>
                {step === 'input' && (
                    <>
                        <div className={styles.helperText}>
                            <strong>How to verify:</strong><br />
                            1. Add our bot <strong>@CredantBot</strong> to your channel as Admin.<br />
                            2. Enter your channel username below.<br />
                            3. We will fetch details and check permissions.
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Channel Username / ID</label>
                            <input
                                className={styles.input}
                                placeholder="@my_channel"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <button
                            className={styles.submitButton}
                            onClick={handleFetchPreview}
                            disabled={loading}
                        >
                            {loading ? 'Fetching Details...' : 'Continue'}
                        </button>
                    </>
                )}

                {step === 'preview' && channelData && (
                    <>
                        <div className={styles.previewCard}>
                            <div className={styles.previewHeader}>
                                <img
                                    src={channelData.photoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                                    alt="Channel"
                                    className={styles.previewImage}
                                />
                                <div className={styles.previewInfo}>
                                    <div className={styles.previewTitle}>{channelData.title}</div>
                                    <div className={styles.previewUsername}>@{channelData.username}</div>
                                </div>
                            </div>

                            <div className={`${styles.requirementsBox} ${allChecksPassed ? styles.success : ''}`} style={{ marginTop: '16px' }}>
                                <div className={styles.reqHeader}>
                                    {allChecksPassed ? <FiCheckCircle /> : <FiAlertCircle />}
                                    {allChecksPassed ? "Ready to Verify" : "Requirements Missing"}
                                </div>
                                <div className={styles.checkList}>
                                    <div className={`${styles.checkItem} ${checks.botIsAdmin ? styles.pass : styles.fail}`}>
                                        {checks.botIsAdmin ? <FiCheckCircle /> : <FiXCircle />} Bot is Admin
                                    </div>
                                    <div className={`${styles.checkItem} ${checks.userIsAdmin ? styles.pass : styles.fail}`}>
                                        {checks.userIsAdmin ? <FiCheckCircle /> : <FiXCircle />} You are Creator
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {allChecksPassed ? (
                                <>
                                    <div style={{ textAlign: 'center', marginBottom: '10px', color: '#aaa', fontSize: '13px' }}>
                                        Choose verification method:
                                    </div>
                                    <button className={styles.submitButton} onClick={() => setStep('templates')}>
                                        Calculate Purity Now (Recommended)
                                    </button>
                                    <button
                                        className={styles.secondaryButton}
                                        onClick={handleListLater}
                                        disabled={loading}
                                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}
                                    >
                                        {loading ? 'Processing...' : 'Later (Skip Verification)'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className={styles.submitButton} onClick={handleFetchPreview} disabled={loading}>
                                        {loading ? 'Rechecking...' : 'Recheck Requirements'}
                                    </button>
                                    <button className={styles.secondaryButton} onClick={() => setStep('input')}>Back</button>
                                </>
                            )}
                        </div>
                    </>
                )}

                {step === 'templates' && (
                    <>
                        <div className={styles.helperText}>
                            Choose a message style to post in your channel. This will verify active users.
                        </div>

                        <div className={styles.templateGrid}>
                            {TEMPLATES.map(t => (
                                <div
                                    key={t.id}
                                    className={`${styles.templateCard} ${selectedTemplate === t.id ? styles.selected : ''}`}
                                    onClick={() => setSelectedTemplate(t.id)}
                                >
                                    <div className={styles.templateText}>{t.text}</div>
                                    <div className={styles.templateBtnPreview}>{t.btn}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <button className={styles.submitButton} onClick={handlePostVerification} disabled={loading}>
                                {loading ? 'Posting...' : 'Post & Verify Channel'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ListChannel;
