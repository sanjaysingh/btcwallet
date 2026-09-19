const { createApp } = Vue;

// Known Esplora chains. Testnet3/4 and Signet share tb1 address encoding, but
// coins live on different ledgers — the RPC (and faucet) must match.
const NETWORKS = {
    testnet4: {
        id: 'testnet4',
        label: 'Testnet4',
        isTestnet: true,
        bitcoinjs: 'testnet',
        rpc: 'https://mempool.space/testnet4/api/',
        explorer: 'https://mempool.space/testnet4/',
        genesis: '00000000da84f2bafbbc53dee25a72ae507ff4914b867c565be350b0da8bf043',
        unit: 'tBTC'
    },
    signet: {
        id: 'signet',
        label: 'Signet',
        isTestnet: true,
        bitcoinjs: 'testnet',
        rpc: 'https://mempool.space/signet/api/',
        explorer: 'https://mempool.space/signet/',
        genesis: '00000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6',
        unit: 'tBTC'
    },
    testnet: {
        id: 'testnet',
        label: 'Testnet3 (legacy)',
        isTestnet: true,
        bitcoinjs: 'testnet',
        rpc: 'https://blockstream.info/testnet/api/',
        explorer: 'https://mempool.space/testnet/',
        genesis: '000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943',
        unit: 'tBTC'
    },
    mainnet: {
        id: 'mainnet',
        label: 'Mainnet',
        isTestnet: false,
        bitcoinjs: 'bitcoin',
        rpc: 'https://blockstream.info/api/',
        explorer: 'https://mempool.space/',
        genesis: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
        unit: 'BTC'
    }
};

const FAUCETS = {
    testnet4: [
        {
            id: 'coinfaucet-t4',
            name: 'Coinfaucet.eu',
            url: 'https://coinfaucet.eu/en/btc-testnet4/',
            requirement: 'Captcha',
            recommended: true,
            notes: 'Best first try. No account. Paste your address and complete the captcha. IP rate-limited; sometimes dry.'
        },
        {
            id: 'mempool-t4',
            name: 'mempool.space Faucet',
            url: 'https://mempool.space/testnet4/faucet',
            requirement: 'GitHub login',
            recommended: false,
            notes: 'Same site as the explorer, so you can watch the payout. Requires a GitHub account as the anti-bot check.'
        },
        {
            id: 'anyone-t4',
            name: 'testnet4.anyone.eu.org',
            url: 'https://testnet4.anyone.eu.org/',
            requirement: 'Community',
            recommended: false,
            notes: 'Independent Testnet4 faucet. Availability depends on donated coins.'
        }
    ],
    signet: [
        {
            id: 'signetfaucet',
            name: 'signetfaucet.com',
            url: 'https://signetfaucet.com/',
            requirement: 'Captcha',
            recommended: true,
            notes: 'Default Signet faucet used by Bitcoin Core’s getcoins.py. Daily limit per IP. Steadiest public test chain.'
        },
        {
            id: 'bitcoinsignetfaucet',
            name: 'Bitcoin Signet Faucet',
            url: 'https://bitcoinsignetfaucet.com/',
            requirement: 'No account',
            recommended: false,
            notes: 'Pays 1,000–10,000 sats. Up to five requests per IP and address per 24 hours. Check /status if a payout is queued.'
        },
        {
            id: 'alt-signet',
            name: 'Alt Signet Faucet',
            url: 'https://alt.signetfaucet.com/',
            requirement: 'Captcha',
            recommended: false,
            notes: 'Backup faucet for default Signet. Recycle unused coins when you are done testing.'
        }
    ],
    testnet: [
        {
            id: 'coinfaucet-t3',
            name: 'Coinfaucet.eu (Testnet3)',
            url: 'https://coinfaucet.eu/en/btc-testnet/',
            requirement: 'Captcha',
            recommended: true,
            notes: 'Testnet3 is deprecated. Use this only if you already have Testnet3 infrastructure.'
        },
        {
            id: 'uo1',
            name: 'bitcoinfaucet.uo1.net',
            url: 'https://bitcoinfaucet.uo1.net/',
            requirement: 'Captcha',
            recommended: false,
            notes: 'Classic Testnet3 faucet. Often paused when fees are high or the pot is empty.'
        }
    ]
};

