const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

async function getSecrets() {
    // First check if DATABASE_URL is already set in environment variables
    if (process.env.DATABASE_URL) {
        console.log('✅ Using DATABASE_URL from environment variables');
        return;
    }

    console.log('🔄 DATABASE_URL not found in environment, fetching from AWS Secrets Manager...');
    
    try {
        const client = new SecretsManagerClient({
            region: process.env.AWS_REGION || 'us-east-1'
            // No need to specify credentials - will use IAM role when deployed
        });

        const secretName = process.env.AWS_SECRET_NAME || 'course-site/database';
        const response = await client.send(
            new GetSecretValueCommand({
                SecretId: secretName,
            })
        );

        const secrets = JSON.parse(response.SecretString);
        
        if (!secrets.DATABASE_URL) {
            throw new Error('DATABASE_URL not found in secrets');
        }

        // Set environment variables from secrets
        process.env.DATABASE_URL = secrets.DATABASE_URL;
        
        console.log('✅ Successfully loaded DATABASE_URL from AWS Secrets Manager');
    } catch (error) {
        console.error('❌ Error loading secrets from AWS Secrets Manager:', error.message);
        process.exit(1);
    }
}

module.exports = getSecrets;
