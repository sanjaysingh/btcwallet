# 🧡 BTC Wallet

A simple Bitcoin wallet web app for testing and experimentation. Perfect for developers who want to play around with Bitcoin transactions without the complexity.

## ✨ What it does

- Create new Bitcoin wallets, import existing ones, or unlock with a passkey
- Send and receive Bitcoin on Testnet4, Signet, Testnet3, or mainnet
- Get test coins from curated faucets (Testnet4 and Signet recommended)
- Connect to different RPC endpoints (including your own)
- Clean, responsive web interface with dark/light theme
- Copy addresses and private keys with one click

## 🚀 Quick Start

1. **Open the wallet**: Just open `index.html` in your browser (use HTTPS or localhost for passkeys)
2. **Create a wallet**: Click "Create New Wallet", "Create Passkey Wallet", or import an existing private key
3. **Switch networks**: Testnet4 is the default (safe testing). Signet is steadier. Avoid mainnet.
4. **Get test coins**: On the Wallet tab, open a faucet. Your address is copied so you can paste it into the faucet.
5. **Start transacting**: Send and receive Bitcoin

### Test coins (faucets)

Testnet3, Testnet4, and Signet all produce `tb1…` addresses, but they are **different chains**. A faucet must match the RPC you selected or the coins will never show up.

**Best faucets to use from this wallet**

| Network | First try | Backup |
| --- | --- | --- |
| **Testnet4** (default) | [Coinfaucet.eu](https://coinfaucet.eu/en/btc-testnet4/) (captcha, no account) | [mempool.space](https://mempool.space/testnet4/faucet) (GitHub login), [testnet4.anyone.eu.org](https://testnet4.anyone.eu.org/) |
| **Signet** (steady ~10 min blocks) | [signetfaucet.com](https://signetfaucet.com/) (used by Bitcoin Core `getcoins.py`) | [bitcoinsignetfaucet.com](https://bitcoinsignetfaucet.com/), [alt.signetfaucet.com](https://alt.signetfaucet.com/) |
| **Testnet3** (legacy) | [Coinfaucet.eu](https://coinfaucet.eu/en/btc-testnet/) | [bitcoinfaucet.uo1.net](https://bitcoinfaucet.uo1.net/) |

Faucets require a captcha or GitHub login, so this app cannot request coins for you. It copies your address and opens the faucet. Public faucets run dry often — try the next one on the list.

### Can I run a node to earn?

No. Running Bitcoin Core (or any full node) does **not** pay coins, on mainnet or on test networks. A node validates and relays; mining is a separate job that needs hash power.

- **Mining Testnet4** is possible in theory but a poor way to fund this wallet (difficulty games and block storms).
- **Signet** cannot be mined unless you hold the signet challenge key.
- **Regtest** is how you mint coins on demand: `bitcoind -regtest` then `generatetoaddress`. Those coins never leave your machine.
- **Your own faucet** needs a funded test wallet plus a small server such as [kallewoof/bitcoin-faucet](https://github.com/kallewoof/bitcoin-faucet). This GitHub Pages app cannot host one.

You *can* point the wallet at your own Esplora/electrs node via **Other Esplora API…**. That still does not earn coins.

### Passkey wallets

Passkey wallets use the WebAuthn **PRF** extension to derive a Bitcoin key from a device passkey (Face ID, Touch ID, or a synced passkey). The same passkey always unlocks the same wallet. No seed phrase is required, though a WIF backup is still shown for this testing app.

Requirements:

- A secure context (HTTPS or `localhost`)
- Opened on `localhost` or a real domain — raw IP addresses are not valid WebAuthn RP IDs
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
- Use Testnet4 or Signet when experimenting; mainnet is real BTC
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
