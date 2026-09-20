const { createApp } = Vue;

// Identify the chain from the Esplora genesis hash. Testnet4, testnet3, and
// Signet share address encoding (tb1..., same WIF version), so bitcoinjs-lib's
// `networks.testnet` is used for all of them. Block height cannot distinguish
// them from mainnet: testnet4 and Signet are currently well below mainnet
// height, while testnet3 is far above it.
const NETWORK_BY_GENESIS = {
    '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f': 'mainnet',
    '000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943': 'testnet3',
    '00000000da84f2bafbbc53dee25a72ae507ff4914b867c565be350b0da8bf043': 'testnet4',
    '00000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6': 'signet',
};

const NETWORK_DISPLAY_NAMES = {
    mainnet: 'Mainnet',
    testnet3: 'Testnet3',
    testnet4: 'Testnet4',
    signet: 'Signet',
};

const NETWORK_EXPLORERS = {
    mainnet: 'https://mempool.space/',
    testnet3: 'https://mempool.space/testnet/',
    testnet4: 'https://mempool.space/testnet4/',
    signet: 'https://mempool.space/signet/',
};

createApp({
    data() {
        return {
            // Configuration (non-reactive might be fine, but keeping for simplicity)
            DEFAULT_MAINNET_RPC_ENDPOINT: 'https://blockstream.info/api/',
            DEFAULT_TESTNET_RPC_ENDPOINT: 'https://mempool.space/testnet4/api/',
            DEFAULT_SIGNET_RPC_ENDPOINT: 'https://mempool.space/signet/api/',
            MIN_CONFIRMATIONS: 1,

            // RPC Options for dropdown
            rpcOptions: [
                {
                    value: 'DEFAULT_TESTNET',
                    text: 'Testnet4'
                },
                {
                    value: 'DEFAULT_SIGNET',
                    text: 'Signet'
                },
                {
                    value: 'DEFAULT_MAINNET',
                    text: 'Mainnet'
                },
                {
                    value: 'CUSTOM',
                    text: 'Other...'
                }
            ],

            // State
            network: null, // bitcoinjs-lib network object
            keyPair: null, // bitcoinjs-lib keyPair object
            currentRpcEndpoint: '',
            qrCodeInstance: null,
            networkId: 'testnet4',
            currentWif: '',
            walletSource: 'none', // 'none' | 'wif' | 'passkey'
            isPkVisible: false,
            isPasskeyAvailable: false,
            passkeySupportMessage: '',
            hasSavedPasskey: false,
            walletAddress: 'Not loaded',
            walletBalance: 'N/A',
            lastBalanceRefreshEndpoint: '',
            balanceRequestId: 0,
            balanceRefreshCount: 0,
            balanceUnit: 'BTC',
            isLoading: false,
            isRefreshingBalances: false,
            rpcSwitchId: 0,
            alerts: [], // Array to hold alert messages { message, type, id }

            // Input Models
            privateKeyInput: '',
            pkInputType: 'password', // Added for import field visibility
            rpcEndpointSelectValue: 'DEFAULT_TESTNET',
            rpcEndpointCustomInput: '',
            customRpcUpdateTimer: null,
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
            sessionPanelOpen: false,
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
        shortWalletAddress() {
            const address = this.walletAddress;
            if (!address || address === 'Not loaded' || address.length <= 22) {
                return address;
            }
            return `${address.slice(0, 10)}…${address.slice(-8)}`;
        },
        isWalletLoaded() {
            return this.keyPair !== null;
        },
        isPasskeyWallet() {
            return this.walletSource === 'passkey';
        },
        isTestnet() {
            return this.networkId !== 'mainnet';
        },
        networkName() {
            return NETWORK_DISPLAY_NAMES[this.networkId] || (this.isTestnet ? 'Testnet' : 'Mainnet');
        },
        blockExplorerUrlBase() {
            return NETWORK_EXPLORERS[this.networkId] || (this.isTestnet ? NETWORK_EXPLORERS.testnet4 : NETWORK_EXPLORERS.mainnet);
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
        showAlert(message, type = 'info') {
            const id = Date.now(); // Simple unique ID for keying
            const newAlert = { message, type, id }; // Re-added id
            
            // Clear existing alerts before adding the new one
            this.alerts = []; 
            
            this.alerts.push(newAlert);

            setTimeout(() => {
                this.dismissAlert();
            }, 4000);
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
        resolveSelectedRpc() {
            let selectedRpc = '';
            if (this.rpcEndpointSelectValue === 'DEFAULT_TESTNET') {
                selectedRpc = this.DEFAULT_TESTNET_RPC_ENDPOINT;
            } else if (this.rpcEndpointSelectValue === 'DEFAULT_SIGNET') {
                selectedRpc = this.DEFAULT_SIGNET_RPC_ENDPOINT;
            } else if (this.rpcEndpointSelectValue === 'DEFAULT_MAINNET') {
                selectedRpc = this.DEFAULT_MAINNET_RPC_ENDPOINT;
            } else if (this.rpcEndpointSelectValue === 'CUSTOM') {
                selectedRpc = this.rpcEndpointCustomInput.trim();
            }
            if (selectedRpc && !selectedRpc.endsWith('/')) {
                selectedRpc += '/';
            }
            return selectedRpc;
        },
        updateRpcSelection() {
             if (this.rpcEndpointSelectValue === 'CUSTOM') {
                this.showCustomRpcInput = true;
            } else {
                this.showCustomRpcInput = false;
            }
        },
        onRpcEndpointChange() {
            clearTimeout(this.customRpcUpdateTimer);
            this.updateRpcSelection();
            if (this.rpcEndpointSelectValue === 'CUSTOM') {
                if (!this.rpcEndpointCustomInput) {
                    this.rpcEndpointCustomInput = this.currentRpcEndpoint;
                }
                return;
            }
            this.updateRpcAndNetwork();
        },
        scheduleCustomRpcUpdate() {
            if (this.rpcEndpointSelectValue !== 'CUSTOM') {
                return;
            }
            clearTimeout(this.customRpcUpdateTimer);
            this.customRpcUpdateTimer = setTimeout(() => {
                this.applyCustomRpcIfReady();
            }, 700);
        },
        flushCustomRpcUpdate() {
            if (this.rpcEndpointSelectValue !== 'CUSTOM') {
                return;
            }
            clearTimeout(this.customRpcUpdateTimer);
            this.applyCustomRpcIfReady({ fromBlur: true });
        },
        applyCustomRpcIfReady({ fromBlur = false } = {}) {
            const url = this.rpcEndpointCustomInput.trim();
            if (!url) {
                return;
            }
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                if (fromBlur) {
                    this.showAlert('Invalid RPC URL. Must start with http:// or https://', 'warning');
                }
                return;
            }
            this.updateRpcAndNetwork();
        },
        toggleSessionPanel() {
            this.sessionPanelOpen = !this.sessionPanelOpen;
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
                        if (typeof QRCode === 'undefined' || typeof QRCode.toString !== 'function') {
                            console.error("QRCode library not loaded when trying to generate.");
                            qrCodeElement.textContent = 'Error: QR Code library not loaded.';
                            return;
                        }
                        QRCode.toString('bitcoin:' + this.walletAddress, {
                            type: 'svg',
                            width: 256,
                            margin: 1,
                            errorCorrectionLevel: 'H',
                            color: {
                                dark: '#000000',
                                light: '#ffffff'
                            }
                        }, (err, svg) => {
                            if (err) {
                                console.error("Error generating QR code:", err);
                                qrCodeElement.textContent = 'Error generating QR code.';
                                return;
                            }
                            qrCodeElement.innerHTML = svg;
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
            if (!this.isWalletLoaded) {
                this.sessionPanelOpen = false;
                this.walletAddress = 'Not loaded';
                this.walletBalance = 'N/A';
                this.lastBalanceRefreshEndpoint = '';
                this.currentWif = '';
                this.walletSource = 'none';
                this.isPkVisible = false;
                this.privateKeyInput = ''; // Clear import input
                this.showTxInfo = false;
                this.isRefreshingBalances = false;
                this.balanceRefreshCount = 0;
                // Clear QR code if wallet is cleared and receive tab might be open
                if (this.$refs.qrCodeDiv) {
                    this.generateQrCode();
                }
            } else {
                this.walletAddress = this.getAddress(this.keyPair);
                this.fetchBalance();
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
                this.showAlert(`New ${this.networkName} wallet created. Open Session to copy the private key.`, "success");
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
        async getUtxos({ silent = false } = {}) {
             if (!this.walletAddress || this.walletAddress === 'Not loaded') return [];
            if (!silent) {
                this.showLoading(true);
            }
            try {
                const url = `${this.currentRpcEndpoint}address/${this.walletAddress}/utxo`;
                const response = await axios.get(url, { timeout: 10000 });
                return response.data;
            } catch (error) {
                console.error(`Error fetching UTXOs for ${this.walletAddress}:`, error.response ? error.response.data : error.message);
                this.showAlert(`Failed to fetch UTXOs. Check RPC endpoint and network connection. Error: ${error.message}`, "danger");
                return [];
            } finally {
                if (!silent) {
                    this.showLoading(false);
                }
            }
        },
        async fetchBalance({ silent = false } = {}) {
             if (!this.isWalletLoaded) return;
            if (!silent) {
                this.walletBalance = 'Loading...';
            }
            const requestId = ++this.balanceRequestId;
            const endpoint = this.currentRpcEndpoint;
            const address = this.walletAddress;
            const utxos = await this.getUtxos({ silent });
            if (
                requestId !== this.balanceRequestId
                || !this.isWalletLoaded
                || this.currentRpcEndpoint !== endpoint
                || this.walletAddress !== address
            ) {
                return;
            }
            if (utxos) {
                const confirmedBalance = utxos
                    .filter(utxo => utxo.status.confirmed)
                    .reduce((sum, utxo) => sum + utxo.value, 0);
                this.walletBalance = this.satoshisToBtc(confirmedBalance).toFixed(8);
                this.lastBalanceRefreshEndpoint = endpoint;
            } else {
                this.walletBalance = 'Error';
            }
        },
        isBalanceFreshForCurrentRpc() {
            return this.lastBalanceRefreshEndpoint === this.currentRpcEndpoint
                && this.walletBalance !== 'Loading...'
                && this.walletBalance !== 'N/A'
                && this.walletBalance !== 'Error';
        },
        async refreshBalances({ force = false } = {}) {
            if (!this.isWalletLoaded) {
                return;
            }
            if (this.isRefreshingBalances && !force) {
                return;
            }
            this.balanceRefreshCount += 1;
            this.isRefreshingBalances = true;
            try {
                await this.fetchBalance({ silent: true });
            } finally {
                this.balanceRefreshCount = Math.max(0, this.balanceRefreshCount - 1);
                this.isRefreshingBalances = this.balanceRefreshCount > 0;
            }
        },
        async refreshBalanceAfterNetworkSwitch() {
            if (!this.isWalletLoaded) {
                return;
            }
            if (this.isBalanceFreshForCurrentRpc()) {
                return;
            }
            this.walletBalance = 'Loading...';
            this.lastBalanceRefreshEndpoint = '';
            this.balanceRequestId += 1;
            await this.refreshBalances({ force: true });
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
        // Update RPC & Network Detection
        async updateRpcAndNetwork() {
            const targetRpc = this.resolveSelectedRpc();

            if (!targetRpc) {
                 if (this.rpcEndpointSelectValue === 'CUSTOM') {
                     return;
                 }
                 this.showAlert("RPC Endpoint URL cannot be empty.", "warning");
                 return;
            }
            if (!targetRpc.startsWith('http://') && !targetRpc.startsWith('https://')) {
                 this.showAlert("Invalid RPC URL. Must start with http:// or https://", "warning");
                 return;
            }
            if (targetRpc === this.currentRpcEndpoint) {
                if (this.isWalletLoaded && !this.isBalanceFreshForCurrentRpc()) {
                    this.walletBalance = 'Loading...';
                    await this.refreshBalances({ force: true });
                }
                return;
            }

            const previousBalance = this.walletBalance;
            const previousEndpoint = this.currentRpcEndpoint;
            const switchId = ++this.rpcSwitchId;
            if (this.isWalletLoaded) {
                this.walletBalance = 'Loading...';
                this.lastBalanceRefreshEndpoint = '';
                this.balanceRequestId += 1;
                this.isRefreshingBalances = true;
                await this.$nextTick();
            }

             this.networkStatusText = 'Selected Network: Detecting...';
             this.networkStatusClass = 'network-status text-muted';

            try {
                const genesisUrl = `${targetRpc}block-height/0`;
                const genesisResponse = await axios.get(genesisUrl, { timeout: 10000 });
                if (switchId !== this.rpcSwitchId || this.resolveSelectedRpc() !== targetRpc) {
                    return;
                }
                const genesisHash = String(genesisResponse.data).trim().toLowerCase();
                const detectedNetworkId = NETWORK_BY_GENESIS[genesisHash];

                if (!detectedNetworkId) {
                    throw new Error(`Unknown genesis block ${genesisHash}. Expected mainnet, testnet3, testnet4, or signet.`);
                }

                const detectedNetworkIsTestnet = detectedNetworkId !== 'mainnet';
                const previousNetworkIsTestnet = this.isTestnet;

                // If network changed and wallet exists, clear session WITHOUT confirmation
                if (this.isWalletLoaded && detectedNetworkIsTestnet !== previousNetworkIsTestnet) {
                     this.clearSession(); // Clears wallet state - This will trigger reactive UI updates
                }

                // Update state regardless of whether session was cleared
                this.networkId = detectedNetworkId;
                this.network = detectedNetworkIsTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
                this.currentRpcEndpoint = targetRpc;

                 this.networkStatusText = `Selected Network: ${this.networkName}`;
                 this.networkStatusClass = `network-status ${this.isTestnet ? 'text-info' : 'text-primary'}`; 

                if (this.isWalletLoaded) {
                    await this.refreshBalanceAfterNetworkSwitch();
                }
                
            } catch (error) {
                if (switchId !== this.rpcSwitchId || this.resolveSelectedRpc() !== targetRpc) {
                    return;
                }
                console.error("Error detecting network or updating RPC:", error);
                this.showAlert(`Failed to connect or detect network for ${targetRpc}. Please check the URL and try again. Error: ${error.message}`, "danger");
                 this.networkStatusText = `Selected Network: Detection Failed`;
                 this.networkStatusClass = 'network-status text-danger';
                if (this.isWalletLoaded && this.currentRpcEndpoint === previousEndpoint) {
                    this.walletBalance = previousBalance;
                    this.lastBalanceRefreshEndpoint = previousEndpoint;
                }
            } finally {
                if (switchId === this.rpcSwitchId && this.balanceRefreshCount === 0) {
                    this.isRefreshingBalances = false;
                }
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

        // Initialize state on testnet4 (replaces the old testnet3 default)
        this.networkId = 'testnet4';
        this.network = bitcoin.networks.testnet;
        this.currentRpcEndpoint = this.DEFAULT_TESTNET_RPC_ENDPOINT;
        this.rpcEndpointSelectValue = 'DEFAULT_TESTNET'; 
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
         this.networkStatusClass = `network-status ${this.isTestnet ? 'text-info' : 'text-primary'}`;

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

         const walletTabTrigger = document.getElementById('info-tab');
         if (walletTabTrigger) {
             walletTabTrigger.addEventListener('shown.bs.tab', () => {
                 if (this.isWalletLoaded) {
                    this.refreshBalances();
                 }
             });
         }
    }
}).mount('#app');