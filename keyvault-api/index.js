require("dotenv").config();
const express = require("express");
const { SecretClient } = require("@azure/keyvault-secrets");
const {
  DefaultAzureCredential,
  ClientSecretCredential,
} = require("@azure/identity");

const app = express();
app.use(express.json());

// ── Validate required env vars ────────────────────────────────────────────────
const {
  AZURE_KEYVAULT_URL,
  AZURE_TENANT_ID,
  AZURE_CLIENT_ID,
  AZURE_CLIENT_SECRET,
} = process.env;

if (!AZURE_KEYVAULT_URL) {
  console.error("❌  AZURE_KEYVAULT_URL is not set in .env");
  process.exit(1);
}

// ── Build credential ──────────────────────────────────────────────────────────
// If Service Principal vars are present, use them explicitly.
// Otherwise fall back to DefaultAzureCredential (Managed Identity / Azure CLI / etc.)
let credential;
if (AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET) {
  credential = new ClientSecretCredential(
    AZURE_TENANT_ID,
    AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET
  );
  console.log("🔑  Using ClientSecretCredential (Service Principal)");
} else {
  credential = new DefaultAzureCredential();
  console.log("🔑  Using DefaultAzureCredential");
}

const client = new SecretClient(AZURE_KEYVAULT_URL, credential);

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    vault: AZURE_KEYVAULT_URL,
    message: "Key Vault API is running",
  });
});

/**
 * GET /secrets
 * List all secret names (not values) in the vault.
 */
app.get("/secrets", async (req, res) => {
  try {
    const names = [];
    for await (const secretProperties of client.listPropertiesOfSecrets()) {
      names.push({
        name: secretProperties.name,
        enabled: secretProperties.enabled,
        createdOn: secretProperties.createdOn,
        updatedOn: secretProperties.updatedOn,
      });
    }
    res.json({ count: names.length, secrets: names });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.code });
  }
});

/**
 * GET /secrets/:name
 * Retrieve the value of a specific secret.
 */
app.get("/secrets/:name", async (req, res) => {
  try {
    const secret = await client.getSecret(req.params.name);
    res.json({
      name: secret.name,
      value: secret.value,
      version: secret.properties.version,
      enabled: secret.properties.enabled,
      createdOn: secret.properties.createdOn,
    });
  } catch (err) {
    const status = err.statusCode === 404 ? 404 : 500;
    res.status(status).json({ error: err.message, code: err.code });
  }
});

/**
 * POST /secrets/:name
 * Create or update a secret.
 * Body: { "value": "my-secret-value" }
 */
app.post("/secrets/:name", async (req, res) => {
  const { value } = req.body;
  if (!value) {
    return res.status(400).json({ error: '`value` field is required in request body' });
  }
  try {
    const secret = await client.setSecret(req.params.name, value);
    res.status(201).json({
      message: "Secret created/updated successfully",
      name: secret.name,
      version: secret.properties.version,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.code });
  }
});

/**
 * DELETE /secrets/:name
 * Soft-delete a secret.
 */
app.delete("/secrets/:name", async (req, res) => {
  try {
    const poller = await client.beginDeleteSecret(req.params.name);
    await poller.pollUntilDone();
    res.json({ message: `Secret '${req.params.name}' deleted (soft-delete).` });
  } catch (err) {
    const status = err.statusCode === 404 ? 404 : 500;
    res.status(status).json({ error: err.message, code: err.code });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀  Server listening on http://localhost:${PORT}`);
  console.log(`📦  Vault URL: ${AZURE_KEYVAULT_URL}`);
});
