# Azure Key Vault — Node.js API

A simple Express API to **read, write, list, and delete** secrets from Azure Key Vault.

---

## 🔧 Azure Portal Setup (Step-by-Step)

### STEP 1 — Create a Resource Group
1. Go to **portal.azure.com**
2. Search **"Resource groups"** → **+ Create**
3. Fill in:
   - Subscription: your subscription
   - Resource group name: e.g. `rg-keyvault-demo`
   - Region: e.g. `East US`
4. Click **Review + create** → **Create**

---

### STEP 2 — Create a Key Vault
1. Search **"Key vaults"** → **+ Create**
2. Fill in:
   - Resource group: `rg-keyvault-demo`
   - Key vault name: e.g. `kv-myapp-demo` *(globally unique)*
   - Region: same as resource group
   - Pricing tier: **Standard**
3. **Access configuration** tab:
   - Permission model: **Azure role-based access control (RBAC)** ✅
4. Click **Review + create** → **Create**
5. Once deployed, go to the resource and **copy the Vault URI**  
   → `https://kv-myapp-demo.vault.azure.net` — this is your `AZURE_KEYVAULT_URL`

---

### STEP 3 — Create an App Registration (Service Principal)
1. Search **"App registrations"** → **+ New registration**
2. Fill in:
   - Name: e.g. `keyvault-api-app`
   - Supported account types: **Single tenant**
3. Click **Register**
4. On the overview page, copy:
   - **Application (client) ID** → `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → `AZURE_TENANT_ID`

---

### STEP 4 — Create a Client Secret
1. In your App Registration, go to **Certificates & secrets**
2. Click **+ New client secret**
3. Fill in:
   - Description: e.g. `keyvault-api-secret`
   - Expires: 6 months (or your preference)
4. Click **Add**
5. **Copy the secret Value immediately** (it won't show again)  
   → This is your `AZURE_CLIENT_SECRET`

---

### STEP 5 — Assign Key Vault Role to the App
1. Go to your **Key Vault** → **Access control (IAM)**
2. Click **+ Add** → **Add role assignment**
3. Search for and select: **Key Vault Secrets Officer**  
   *(or `Key Vault Secrets User` for read-only)*
4. Click **Next** → Members tab → **+ Select members**
5. Search for your app: `keyvault-api-app` → Select
6. Click **Review + assign** → **Assign**

---

### STEP 6 — Add a Test Secret in the Portal
1. Go to your **Key Vault** → **Secrets**
2. Click **+ Generate/Import**
3. Fill in:
   - Name: `my-first-secret`
   - Secret value: `hello-from-keyvault`
4. Click **Create**

---

## 🚀 Local Setup

```bash
# 1. Clone / use the project
cd keyvault-api

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in all four values

# 4. Start the server
npm start
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/secrets` | List all secret names |
| GET | `/secrets/:name` | Get a secret value |
| POST | `/secrets/:name` | Create / update a secret |
| DELETE | `/secrets/:name` | Soft-delete a secret |

---

## 🧪 Test with curl

```bash
# Health check
curl http://localhost:3000/

# List all secrets
curl http://localhost:3000/secrets

# Get a specific secret
curl http://localhost:3000/secrets/my-first-secret

# Create a new secret
curl -X POST http://localhost:3000/secrets/my-new-secret \
  -H "Content-Type: application/json" \
  -d '{"value": "super-secret-value"}'

# Delete a secret
curl -X DELETE http://localhost:3000/secrets/my-new-secret
```

---

## 🔑 .env Reference

```env
AZURE_KEYVAULT_URL=https://kv-myapp-demo.vault.azure.net
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=your~secret~value~here
PORT=3000
```
