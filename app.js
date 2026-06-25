require("dotenv").config();
const express = require("express");
const { SecretClient } = require("@azure/keyvault-secrets");
const {
  DefaultAzureCredential,
  ClientSecretCredential,
} = require("@azure/identity");

const isAzure = Boolean(process.env.WEBSITE_SITE_NAME);
const routePrefix = isAzure ? "/api" : "";

const {
  AZURE_KEYVAULT_URL,
  AZURE_TENANT_ID,
  AZURE_CLIENT_ID,
  AZURE_CLIENT_SECRET,
} = process.env;

if (!AZURE_KEYVAULT_URL && !isAzure) {
  console.error("❌  AZURE_KEYVAULT_URL is not set");
  process.exit(1);
}

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
  console.log("🔑  Using DefaultAzureCredential (Managed Identity / Azure CLI)");
}

const client = AZURE_KEYVAULT_URL
  ? new SecretClient(AZURE_KEYVAULT_URL, credential)
  : null;

function createApp() {
  const app = express();
  app.use(express.json());

  const router = express.Router();

  router.get("/", (req, res) => {
    res.json({
      status: "ok",
      vault: AZURE_KEYVAULT_URL || null,
      authMode:
        AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET
          ? "ClientSecretCredential"
          : "DefaultAzureCredential",
      message: "Key Vault API is running",
      endpoints: {
        health: `${routePrefix}/`,
        listSecrets: `${routePrefix}/secrets`,
        getSecret: `${routePrefix}/secrets/:name`,
        testCredentials: `${routePrefix}/credentials`,
      },
    });
  });

  router.get("/credentials", async (req, res) => {
    if (!client) {
      return res
        .status(500)
        .json({ error: "AZURE_KEYVAULT_URL is not configured" });
    }

    try {
      const [tenantId, clientId, clientSecret] = await Promise.all([
        client.getSecret("AZURE-TENANT-ID"),
        client.getSecret("AZURE-CLIENT-ID"),
        client.getSecret("AZURE-CLIENT-SECRET"),
      ]);

      res.json({
        message: "Secrets retrieved from Azure Key Vault",
        vault: AZURE_KEYVAULT_URL,
        credentials: {
          tenantId: tenantId.value,
          clientId: clientId.value,
          clientSecret: clientSecret.value,
        },
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
        code: err.code,
        hint:
          "Ensure the Function App managed identity has Key Vault Secrets User (or Officer) on the vault, and that AZURE-TENANT-ID, AZURE-CLIENT-ID, and AZURE-CLIENT-SECRET exist as secrets.",
      });
    }
  });

  router.get("/secrets", async (req, res) => {
    if (!client) {
      return res
        .status(500)
        .json({ error: "AZURE_KEYVAULT_URL is not configured" });
    }

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

  router.get("/secrets/:name", async (req, res) => {
    if (!client) {
      return res
        .status(500)
        .json({ error: "AZURE_KEYVAULT_URL is not configured" });
    }

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

  router.post("/secrets/:name", async (req, res) => {
    if (!client) {
      return res
        .status(500)
        .json({ error: "AZURE_KEYVAULT_URL is not configured" });
    }

    const { value } = req.body;
    if (!value) {
      return res
        .status(400)
        .json({ error: "`value` field is required in request body" });
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

  router.delete("/secrets/:name", async (req, res) => {
    if (!client) {
      return res
        .status(500)
        .json({ error: "AZURE_KEYVAULT_URL is not configured" });
    }

    try {
      const poller = await client.beginDeleteSecret(req.params.name);
      await poller.pollUntilDone();
      res.json({
        message: `Secret '${req.params.name}' deleted (soft-delete).`,
      });
    } catch (err) {
      const status = err.statusCode === 404 ? 404 : 500;
      res.status(status).json({ error: err.message, code: err.code });
    }
  });

  app.use(routePrefix, router);
  return app;
}

module.exports = { createApp };
