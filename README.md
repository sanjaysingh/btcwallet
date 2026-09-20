# 🧡 BTC Wallet

A simple Bitcoin wallet web app for testing and experimentation. Perfect for developers who want to play around with Bitcoin transactions without the complexity.

## ✨ What it does

- Create new Bitcoin wallets, import a WIF key, or open a passkey wallet
- Send and receive Bitcoin on testnet4, Signet, or mainnet
- Connect to different RPC endpoints (including your own)
- Clean, responsive web interface with dark/light theme
- Copy addresses and private keys with one click

## 🚀 Quick Start

1. **Open the wallet**: Just open `index.html` in your browser (use HTTPS or localhost for passkeys)
2. **Create a wallet**: On the Wallet tab, choose **Private key** or **Passkey**, or import an existing WIF key
3. **Switch networks**: Choose testnet4, Signet, or mainnet from the Network row — the RPC updates immediately. Other… reveals a custom Esplora URL that applies as you type.
4. **Start transacting**: Send and receive Bitcoin

### Passkey wallets

Passkey wallets use the WebAuthn **PRF** extension to derive a Bitcoin key from a device passkey (Face ID, Touch ID, or a synced passkey). The same passkey always unlocks the same wallet. No seed phrase is required, though a WIF backup is still shown for this testing app.

Requirements:

- A secure context (HTTPS or `localhost`)
- Opened on `localhost` or a real domain — raw IP addresses are not valid WebAuthn RP IDs
- A browser/authenticator that supports WebAuthn PRF (Safari 18+, Chrome/Android passkeys, or a compatible security key)
- Windows Hello currently does **not** support PRF

The derived key stays in the current browser session only. Use **Import passkey** to restore the same wallet later. Clearing the session does not delete the passkey from your authenticator.

## 📁 Project Structure

Browser libraries are vendored in `libs/` and pinned in `libs/manifest.json`. The deployed app loads those files locally (no npm/CDN for Vue, Axios, Bootstrap, QRCode, Buffer, or bitcoinjs-lib). To bump a library, change its `version` in the manifest and run `npm run vendor`. Full inventory, exceptions, and the upgrade plan: [`libs/README.md`](libs/README.md).

<!-- vendor-libs:begin -->
```
libs/
├── axios-1.20.0.min.js
├── bitcoinjs-lib-5.2.1.js
├── bootstrap-5.3.8.bundle.min.js
├── bootstrap-5.3.8.min.css
├── bootstrap-icons-1.13.1.min.css
├── buffer-6.0.3.js
├── fonts/bootstrap-icons.woff
├── fonts/bootstrap-icons.woff2
├── qrcode-1.5.4.min.js
└── vue-3.5.43-vue.global.prod.min.js
```
<!-- vendor-libs:end -->

## 🛠️ Development Setup

```bash
npm install
npm test
npm run vendor          # refresh libs/ from the pins in libs/manifest.json
```

## ⚠️ Important Notes

- **For testing only** - don't use this for large amounts of real Bitcoin
- Always use testnet4 or Signet when experimenting
- The default Esplora RPC is [mempool.space testnet4](https://mempool.space/testnet4/api/). Signet is available as a preset ([mempool.space signet](https://mempool.space/signet/api/)). Testnet3 is still recognized if you enter a custom Esplora URL for that chain.
- Never share your private keys
- This runs entirely in your browser (no server needed)
- No CDN UI libraries — Vue, Axios, Bootstrap, icons, QRCode, Buffer, and bitcoinjs-lib are stored in `libs/`

## 🔧 Built With

- Bitcoin.js <!-- vendor-version:bitcoinjs-lib -->5.2.1<!-- /vendor-version:bitcoinjs-lib --> for wallet functionality
- WebAuthn PRF for passkey wallets
- Bootstrap <!-- vendor-version:bootstrap -->5.3.8<!-- /vendor-version:bootstrap --> for the UI
- Vue.js <!-- vendor-version:vue -->3.5.43<!-- /vendor-version:vue --> for reactivity
- Axios <!-- vendor-version:axios -->1.20.0<!-- /vendor-version:axios --> for Esplora RPC
- QR Codes: qrcode <!-- vendor-version:qrcode -->1.5.4<!-- /vendor-version:qrcode --> (soldair/node-qrcode)
- Icons: Bootstrap Icons <!-- vendor-version:bootstrap-icons -->1.13.1<!-- /vendor-version:bootstrap-icons -->
- Pure client-side JavaScript (no backend required)

---

**Happy testing!** 🎉
