import React, { useState } from 'react';
import Modal from './Modal';
import { useApi } from '../auth/useApi';
import { useNotification } from '../context/NotificationContext';

const WalletActionModal = ({ type, isOpen, onClose, walletAddress }) => {
    // type: 'deposit' | 'withdraw'
    const { post } = useApi();
    const { addNotification } = useNotification();

    const [amount, setAmount] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [depositLink, setDepositLink] = useState(null);

    const handleAction = async () => {
        if (!amount) return;
        setLoading(true);

        try {
            if (type === 'deposit') {
                const res = await post('/wallet/deposit', { amount: amount });
                setDepositLink(res.paymentLink);
                // In a real app, maybe open deep link directly
                // window.open(res.paymentLink, '_blank');
            } else {
                if (!toAddress) {
                    addNotification('error', 'Address required');
                    setLoading(false);
                    return;
                }
                const res = await post('/wallet/withdraw', { amount, toAddress });
                if (res.status === 'success') {
                    addNotification('success', 'Withdrawal Sent!');
                    onClose();
                    setAmount('');
                    setToAddress('');
                } else {
                    addNotification('error', 'Withdrawal failed');
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
        setToAddress('');
        setDepositLink(null);
        setLoading(false);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={reset}
            title={type.charAt(0).toUpperCase() + type.slice(1) + " TON"}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Deposit Result View */}
                {type === 'deposit' && depositLink ? (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ padding: '16px', background: 'white', borderRadius: '12px', margin: '0 auto' }}>
                            {/* Simple QR Code Placeholder or Link Button */}
                            <QRCodePlaceholder />
                        </div>
                        <p style={{ fontSize: '14px', color: '#aaa' }}>Send {amount} TON to your address</p>
                        <a
                            href={depositLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '16px',
                                background: '#3b82f6',
                                borderRadius: '16px',
                                color: 'white',
                                fontWeight: '600',
                                textAlign: 'center',
                                textDecoration: 'none'
                            }}
                        >
                            Open Wallet
                        </a>
                    </div>
                ) : (
                    <>
                        {/* Input Form */}
                        <div>
                            <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>Amount (TON)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.0"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {type === 'withdraw' && (
                            <div>
                                <label style={{ fontSize: '12px', color: '#888', marginBottom: '8px', display: 'block' }}>To Address</label>
                                <input
                                    type="text"
                                    value={toAddress}
                                    onChange={(e) => setToAddress(e.target.value)}
                                    placeholder="EQ..."
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        )}

                        <button
                            onClick={handleAction}
                            disabled={loading || !amount}
                            style={{
                                marginTop: '16px',
                                width: '100%',
                                padding: '16px',
                                background: loading ? '#555' : '#3b82f6',
                                borderRadius: '16px',
                                border: 'none',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Processing...' : (type === 'deposit' ? 'Generate Invoice' : 'Confirm Withdraw')}
                        </button>
                    </>
                )}
            </div>
        </Modal>
    );
};

// Simple visual placeholder for QR
const QRCodePlaceholder = () => (
    <div style={{ width: '150px', height: '150px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#333', fontSize: '12px' }}>QR Code</span>
    </div>
);

export default WalletActionModal;
