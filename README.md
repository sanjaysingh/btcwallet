# 🧡 BTC Wallet

A simple Bitcoin wallet web app for testing and experimentation. Perfect for developers who want to play around with Bitcoin transactions without the complexity.

## ✨ What it does

- Create new Bitcoin wallets, import existing ones, or unlock with a passkey
- Send and receive Bitcoin on testnet/mainnet
- Connect to different RPC endpoints (including your own)
- Clean, responsive web interface with dark/light theme
- Copy addresses and private keys with one click

## 🚀 Quick Start

1. **Open the wallet**: Just open `index.html` in your browser (use HTTPS or localhost for passkeys)
2. **Create a wallet**: Click "Create New Wallet", "Create Passkey Wallet", or import an existing private key
3. **Switch networks**: Choose testnet for safe testing (recommended!)
4. **Start transacting**: Send and receive Bitcoin

### Passkey wallets

Passkey wallets use the WebAuthn **PRF** extension to derive a Bitcoin key from a device passkey (Face ID, Touch ID, or a synced passkey). The same passkey always unlocks the same wallet. No seed phrase is required, though a WIF backup is still shown for this testing app.

Requirements:

- A secure context (HTTPS or `localhost`)
- A browser/authenticator that supports WebAuthn PRF (Safari 18+, Chrome/Android passkeys, or a compatible security key)
- Windows Hello currently does **not** support PRF

The derived key stays in the current browser session only. The passkey credential ID may be saved locally so Unlock can skip the account picker; use "Forget saved passkey on this device" to remove that hint. Clearing the session does not delete the passkey from your authenticator.

## 📁 Project Structure

```
btcwallet/
├── index.html          # Main wallet interface
├── app.js             # Wallet functionality
├── passkey.js         # Passkey (WebAuthn PRF) wallet helper
├── styles.css         # Custom styling
├── libs/              # Library files
│   ├── buffer-6.0.3.js
│   ├── bitcoinjs-lib-5.2.0.js
│   ├── buffer-shim.js
│   └── buffer.bundle.js
└── package.json       # Build scripts & dependencies
```

## 🛠️ Development Setup

If you want to rebuild the Bitcoin.js bundles:

```bash
npm install
npm run build:buffer    # Builds buffer library to libs/
npm run build:bitcoin   # Builds bitcoinjs library to libs/
```

The build scripts will generate the library files in the `libs/` folder, keeping everything organized.

## ⚠️ Important Notes

- **For testing only** - don't use this for large amounts of real Bitcoin
- Always use testnet when experimenting
- Never share your private keys
- This runs entirely in your browser (no server needed)
- All library dependencies are kept in the `libs/` folder for better organization

## 🔧 Built With

- Bitcoin.js for wallet functionality
- WebAuthn PRF for passkey wallets
- Bootstrap for the UI
- Vue.js for reactivity
- Pure client-side JavaScript (no backend required)

---

**Happy testing!** 🎉
