const { SecretClient } = require("@azure/keyvault-secrets");
const {
  DefaultAzureCredential,
  ClientSecretCredential,
} = require("@azure/identity");

function getCredential() {
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;

  if (AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET) {
    return new ClientSecretCredential(
      AZURE_TENANT_ID,
      AZURE_CLIENT_ID,
      AZURE_CLIENT_SECRET
    );
  }

  return new DefaultAzureCredential();
}

function getKeyVaultClient() {
  const { AZURE_KEYVAULT_URL } = process.env;

  if (!AZURE_KEYVAULT_URL) {
    throw new Error("AZURE_KEYVAULT_URL is not configured");
  }

  return new SecretClient(AZURE_KEYVAULT_URL, getCredential());
}

module.exports = { getKeyVaultClient, getCredential };
