// BTC to US dollar display helpers. Loaded as a classic script before app.js.
(function (root) {
    function formatUsdAmount(amount) {
        if (typeof amount !== 'number' || !Number.isFinite(amount)) {
            return '';
        }
        const abs = Math.abs(amount);
        if (abs === 0) {
            return '$0.00';
        }
        if (abs < 0.01) {
            return amount < 0 ? '-<$0.01' : '<$0.01';
        }
        return amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    function parseBtcUsdPrice(data) {
        if (!data || typeof data !== 'object') {
            return null;
        }
        const raw = data.USD != null
            ? data.USD
            : (data.bitcoin && data.bitcoin.usd != null ? data.bitcoin.usd : null);
        const price = typeof raw === 'string' ? Number(raw) : raw;
        if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
            return null;
        }
        return price;
    }

    function fiatBalanceForBtc(btcAmount, pricePerBtc) {
        const btc = typeof btcAmount === 'number' ? btcAmount : Number(btcAmount);
        if (!Number.isFinite(btc) || btc < 0) {
            return '';
        }
        const price = parseBtcUsdPrice({ USD: pricePerBtc });
        if (price == null) {
            return '';
        }
        return formatUsdAmount(btc * price);
    }

    root.BtcUsd = {
        formatUsdAmount,
        parseBtcUsdPrice,
        fiatBalanceForBtc,
    };
})(globalThis);