createApp({
    data() {
        return {
            MIN_CONFIRMATIONS: 1,

            rpcOptions: [
                {
                    value: 'testnet4',
                    text: 'Testnet4 — mempool.space (recommended)'
                },
                {
                    value: 'signet',
                    text: 'Signet — mempool.space (steady blocks)'
                },
                {
                    value: 'testnet',
                    text: 'Testnet3 — Blockstream (legacy)'
                },
                {
                    value: 'mainnet',
                    text: 'Mainnet — Blockstream (real BTC)'
                },
                {
                    value: 'CUSTOM',
                    text: 'Other Esplora API...'
                }
            ],

            // State
            network: null, // bitcoinjs-lib network object
            networkId: 'testnet4',
            keyPair: null, // bitcoinjs-lib keyPair object
            currentRpcEndpoint: '',
            qrCodeInstance: null,
            currentWif: '',
            walletSource: 'none', // 'none' | 'wif' | 'passkey'
            isPkVisible: false,
            isPasskeyAvailable: false,
            passkeySupportMessage: '',
            hasSavedPasskey: false,
            walletAddress: 'Not loaded',
            walletBalance: 'N/A',
            isLoading: false,
            alerts: [], // Array to hold alert messages { message, type, id }

            // Input Models
            privateKeyInput: '',
            pkInputType: 'password', // Added for import field visibility
            rpcEndpointSelectValue: 'testnet4',
            rpcEndpointCustomInput: '',
            customNetworkSelectValue: 'testnet4',
            recipientAddressInput: '',
            sendAmountInput: '',
            feeRateInput: 10, 

            // Transaction Info
            txStatus: '',
            txId: '',
            txLink: '#',
            showTxInfo: false,

            // UI State
            showWalletManagement: true,
            showLoadedWalletDetails: false,
            showCustomRpcInput: false,
            currentTheme: 'light', // Added for theme toggling

            // Network Status Display (Refactored)
            networkStatusText: '',
            networkStatusClass: '',

            // DOM Element Refs (alternative to getElementById)
            // We'll primarily use data binding, but might need refs for things like QR code canvas
        };
    },
    computed: {
        maskedWif() {
            if (!this.currentWif || this.currentWif.length < 10) return '***';
            return `${this.currentWif.substring(0, 6)}...${this.currentWif.substring(this.currentWif.length - 6)}`;
        },
        currentPrivateKeyDisplay() {
             return this.isPkVisible ? this.currentWif : this.maskedWif;
        },
        isWalletLoaded() {
            return this.keyPair !== null;
        },
        isPasskeyWallet() {
            return this.walletSource === 'passkey';
        },
        activeNetwork() {
            return NETWORKS[this.networkId] || NETWORKS.testnet4;
        },
        isTestnet() {
            return this.activeNetwork.isTestnet;
        },
        networkName() {
            return this.activeNetwork.label;
        },
        balanceUnit() {
            return this.activeNetwork.unit;
        },
        blockExplorerUrlBase() {
            return this.activeNetwork.explorer;
        },
        currentFaucets() {
            return FAUCETS[this.networkId] || [];
        },
        showFaucetCard() {
            return this.isTestnet;
        },
        isLegacyTestnet() {
            return this.networkId === 'testnet';
        },
        // Computed property to disable RPC update if selection hasn't changed
        isRpcUpdateDisabled() {
            const selectedRpc = this.resolveSelectedRpc();
            return !selectedRpc || selectedRpc === this.currentRpcEndpoint;
        },
        // Optional: Computed property for theme icon class
        themeIconClass() {
            return this.currentTheme === 'dark' ? 'bi-moon-stars-fill' : 'bi-sun-fill';
        }
    },
    methods: {
        // --- Helper Functions ---
        showLoading(show = true) {
            this.isLoading = show;
        },
        showAlert(message, type = 'info', duration = 4000) {
            const id = Date.now(); // Simple unique ID for keying
            const newAlert = { message, type, id }; // Re-added id
            
            // Clear existing alerts before adding the new one
            this.alerts = []; 
            
            this.alerts.push(newAlert);

            setTimeout(() => {
                this.dismissAlert();
            }, duration);
        },
        dismissAlert() {
             this.alerts = [];
        },
        satoshisToBtc(satoshis) {
            return satoshis / 100_000_000;
        },
        btcToSatoshis(btc) {
            return Math.round(btc * 100_000_000);
        },
        isValidWif(wif) {
            try {
                bitcoin.ECPair.fromWIF(wif, this.network);
                return true;
            } catch (e) {
                return false;
            }
        },
        getAddress(node) {
            if (!node) return null;
            return bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network: this.network }).address;
        },
        getBitcoinjsNetwork(networkId) {
            const preset = NETWORKS[networkId] || NETWORKS.testnet4;
            return preset.bitcoinjs === 'bitcoin' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        },
        normalizeRpcUrl(url) {
            let targetRpc = (url || '').trim();
            if (targetRpc && !targetRpc.endsWith('/')) {
                targetRpc += '/';
            }
            return targetRpc;
        },
        resolveSelectedRpc() {
            if (this.rpcEndpointSelectValue === 'CUSTOM') {
                return this.normalizeRpcUrl(this.rpcEndpointCustomInput);
            }
            const preset = NETWORKS[this.rpcEndpointSelectValue];
            return preset ? preset.rpc : '';
        },
        networkIdFromGenesis(genesisHash) {
            if (!genesisHash) return null;
            const hash = String(genesisHash).trim().toLowerCase();
            return Object.keys(NETWORKS).find((id) => NETWORKS[id].genesis === hash) || null;
        },
        updateRpcSelection() {
             if (this.rpcEndpointSelectValue === 'CUSTOM') {
                this.showCustomRpcInput = true;
            } else {
                this.showCustomRpcInput = false;
            }
        },
        async copyToClipboard(text, successMessage) {
             if (!text) return;
            try {
                await navigator.clipboard.writeText(text);
                this.showAlert(successMessage, "success");
            } catch (err) {
                console.error('Failed to copy:', err);
                this.showAlert("Failed to copy to clipboard.", "warning");
            }
        },
        toggleCurrentPkVisibility() {
            this.isPkVisible = !this.isPkVisible;
        },
        // Added method for import PK field visibility
        togglePkInputVisibility() {
            this.pkInputType = this.pkInputType === 'password' ? 'text' : 'password';
        },

        // --- UI Update Logic (Integrated into Vue's reactivity) ---
        // No explicit updateUI needed. Computed properties and data binding handle most updates.
        // Specific updates like QR code generation happen in relevant methods.

        generateQrCode() {
            this.$nextTick(() => {
                 const qrCodeElement = this.$refs.qrCodeDiv;
                 if (!qrCodeElement) {
                     return; 
                 }
                 qrCodeElement.innerHTML = ''; // Clear previous QR code
                if (this.walletAddress && this.walletAddress !== 'Not loaded') {
                    try {
                        // Ensure QRCode library is available globally when called
                         if (typeof QRCode === 'undefined') {
                            console.error("QRCode library not loaded when trying to generate.");
                             qrCodeElement.textContent = 'Error: QR Code library not loaded.';
                            return;
                        }
                        this.qrCodeInstance = new QRCode(qrCodeElement, {
                            text: 'bitcoin:' + this.walletAddress,
                            width: 256,
                            height: 256,
                            colorDark: "#000000",
                            colorLight: "#ffffff",
                            correctLevel: QRCode.CorrectLevel.H
                        });
                    } catch (e) {
                        console.error("Error generating QR code:", e);
                        qrCodeElement.textContent = 'Error generating QR code.';
                    }
                } else {
                    // Clear if no address (e.g., wallet cleared while tab is open)
                     qrCodeElement.innerHTML = ''; 
                 }
             });
        },
        updateWalletStateUI() {
            // This replaces parts of the old updateUI
            this.showWalletManagement = !this.isWalletLoaded;
            this.showLoadedWalletDetails = this.isWalletLoaded;
            if (this.isWalletLoaded) {
                this.walletAddress = this.getAddress(this.keyPair);
                this.fetchBalance(); 
            } else {
                 this.walletAddress = 'Not loaded';
                 this.walletBalance = 'N/A';
                 this.currentWif = '';
                 this.walletSource = 'none';
                 this.isPkVisible = false;
                 this.privateKeyInput = ''; // Clear import input
                 this.showTxInfo = false;
                 // Clear QR code if wallet is cleared and receive tab might be open
                 if (this.$refs.qrCodeDiv) { 
                     this.generateQrCode(); 
                 }
            }
        },

        // --- Core Wallet Logic ---
        createWallet() {
            try {
                this.keyPair = bitcoin.ECPair.makeRandom({ network: this.network });
                this.currentWif = this.keyPair.toWIF();
                this.walletSource = 'wif';
                this.isPkVisible = false; // Hide the new key by default
                this.updateWalletStateUI();
                this.showAlert(`New ${this.networkName} wallet created! Ensure you copy the Private Key shown below.`, "success");
            } catch (error) {
                console.error("Error creating wallet:", error);
                this.showAlert("Failed to create wallet. Please try again.", "danger");
                this.clearSession();
            }
        },
        loadKeyPairFromPrivateKeyBytes(privateKeyBytes) {
            const privateKey = Buffer.from(privateKeyBytes);
            const keyPair = bitcoin.ECPair.fromPrivateKey(privateKey, { network: this.network });
            this.keyPair = keyPair;
            this.currentWif = keyPair.toWIF();
            this.walletSource = 'passkey';
            this.isPkVisible = false;
        },
        handlePasskeyError(error, fallbackMessage) {
            console.error(error);
            if (typeof PasskeyWallet !== 'undefined' && PasskeyWallet.isUserCancellation(error)) {
                this.showAlert('Passkey request was cancelled.', 'info');
                return;
            }
            this.showAlert(error && error.message ? error.message : fallbackMessage, 'danger');
        },
        async createPasskeyWallet() {
            if (typeof PasskeyWallet === 'undefined') {
                this.showAlert('Passkey support failed to load.', 'danger');
                return;
            }
            if (!this.isPasskeyAvailable) {
                this.showAlert(this.passkeySupportMessage || 'Passkeys are not available in this browser.', 'warning');
                return;
            }
            try {
                const result = await PasskeyWallet.createPasskey();
                this.loadKeyPairFromPrivateKeyBytes(result.privateKeyBytes);
                PasskeyWallet.saveCredentialId(result.credentialId);
                this.hasSavedPasskey = true;
                this.updateWalletStateUI();
                this.showAlert(`Passkey ${this.networkName} wallet created! Use the same passkey to unlock this wallet later.`, 'success');
            } catch (error) {
                this.handlePasskeyError(error, 'Failed to create passkey wallet.');
            }
        },
        async unlockPasskeyWallet() {
            if (typeof PasskeyWallet === 'undefined') {
                this.showAlert('Passkey support failed to load.', 'danger');
                return;
            }
            if (!this.isPasskeyAvailable) {
                this.showAlert(this.passkeySupportMessage || 'Passkeys are not available in this browser.', 'warning');
                return;
            }
            try {
                const savedId = PasskeyWallet.getSavedCredentialId();
                const result = await PasskeyWallet.unlockPasskey(savedId);
                this.loadKeyPairFromPrivateKeyBytes(result.privateKeyBytes);
                if (result.credentialId) {
                    PasskeyWallet.saveCredentialId(result.credentialId);
                    this.hasSavedPasskey = true;
                }
                this.updateWalletStateUI();
                this.showAlert('Passkey wallet unlocked for this session.', 'success');
            } catch (error) {
                this.handlePasskeyError(error, 'Failed to unlock passkey wallet. Create one first, or try a passkey that supports PRF.');
            }
        },
        forgetSavedPasskey() {
            if (typeof PasskeyWallet !== 'undefined') {
                PasskeyWallet.clearSavedCredentialId();
            }
            this.hasSavedPasskey = false;
            this.showAlert('Saved passkey removed from this browser. The authenticator passkey itself was not deleted.', 'info');
        },
        importWallet() {
             const wif = this.privateKeyInput.trim();
             if (!wif) {
                 this.showAlert("Please enter a Private Key (WIF) to import.", "warning");
                 return;
             }
             if (!this.isValidWif(wif)) {
                this.showAlert("Invalid Private Key format (WIF expected).", "danger");
                return;
            }
            try {
                this.keyPair = bitcoin.ECPair.fromWIF(wif, this.network);
                this.currentWif = wif;
                this.walletSource = 'wif';
                this.isPkVisible = false; 
                this.showAlert("Wallet imported successfully for this session!", "success");
                this.privateKeyInput = ''; // Clear input model
                this.updateWalletStateUI();
            } catch (e) {
                console.error("Error importing WIF:", e);
                this.showAlert("Failed to import private key. Please check the format and try again.", "danger");
                this.keyPair = null; // Ensure keyPair is null on failure
                this.walletSource = 'none';
                this.updateWalletStateUI(); // Reset UI
            }
        },
        clearSession() {
            this.keyPair = null;
            this.walletSource = 'none';
            this.updateWalletStateUI(); 
            this.showAlert('Wallet session cleared.', 'info');
        },

        // --- Bitcoin Network Interaction ---
        async getUtxos() {
             if (!this.walletAddress || this.walletAddress === 'Not loaded') return [];
            this.showLoading(true);
            try {
                const url = `${this.currentRpcEndpoint}address/${this.walletAddress}/utxo`;
                const response = await axios.get(url, { timeout: 10000 });
                return response.data;
            } catch (error) {
                console.error(`Error fetching UTXOs for ${this.walletAddress}:`, error.response ? error.response.data : error.message);
                this.showAlert(`Failed to fetch UTXOs. Check RPC endpoint and network connection. Error: ${error.message}`, "danger");
                return [];
            } finally {
                this.showLoading(false);
            }
        },
        async fetchBalance() {
             if (!this.isWalletLoaded) return;
            this.walletBalance = 'Loading...';
            const utxos = await this.getUtxos();
            if (utxos) {
                const confirmedBalance = utxos
                    .filter(utxo => utxo.status.confirmed)
                    .reduce((sum, utxo) => sum + utxo.value, 0);
                this.walletBalance = this.satoshisToBtc(confirmedBalance).toFixed(8);
            } else {
                this.walletBalance = 'Error';
            }
        },
        async broadcastTransaction(txHex) {
            this.showLoading(true);
            this.txStatus = "Broadcasting...";
            this.txId = "";
            this.txLink = "#";
            this.showTxInfo = true;
            try {
                const url = `${this.currentRpcEndpoint}tx`;
                const response = await axios.post(url, txHex, {
                    headers: { 'Content-Type': 'text/plain' },
                    timeout: 10000
                });
                const txid = response.data;
                this.txStatus = "Success!";
                this.txId = txid;
                this.txLink = `${this.blockExplorerUrlBase}tx/${txid}`;
                this.showAlert(`Transaction broadcast successfully! TXID: ${txid}`, "success");
                this.fetchBalance(); // Refresh balance
                return txid;
            } catch (error) {
                const errorMessage = error.response ? await error.response.data : error.message;
                console.error("Error broadcasting transaction:", errorMessage);
                this.txStatus = "Failed";
                this.txId = `Error: ${errorMessage}`;
                this.showAlert(`Transaction broadcast failed: ${errorMessage}`, "danger");
                return null;
            } finally {
                this.showLoading(false);
            }
        },

        // --- Transaction Building ---
        async sendTransaction() {
            if (!this.isWalletLoaded) {
                this.showAlert("No wallet loaded.", "warning");
                return;
            }
            
            const recipient = this.recipientAddressInput.trim();
            const amount = parseFloat(this.sendAmountInput);
            const feeRate = parseInt(this.feeRateInput, 10);

             // Basic validation
             if (!recipient || isNaN(amount) || amount <= 0 || isNaN(feeRate) || feeRate <= 0) {
                 this.showAlert("Please fill in all fields correctly (Recipient Address, positive Amount, positive Fee Rate).", "warning");
                 return;
             }
             try {
                bitcoin.address.toOutputScript(recipient, this.network); // Basic address validation
             } catch (e) {
                 this.showAlert("Invalid recipient Bitcoin address.", "warning");
                 return;
             }
             if (!this.isTestnet) {
                 if (!confirm(`You are about to send ${amount} BTC on MAINNET to ${recipient}.\n\nTHIS IS REAL BITCOIN. Are you absolutely sure?`)) {
                    this.showAlert("Mainnet transaction cancelled.", "info");
                    return;
                 }
             }

            this.showLoading(true);
            this.txStatus = "Preparing Transaction...";
            this.txId = "";
            this.txLink = "#";
            this.showTxInfo = true;

            const amountSatoshis = this.btcToSatoshis(amount);

            try {
                const utxos = await this.getUtxos();
                const spendableUtxos = utxos.filter(utxo => utxo.status.confirmed);

                if (spendableUtxos.length === 0) {
                    this.showAlert("No spendable confirmed UTXOs found.", "warning");
                    this.showLoading(false);
                    return;
                }

                const psbt = new bitcoin.Psbt({ network: this.network });
                let totalInputSatoshis = 0;
                let inputCount = 0;

                const utxoPromises = spendableUtxos.map(async (utxo) => ({
                    hash: utxo.txid,
                    index: utxo.vout,
                    witnessUtxo: {
                        script: Buffer.from(bitcoin.address.toOutputScript(this.walletAddress, this.network)),
                        value: utxo.value,
                    },
                }));
                const processedUtxos = await Promise.all(utxoPromises);

                const selectedUtxos = [];
                let estimatedTxBytes = 10 + (inputCount * 68) + (2 * 31); // Initial estimate for 0 inputs
                let estimatedFee = Math.ceil(estimatedTxBytes * feeRate);

                for (const utxo of processedUtxos) {
                    if (totalInputSatoshis < amountSatoshis + estimatedFee) {
                        selectedUtxos.push(utxo);
                        totalInputSatoshis += utxo.witnessUtxo.value;
                        inputCount++;
                        estimatedTxBytes = 10 + (inputCount * 68) + (2 * 31); // P2WPKH estimate
                        estimatedFee = Math.ceil(estimatedTxBytes * feeRate);
                    } else {
                        break;
                    }
                }

                if (totalInputSatoshis < amountSatoshis + estimatedFee) {
                    this.showAlert(`Insufficient funds. Need ${this.satoshisToBtc(amountSatoshis + estimatedFee).toFixed(8)} BTC (amount + estimated fee), but only have ${this.satoshisToBtc(totalInputSatoshis).toFixed(8)} BTC available in confirmed UTXOs.`, "warning");
                    this.showLoading(false);
                    return;
                }

                selectedUtxos.forEach(utxo => psbt.addInput(utxo));
                psbt.addOutput({
                    address: recipient,
                    value: amountSatoshis,
                });

                const changeAmount = totalInputSatoshis - amountSatoshis - estimatedFee;

                const DUST_THRESHOLD = 546;
                if (changeAmount >= DUST_THRESHOLD) {
                    psbt.addOutput({
                        address: this.walletAddress,
                        value: changeAmount,
                    });
                }

                for (let i = 0; i < inputCount; i++) {
                    psbt.signInput(i, this.keyPair);
                }
                psbt.finalizeAllInputs();

                const txHex = psbt.extractTransaction().toHex();
                this.txStatus = "Signed. Broadcasting...";

                await this.broadcastTransaction(txHex);

            } catch (error) {
                console.error("Error creating or sending transaction:", error);
                this.showAlert(`Transaction failed: ${error.message}`, "danger");
                this.txStatus = "Error";
                this.txId = error.message;
            } finally {
                this.showLoading(false);
            }
        },
        // Theme Toggle Method - Updated
        toggleTheme() {
            this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', this.currentTheme);
        },
        async openFaucet(faucet) {
            if (!faucet || !faucet.url) return;
            if (this.isWalletLoaded) {
                try {
                    await navigator.clipboard.writeText(this.walletAddress);
                    this.showAlert(`Address copied. Paste it into ${faucet.name}. Make sure the faucet is for ${this.networkName}.`, 'success', 7000);
                } catch (err) {
                    console.error('Failed to copy address before opening faucet:', err);
                    this.showAlert('Could not copy the address automatically. Copy it from Wallet Details, then paste it in the faucet.', 'warning', 7000);
                }
            } else {
                this.showAlert('Create or import a wallet first, then come back so we can copy your address into the faucet.', 'warning', 6000);
            }
            window.open(faucet.url, '_blank', 'noopener,noreferrer');
        },
        scrollToFaucets() {
            const tabTrigger = document.getElementById('info-tab');
            if (tabTrigger && typeof bootstrap !== 'undefined') {
                bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
            }
            this.$nextTick(() => {
                const card = this.$refs.faucetCard;
                if (card && typeof card.scrollIntoView === 'function') {
                    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        },
        // Update RPC & Network Detection
        async updateRpcAndNetwork() {
            let intendedNetworkId = null;
            let targetRpc = '';

            if (this.rpcEndpointSelectValue === 'CUSTOM') {
                targetRpc = this.normalizeRpcUrl(this.rpcEndpointCustomInput);
                intendedNetworkId = this.customNetworkSelectValue;
            } else if (NETWORKS[this.rpcEndpointSelectValue]) {
                intendedNetworkId = this.rpcEndpointSelectValue;
                targetRpc = NETWORKS[intendedNetworkId].rpc;
            } else {
                this.showAlert("Invalid RPC selection.", "warning");
                return;
            }

            if (!targetRpc) {
                 this.showAlert("RPC Endpoint URL cannot be empty.", "warning");
                 return;
            }
            if (!targetRpc.startsWith('http://') && !targetRpc.startsWith('https://')) {
                 this.showAlert("Invalid RPC URL. Must start with http:// or https://", "warning");
                 return;
            }

             this.networkStatusText = 'Selected Network: Detecting...';
             this.networkStatusClass = 'form-text text-muted d-block mt-2'; // Default class while detecting
            this.showLoading(true);

            try {
                const heightResponse = await axios.get(`${targetRpc}blocks/tip/height`, { timeout: 10000 });
                const blockHeight = parseInt(heightResponse.data, 10);

                if (isNaN(blockHeight)) {
                    throw new Error('Invalid block height received.');
                }

                let detectedNetworkId = null;
                try {
                    const genesisResponse = await axios.get(`${targetRpc}block-height/0`, { timeout: 10000 });
                    detectedNetworkId = this.networkIdFromGenesis(genesisResponse.data);
                } catch (genesisError) {
                    console.warn('Could not read genesis hash for network detection:', genesisError);
                }

                const nextNetworkId = detectedNetworkId || intendedNetworkId || 'testnet4';
                const previousWasMainnet = this.networkId === 'mainnet';
                const nextIsMainnet = nextNetworkId === 'mainnet';

                // Switching between test chains keeps the same tb1 key; mainnet keys are different.
                if (this.isWalletLoaded && previousWasMainnet !== nextIsMainnet) {
                     this.clearSession();
                }

                this.networkId = nextNetworkId;
                this.network = this.getBitcoinjsNetwork(nextNetworkId);
                this.currentRpcEndpoint = targetRpc;

                const detectionNote = detectedNetworkId ? 'genesis match' : `height ${blockHeight}`;
                if (detectedNetworkId && intendedNetworkId && detectedNetworkId !== intendedNetworkId) {
                    this.showAlert(`This RPC is ${this.networkName}, not ${NETWORKS[intendedNetworkId].label}. Faucets switched to match the chain.`, 'warning', 7000);
                } else {
                    this.showAlert(`RPC Endpoint updated. Network: ${this.networkName}`, "success");
                }
                 this.networkStatusText = `Selected Network: ${this.networkName} (${detectionNote})`;
                 this.networkStatusClass = `form-text d-block mt-2 ${this.isTestnet ? 'text-info' : 'text-primary'}`; 

                if (this.isWalletLoaded) {
                    this.walletAddress = this.getAddress(this.keyPair);
                    this.fetchBalance();
                }
                
            } catch (error) {
                console.error("Error detecting network or updating RPC:", error);
                this.showAlert(`Failed to connect or detect network for ${targetRpc}. Please check the URL and try again. Error: ${error.message}`, "danger");
                 this.networkStatusText = `Selected Network: Detection Failed`;
                 this.networkStatusClass = 'form-text text-danger d-block mt-2';
            } finally {
                 this.showLoading(false);
            }
        },
    },
    // Adding the mounted hook back
    mounted() {
        // Check if libraries are loaded
        if (typeof bitcoin === 'undefined' || typeof axios === 'undefined' || typeof QRCode === 'undefined') {
             console.error("One or more required libraries (BitcoinJS, Axios, QRCode) not loaded!");
            this.showAlert("Critical Error: Required libraries failed to load. Wallet cannot function.", "danger"); 
            return;
        }

        // Initialize state
        this.networkId = 'testnet4';
        this.network = this.getBitcoinjsNetwork('testnet4');
        this.currentRpcEndpoint = NETWORKS.testnet4.rpc;
        this.rpcEndpointSelectValue = 'testnet4'; 
        this.customNetworkSelectValue = 'testnet4';
        this.showCustomRpcInput = false;
        this.hasSavedPasskey = typeof PasskeyWallet !== 'undefined' && Boolean(PasskeyWallet.getSavedCredentialId());
        if (typeof PasskeyWallet !== 'undefined') {
            PasskeyWallet.detectSupport().then((support) => {
                this.isPasskeyAvailable = support.available;
                this.passkeySupportMessage = support.message || '';
            }).catch((error) => {
                console.error('Passkey support detection failed:', error);
                this.isPasskeyAvailable = false;
                this.passkeySupportMessage = 'Unable to detect passkey support in this browser.';
            });
        } else {
            this.passkeySupportMessage = 'Passkey support failed to load.';
        }
        // Initialize theme based on data
        this.currentTheme = 'light'; // Or detect preference
        document.documentElement.setAttribute('data-bs-theme', this.currentTheme);

        // Set initial UI state (replaces updateUI call)
         this.updateWalletStateUI();

         // Set initial network status text
         this.networkStatusText = `Selected Network: ${this.networkName} (Default)`;
         this.networkStatusClass = `form-text d-block mt-2 ${this.isTestnet ? 'text-info' : 'text-primary'}`;

        // Listen for Receive tab being shown to generate QR code
         const receiveTabTrigger = document.getElementById('receive-tab'); // Get the button that triggers the tab
         if (receiveTabTrigger) {
             receiveTabTrigger.addEventListener('shown.bs.tab', event => {
                 if (this.isWalletLoaded) { // Only generate if wallet is loaded
                    this.generateQrCode();
                 }
             });
         } else {
             console.error("Could not find the receive tab trigger element (#receive-tab).");
         }
    }
}).mount('#app');