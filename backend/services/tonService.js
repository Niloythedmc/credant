const { mnemonicNew, mnemonicToWalletKey } = require("ton-crypto");
const { WalletContractV4, TonClient, internal } = require("ton");
const { tonApiUrl, tonApiKey } = require('../config');

const createWallet = async () => {
    // Generate new mnemonic (24 words)
    const mnemonic = await mnemonicNew();

    // Derive keys
    const keyPair = await mnemonicToWalletKey(mnemonic);

    // Create wallet contract instance (V4R2)
    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey
    });

    const address = wallet.address.toString({ testOnly: false });

    return {
        mnemonic: mnemonic.join(" "),
        address: address,
        publicKey: keyPair.publicKey.toString('hex')
    };
};

// Helper for retry logic
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (fn, retries = 5, delay = 1000) => {
    try {
        return await fn();
    } catch (e) {
        // Retry on 429
        if (
            retries > 0 &&
            (
                (e.response && e.response.status === 429) ||
                (e.message && e.message.includes('429')) ||
                (typeof e.code === 'number' && e.code === 429)
            )
        ) {
            console.warn(`[TON] Rate limited. Retrying in ${delay}ms...`);
            await wait(delay);
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw e;
    }
};

const transferTon = async (mnemonic, toAddress, amount) => {
    // 1. Initialize Client
    const client = new TonClient({
        endpoint: tonApiUrl,
        apiKey: tonApiKey
    });

    // 2. Key Pair
    const keyPair = await mnemonicToWalletKey(mnemonic.split(" "));

    // 3. Wallet Instance
    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey
    });

    // 4. Contract Provider (Wrapped open isn't async but methods are)
    const contract = client.open(wallet);

    // 5. Check Seqno with Retry
    const seqno = await withRetry(() => contract.getSeqno());

    // 6. Transfer with Retry
    await withRetry(() => contract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
            internal({
                to: toAddress,
                value: amount, // "0.1" (string)
                body: "Withdrawal via Credant",
                bounce: false,
            })
        ]
    }));

    return seqno;
};

module.exports = { createWallet, transferTon };
