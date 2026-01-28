const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();
const { serviceAccount } = require('../config');

// Project ID from config
const projectId = serviceAccount.project_id;

const saveSecret = async (secretId, payload) => {
    try {
        const parent = `projects/${projectId}`;

        // 1. Create Secret (if not exists)
        try {
            await client.createSecret({
                parent,
                secretId,
                secret: {
                    replication: {
                        automatic: {},
                    },
                },
            });
        } catch (e) {
            // Ignore if already exists
            if (e.code !== 6) console.log("Secret likely exists, adding version.");
        }

        // 2. Add Secret Version
        const [version] = await client.addSecretVersion({
            parent: `projects/${projectId}/secrets/${secretId}`,
            payload: {
                data: Buffer.from(payload, 'utf8'),
            },
        });

        return version.name;
    } catch (error) {
        console.error("Secret Manager Error:", error);
        throw error;
    }
};

const getSecret = async (secretId) => {
    try {
        const [version] = await client.accessSecretVersion({
            name: `projects/${projectId}/secrets/${secretId}/versions/latest`,
        });
        return version.payload.data.toString();
    } catch (error) {
        console.error("Access Secret Error:", error);
        throw error;
    }
}

module.exports = { saveSecret, getSecret };
