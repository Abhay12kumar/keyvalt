const { app } = require("@azure/functions");
const { getKeyVaultClient } = require("./keyvault");

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "",
  handler: async () => ({
    jsonBody: {
      status: "ok",
      vault: process.env.AZURE_KEYVAULT_URL || null,
      message: "Key Vault API is running",
      endpoints: {
        health: "/api",
        credentials: "/api/credentials",
        listSecrets: "/api/secrets",
      },
    },
  }),
});

app.http("credentials", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "credentials",
  handler: async () => {
    try {
      const client = getKeyVaultClient();
      const [tenantId, clientId, clientSecret] = await Promise.all([
        client.getSecret("AZURE-TENANT-ID"),
        client.getSecret("AZURE-CLIENT-ID"),
        client.getSecret("AZURE-CLIENT-SECRET"),
      ]);

      return {
        jsonBody: {
          message: "Secrets retrieved from Azure Key Vault",
          vault: process.env.AZURE_KEYVAULT_URL,
          credentials: {
            tenantId: tenantId.value,
            clientId: clientId.value,
            clientSecret: clientSecret.value,
          },
        },
      };
    } catch (err) {
      return {
        status: 500,
        jsonBody: {
          error: err.message,
          code: err.code,
          hint:
            "Ensure Managed Identity has Key Vault Secrets User role, AZURE_KEYVAULT_URL ends with .vault.azure.net, and secrets AZURE-TENANT-ID, AZURE-CLIENT-ID, AZURE-CLIENT-SECRET exist.",
        },
      };
    }
  },
});

app.http("listSecrets", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "secrets",
  handler: async () => {
    try {
      const client = getKeyVaultClient();
      const names = [];

      for await (const secretProperties of client.listPropertiesOfSecrets()) {
        names.push({
          name: secretProperties.name,
          enabled: secretProperties.enabled,
          createdOn: secretProperties.createdOn,
          updatedOn: secretProperties.updatedOn,
        });
      }

      return { jsonBody: { count: names.length, secrets: names } };
    } catch (err) {
      return {
        status: 500,
        jsonBody: { error: err.message, code: err.code },
      };
    }
  },
});

app.http("getSecret", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "secrets/{name}",
  handler: async (request) => {
    const name = request.params.name;

    try {
      const client = getKeyVaultClient();
      const secret = await client.getSecret(name);

      return {
        jsonBody: {
          name: secret.name,
          value: secret.value,
          version: secret.properties.version,
          enabled: secret.properties.enabled,
          createdOn: secret.properties.createdOn,
        },
      };
    } catch (err) {
      return {
        status: err.statusCode === 404 ? 404 : 500,
        jsonBody: { error: err.message, code: err.code },
      };
    }
  },
});
