import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { useAuth } from '../auth/AuthProvider';
import { useTonAddress } from '@tonconnect/ui-react';
import { FiMoon, FiSun, FiGlobe, FiBell, FiShield, FiCreditCard, FiCopy, FiCheck, FiChevronRight, FiUser } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import Modal from '../components/Modal';
// Reusing profile styles or inline. Using inline with CSS vars for theming.

const SettingItem = ({ icon: Icon, label, value, onClick, rightElement, description }) => (
    <div
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            background: 'var(--bg-card)', // Changed to var
            borderRadius: '16px',
            marginBottom: '12px',
            cursor: onClick ? 'pointer' : 'default',
            justifyContent: 'space-between',
            border: '1px solid var(--glass-border)'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {Icon && (
                <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(128,128,128,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)'
                }}>
                    <Icon size={20} />
                </div>
            )}
            <div>
                <div style={{ fontWeight: '500', fontSize: '15px', color: 'var(--text-main)' }}>{label}</div>
                {description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{description}</div>}
            </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {value && <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{value}</span>}
            {rightElement}
            {!rightElement && onClick && <FiChevronRight color="var(--text-muted)" />}
        </div>
    </div>
);

const Toggle = ({ checked, onChange }) => (
    <div
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        style={{
            width: '44px',
            height: '24px',
            background: checked ? 'var(--primary)' : 'rgba(128,128,128,0.3)',
            borderRadius: '12px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.2s',
            direction: 'ltr' // Force LTR for toggle visual
        }}
    >
        <div style={{
            width: '20px',
            height: '20px',
            background: 'white',
            borderRadius: '50%',
            position: 'absolute',
            top: '2px',
            left: checked ? '22px' : '2px',
            transition: 'left 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
    </div>
);



const Setting = ({ activePage, theme, toggleTheme }) => {
    const { t, i18n } = useTranslation();
    const { userProfile } = useAuth();
    const userFriendlyAddress = useTonAddress();
    const [copied, setCopied] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    // Local State for UI Mocks
    const [isPublicProfile, setIsPublicProfile] = useState(true);
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(false);

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'ru', name: 'Русский' },
        { code: 'de', name: 'Deutsch' },
        { code: 'zh', name: '中文' },
        { code: 'ar', name: 'العربية' },
        { code: 'fa', name: 'فارسی' },
        { code: 'hi', name: 'हिन्दी' }
    ];

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        // Handle RTL
        if (['ar', 'fa'].includes(lng)) {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
    };

    // Set initial dir
    useEffect(() => {
        if (['ar', 'fa'].includes(i18n.language)) {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
    }, [i18n.language]);

    const handleCopy = () => {
        if (userFriendlyAddress) {
            navigator.clipboard.writeText(userFriendlyAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <PageContainer id="setting" activePage={activePage}>
            <div style={{
                padding: '20px',
                paddingTop: '80px',
                background: 'var(--bg-dark)', // CSS Variable
                minHeight: '100vh',
                color: 'var(--text-main)', // CSS Variable
                paddingBottom: '100px',
                transition: 'background 0.3s, color 0.3s'
            }}>
                <h1 style={{ marginBottom: '24px', fontSize: '28px' }}>{t('settings.title')}</h1>

                {/* Account Section */}
                <h3 style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '4px' }}>{t('settings.account')}</h3>

                <SettingItem
                    icon={FiUser}
                    label={t('settings.profileVisibility')}
                    description={isPublicProfile ? t('settings.profilePublic') : t('settings.profilePrivate')}
                    rightElement={<Toggle checked={isPublicProfile} onChange={setIsPublicProfile} />}
                />

                <div style={{ position: 'relative' }}>
                    <SettingItem
                        icon={FiGlobe}
                        label={t('settings.language')}
                        value={languages.find(l => l.code === i18n.language)?.name || 'English'}
                        onClick={() => setShowLanguageModal(true)}
                    />
                </div>

                {/* Appearance */}
                <h3 style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', marginTop: '24px', paddingLeft: '4px' }}>{t('settings.appearance')}</h3>
                <SettingItem
                    icon={theme === 'dark' ? FiMoon : FiSun}
                    label={t('settings.theme')}
                    value={theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
                    rightElement={<Toggle checked={theme === 'dark'} onChange={toggleTheme} />}
                />

                {/* Notifications */}
                <h3 style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', marginTop: '24px', paddingLeft: '4px' }}>{t('settings.notifications')}</h3>
                <SettingItem
                    icon={FiBell}
                    label={t('settings.push')}
                    rightElement={<Toggle checked={pushEnabled} onChange={setPushEnabled} />}
                />
                <SettingItem
                    icon={FiBell}
                    label={t('settings.email')}
                    rightElement={<Toggle checked={emailEnabled} onChange={setEmailEnabled} />}
                />


                {/* Security */}
                <h3 style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', marginTop: '24px', paddingLeft: '4px' }}>{t('settings.security')}</h3>
                <SettingItem
                    icon={FiShield}
                    label={t('settings.trust')}
                    value={t('settings.verified')}
                    onClick={() => { }}
                />

                {/* Wallet Info */}
                <h3 style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', marginTop: '24px', paddingLeft: '4px' }}>{t('settings.wallet')}</h3>
                <div style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '16px',
                    padding: '16px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>
                            <FiCreditCard /> {t('settings.connectedWallet')}
                        </div>
                        {userFriendlyAddress && (
                            <div onClick={handleCopy} style={{ cursor: 'pointer', padding: '4px' }}>
                                {copied ? <FiCheck color="#4ade80" /> : <FiCopy color="var(--primary)" />}
                            </div>
                        )}
                    </div>
                    <div style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        wordBreak: 'break-all',
                        fontFamily: 'monospace',
                        lineHeight: '1.4'
                    }}>
                        {userFriendlyAddress || t('settings.notConnected')}
                    </div>
                </div>

                {/* Language Selection Modal */}
                <Modal
                    isOpen={showLanguageModal}
                    onClose={() => setShowLanguageModal(false)}
                    title={t('settings.language')}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {languages.map((lang) => {
                            const isActive = i18n.language === lang.code;
                            return (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        changeLanguage(lang.code);
                                        setShowLanguageModal(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                        border: 'none',
                                        color: isActive ? 'white' : 'var(--text-main)',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '16px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '20px' }}>
                                            {/* Flag emojis based on code */}
                                            {lang.code === 'en' && '🇺🇸'}
                                            {lang.code === 'ru' && '🇷🇺'}
                                            {lang.code === 'de' && '🇩🇪'}
                                            {lang.code === 'zh' && '🇨🇳'}
                                            {lang.code === 'ar' && '🇸🇦'}
                                            {lang.code === 'fa' && '🇮🇷'}
                                            {lang.code === 'hi' && '🇮🇳'}
                                        </span>
                                        {lang.name}
                                    </div>
                                    {isActive && <FiCheck size={20} />}
                                </button>
                            );
                        })}
                    </div>
                </Modal>

            </div>
        </PageContainer>
    );
};

export default Setting;
