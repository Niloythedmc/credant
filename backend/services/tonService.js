const { mnemonicNew, mnemonicToWalletKey } = require("ton-crypto");
const { WalletContractV4 } = require("ton");

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

module.exports = { createWallet };
