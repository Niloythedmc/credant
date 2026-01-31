import React, { useState } from 'react';
import Modal from './Modal';
import { useApi } from '../auth/useApi';
import { useNotification } from '../context/NotificationContext';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { Address, beginCell } from 'ton-core';
import { useTranslation } from 'react-i18next';

const WalletActionModal = ({ type, isOpen, onClose, walletAddress: internalWalletAddress, balance = 0, onSuccess }) => {
    // type: 'deposit' | 'withdraw'
    const { t } = useTranslation();
    const { post } = useApi();
    const { addNotification } = useNotification();
    const [tonConnectUI] = useTonConnectUI();
    const userFriendlyAddress = useTonAddress(); // Connected wallet address

    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    // Calc max available for withdraw (balance - 0.1 reserved)
    // Ensure we don't show negative
    const maxAvailable = Math.max(0, parseFloat((balance - 0.1).toFixed(4)));

    // Formatter for Modal (Floor to 2 decimals)
    const formatForModal = (val) => {
        const factor = 100;
        return (Math.floor(val * factor) / factor).toFixed(2);
    };

    const handleAction = async () => {
        if (!amount) return;
        setLoading(true);

        try {
            if (type === 'deposit') {
                if (!userFriendlyAddress) {
                    addNotification('warning', 'Please connect wallet first');
                    setLoading(false);
                    return;
                }

                // Parse address and make it NON-BOUNCEABLE
                const address = Address.parse(internalWalletAddress);
                const nonBounceableAddress = address.toString({ bounceable: false });

                // Create Payload with Comment
                const payload = beginCell()
                    .storeUint(0, 32) // OpCode for text comment
                    .storeStringTail(`Credant_Deposit-${Date.now()}`) // Comment text
                    .endCell();

                // Create transaction
                const transaction = {
                    validUntil: Math.floor(Date.now() / 1000) + 600, // 10 min
                    messages: [
                        {
                            address: nonBounceableAddress, // Send TO internal wallet (Non-Bounceable)
                            amount: Math.floor(parseFloat(amount) * 1e9).toString(), // in nanoton
                            payload: payload.toBoc().toString('base64') // Add payload
                        },
                    ],
                };

                try {
                    await tonConnectUI.sendTransaction(transaction);
                    addNotification('success', t('wallet.successSent') + ' Waiting for confirmation...');
                    onClose();
                    // Note: Deposit success takes time on-chain. We can trigger refresh anyway.
                    if (onSuccess) onSuccess();
                } catch (e) {
                    console.error(e);
                    addNotification('error', t('wallet.cancelled'));
                }

            } else {
                // WITHDRAW
                if (!userFriendlyAddress) {
                    addNotification('warning', 'Please connect wallet first');
                    setLoading(false);
                    return;
                }

                const val = parseFloat(amount);
                if (val > maxAvailable) {
                    addNotification('warning', t('wallet.insufficient', { max: formatForModal(maxAvailable) }));
                    setLoading(false);
                    return;
                }

                const res = await post('/wallet/withdraw', {
                    amount,
                    toAddress: userFriendlyAddress // Send TO connected wallet
                });

                if (res.status === 'success') {
                    addNotification('success', t('wallet.successSent'));
                    if (onSuccess) onSuccess();
                    onClose();
                    setAmount('');
                } else {
                    addNotification('error', 'Withdrawal failed'); // Translation missing for generic fail, but okay
                }
            }
        } catch (e) {
            console.error(e);
            addNotification('error', `Failed to ${type}`);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setAmount('');
        setLoading(false);
        onClose();
    };

    // If not connected, show connect button inside modal if they try to interact
    const isConnected = !!userFriendlyAddress;

    const modalTitle = type === 'deposit' ? t('wallet.depositTitle') : t('wallet.withdrawTitle');

    return (
        <Modal
            isOpen={isOpen}
            onClose={reset}
            title={modalTitle}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {!isConnected ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            {t('wallet.connectData', { type: type })}
                        </p>
                        <button
                            onClick={() => tonConnectUI.openModal()}
                            style={{
                                padding: '12px 24px',
                                background: 'var(--primary)',
                                color: 'white',
                                borderRadius: '12px',
                                border: 'none',
                                fontWeight: '600'
                            }}
                        >
                            {t('common.connectWallet')}
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                            {type === 'deposit'
                                ? `${t('wallet.from')}: ${userFriendlyAddress.slice(0, 4)}...${userFriendlyAddress.slice(-4)}`
                                : `${t('wallet.to')}: ${userFriendlyAddress.slice(0, 4)}...${userFriendlyAddress.slice(-4)}`
                            }
                        </div>

                        {/* Balance Display */}
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                            {t('wallet.available')}: <strong style={{ color: 'var(--text-main)' }}>{formatForModal(maxAvailable)} TON</strong>
                            {type === 'withdraw' && (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    {t('wallet.reserve')}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>{t('wallet.amount')}</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.0"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '12px',
                                    color: 'var(--text-main)',
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <button
                            onClick={handleAction}
                            disabled={loading || !amount}
                            style={{
                                marginTop: '16px',
                                width: '100%',
                                padding: '16px',
                                background: loading ? '#555' : 'var(--primary)',
                                borderRadius: '16px',
                                border: 'none',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? t('wallet.processing') : (type === 'deposit' ? t('profile.deposit') : t('profile.withdraw'))}
                        </button>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default WalletActionModal;
