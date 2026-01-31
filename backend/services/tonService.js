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

    // 4. Contract Provider
    const contract = client.open(wallet);

    // 5. Check Seqno
    const seqno = await contract.getSeqno();

    // 6. Transfer
    await contract.sendTransfer({
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
    });

    return seqno;
};

module.exports = { createWallet, transferTon };
