const { createApp } = require("./app");

const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀  Server listening on http://localhost:${PORT}`);
  console.log(`🧪  Test Key Vault: http://localhost:${PORT}/credentials`);
});
