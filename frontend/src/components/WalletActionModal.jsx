import React, { useState } from 'react';
import Modal from './Modal';
import { useApi } from '../auth/useApi';
import { useNotification } from '../context/NotificationContext';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { Address, beginCell } from 'ton-core';

const WalletActionModal = ({ type, isOpen, onClose, walletAddress: internalWalletAddress, balance = 0, onSuccess }) => {
    // type: 'deposit' | 'withdraw'
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
                    addNotification('success', 'Transaction Sent! Waiting for confirmation...');
                    onClose();
                    // Note: Deposit success takes time on-chain. We can trigger refresh anyway.
                    if (onSuccess) onSuccess();
                } catch (e) {
                    console.error(e);
                    addNotification('error', 'Transaction cancelled or failed');
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
                    addNotification('warning', `Insufficient funds. Max withdrawable: ${formatForModal(maxAvailable)} TON`);
                    setLoading(false);
                    return;
                }

                const res = await post('/wallet/withdraw', {
                    amount,
                    toAddress: userFriendlyAddress // Send TO connected wallet
                });

                if (res.status === 'success') {
                    addNotification('success', 'Withdrawal Sent!');
                    if (onSuccess) onSuccess();
                    onClose();
                    setAmount('');
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
        setLoading(false);
        onClose();
    };

    // If not connected, show connect button inside modal if they try to interact
    const isConnected = !!userFriendlyAddress;

    return (
        <Modal
            isOpen={isOpen}
            onClose={reset}
            title={type.charAt(0).toUpperCase() + type.slice(1) + " TON"}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {!isConnected ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <p style={{ color: '#aaa', marginBottom: '20px' }}>Connect your wallet to {type}</p>
                        <button
                            onClick={() => tonConnectUI.openModal()}
                            style={{
                                padding: '12px 24px',
                                background: '#3b82f6',
                                color: 'white',
                                borderRadius: '12px',
                                border: 'none',
                                fontWeight: '600'
                            }}
                        >
                            Connect Wallet
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                            {type === 'deposit' ? `From: ${userFriendlyAddress.slice(0, 4)}...${userFriendlyAddress.slice(-4)}` : `To: ${userFriendlyAddress.slice(0, 4)}...${userFriendlyAddress.slice(-4)}`}
                        </div>

                        {/* Balance Display */}
                        <div style={{ textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
                            Available: <strong>{formatForModal(maxAvailable)} TON</strong>
                            {type === 'withdraw' && (
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    (Reserve: 0.1 TON for fees)
                                </div>
                            )}
                        </div>

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
                            {loading ? 'Processing...' : (type === 'deposit' ? 'Sign & Pay' : 'Confirm Withdraw')}
                        </button>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default WalletActionModal;
