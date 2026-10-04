import { describe, expect, it } from 'vitest';
import '../usd-balance.js';

const { formatUsdAmount, parseBtcUsdPrice, fiatBalanceForBtc } = globalThis.BtcUsd;

describe('formatUsdAmount', () => {
    it('formats zero and ordinary balances in USD', () => {
        expect(formatUsdAmount(0)).toBe('$0.00');
        expect(formatUsdAmount(1234.5)).toBe('$1,234.50');
        expect(formatUsdAmount(0.01)).toBe('$0.01');
    });

    it('collapses sub-cent amounts', () => {
        expect(formatUsdAmount(0.009)).toBe('<$0.01');
        expect(formatUsdAmount(0.0006)).toBe('<$0.01');
    });

    it('rejects values that are not finite numbers', () => {
        expect(formatUsdAmount(Number.NaN)).toBe('');
        expect(formatUsdAmount('10')).toBe('');
    });
});

describe('parseBtcUsdPrice', () => {
    it('reads mempool and CoinGecko payloads', () => {
        expect(parseBtcUsdPrice({ USD: 65000 })).toBe(65000);
        expect(parseBtcUsdPrice({ USD: '65000.5' })).toBe(65000.5);
        expect(parseBtcUsdPrice({ bitcoin: { usd: 42000 } })).toBe(42000);
    });

    it('prefers an explicit USD field when both shapes are present', () => {
        expect(parseBtcUsdPrice({ USD: 100, bitcoin: { usd: 5 } })).toBe(100);
    });

    it('rejects missing or non-positive prices', () => {
        expect(parseBtcUsdPrice(null)).toBeNull();
        expect(parseBtcUsdPrice({})).toBeNull();
        expect(parseBtcUsdPrice({ USD: 0 })).toBeNull();
        expect(parseBtcUsdPrice({ USD: -1 })).toBeNull();
        expect(parseBtcUsdPrice({ bitcoin: { usd: 'nope' } })).toBeNull();
    });
});

describe('fiatBalanceForBtc', () => {
    it('converts a numeric BTC balance at the spot price', () => {
        expect(fiatBalanceForBtc('0.50000000', 20000)).toBe('$10,000.00');
        expect(fiatBalanceForBtc(0, 64000)).toBe('$0.00');
        expect(fiatBalanceForBtc(0.00000001, 60000)).toBe('<$0.01');
    });

    it('hides the dollar line until both balance and price are usable', () => {
        expect(fiatBalanceForBtc('Loading...', 64000)).toBe('');
        expect(fiatBalanceForBtc('N/A', 64000)).toBe('');
        expect(fiatBalanceForBtc('Error', 64000)).toBe('');
        expect(fiatBalanceForBtc('1.00000000', null)).toBe('');
    });
});
