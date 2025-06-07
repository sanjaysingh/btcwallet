# 🧡 BTC Wallet

A simple Bitcoin wallet web app for testing and experimentation. Perfect for developers who want to play around with Bitcoin transactions without the complexity.

## ✨ What it does

- Create new Bitcoin wallets or import existing ones
- Send and receive Bitcoin on testnet/mainnet
- Connect to different RPC endpoints (including your own)
- Clean, responsive web interface with dark/light theme
- Copy addresses and private keys with one click

## 🚀 Quick Start

1. **Open the wallet**: Just open `index.html` in your browser
2. **Create a wallet**: Click "Create New Wallet" or import an existing private key
3. **Switch networks**: Choose testnet for safe testing (recommended!)
4. **Start transacting**: Send and receive Bitcoin

## 📁 Project Structure

```
btcwallet/
├── index.html          # Main wallet interface
├── app.js             # Wallet functionality 
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
- Bootstrap for the UI
- Vue.js for reactivity
- Pure client-side JavaScript (no backend required)

---

**Happy testing!** 🎉
