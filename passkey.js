/**
 * Passkey wallet helpers using the WebAuthn PRF extension.
 *
 * A discoverable passkey is created with PRF enabled. On each unlock the
 * authenticator evaluates PRF over a fixed salt, and that output is HKDF'd
 * into a secp256k1 private key. The same passkey always yields the same key.
 */
(function (root) {
    const STORAGE_KEY = 'btcwallet.passkeyCredentialId';
    const PRF_SALT_STRING = 'btcwallet:passkey-prf:v1';
    const HKDF_INFO = 'btcwallet:secp256k1-privkey:v1';

    function randomBytes(length) {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return bytes;
    }

    function bufferToBase64Url(buffer) {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function base64UrlToBuffer(value) {
        const padded = value.replace(/-/g, '+').replace(/_/g, '/') +
            '='.repeat((4 - (value.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function toArrayBuffer(view) {
        if (view instanceof ArrayBuffer) {
            return view;
        }
        if (ArrayBuffer.isView(view)) {
            return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
        }
        return new Uint8Array(view).buffer;
    }

    function isSecurePasskeyContext() {
        return Boolean(window.isSecureContext && window.PublicKeyCredential && navigator.credentials);
    }

    function isUserCancellation(error) {
        return error && (error.name === 'NotAllowedError' || error.name === 'AbortError');
    }

    async function getPrfSalt() {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(PRF_SALT_STRING));
    }

    function isValidRpId(hostname) {
        if (!hostname) {
            return false;
        }
        if (hostname === 'localhost') {
            return true;
        }
        if (hostname === '::1' || hostname === '[::1]') {
            return false;
        }
        if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
            return false;
        }
        return hostname.includes('.');
    }

    async function detectSupport() {
        const result = {
            available: false,
            prf: null,
            message: ''
        };

        if (!isSecurePasskeyContext()) {
            result.message = 'Passkeys require HTTPS (or localhost) and a browser with WebAuthn.';
            return result;
        }

        if (!isValidRpId(window.location.hostname)) {
            result.message = 'Passkeys cannot be used on a raw IP address. Open this app at localhost or a domain name.';
            return result;
        }

        result.available = true;

        if (typeof PublicKeyCredential.getClientCapabilities === 'function') {
            try {
                const caps = await PublicKeyCredential.getClientCapabilities();
                if (caps && typeof caps['extension:prf'] === 'boolean') {
                    result.prf = caps['extension:prf'];
                } else if (caps && Array.isArray(caps.extensions)) {
                    result.prf = caps.extensions.includes('prf');
                }
            } catch (error) {
                console.warn('Unable to read WebAuthn client capabilities:', error);
            }
        }

        if (result.prf === false) {
            result.available = false;
            result.message = 'This browser does not support the WebAuthn PRF extension required for passkey wallets.';
        }

        return result;
    }

    function getSavedCredentialId() {
        try {
            return localStorage.getItem(STORAGE_KEY) || '';
        } catch (error) {
            return '';
        }
    }

    function saveCredentialId(credentialId) {
        try {
            if (credentialId) {
                localStorage.setItem(STORAGE_KEY, credentialId);
            }
        } catch (error) {
            console.warn('Unable to persist passkey credential id:', error);
        }
    }

    function clearSavedCredentialId() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn('Unable to clear saved passkey credential id:', error);
        }
    }

    async function derivePrivateKeyBytes(prfOutput) {
        if (!prfOutput) {
            throw new Error('Passkey did not return a PRF result.');
        }

        const masterKey = await crypto.subtle.importKey(
            'raw',
            toArrayBuffer(prfOutput),
            'HKDF',
            false,
            ['deriveBits']
        );

        const bits = await crypto.subtle.deriveBits(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: new Uint8Array(),
                info: new TextEncoder().encode(HKDF_INFO)
            },
            masterKey,
            256
        );

        return new Uint8Array(bits);
    }

    function readPrfResult(credential) {
        if (!credential || typeof credential.getClientExtensionResults !== 'function') {
            return null;
        }
        return credential.getClientExtensionResults()?.prf?.results?.first || null;
    }

    function isPrfEnabled(credential) {
        if (!credential || typeof credential.getClientExtensionResults !== 'function') {
            return false;
        }
        const prf = credential.getClientExtensionResults()?.prf;
        return Boolean(prf && (prf.enabled || prf.results?.first));
    }

    async function evaluatePrf(credentialIdBytes) {
        if (!isValidRpId(window.location.hostname)) {
            throw new Error('Passkeys cannot be used on a raw IP address. Open this app at localhost or a domain name.');
        }
        const salt = await getPrfSalt();
        const publicKey = {
            challenge: randomBytes(32),
            rpId: window.location.hostname,
            userVerification: 'required',
            timeout: 60000,
            extensions: {
                prf: {
                    eval: {
                        first: salt
                    }
                }
            }
        };

        if (credentialIdBytes && credentialIdBytes.byteLength) {
            publicKey.allowCredentials = [
                { type: 'public-key', id: credentialIdBytes }
            ];
        }

        const assertion = await navigator.credentials.get({ publicKey });
        const prfOutput = readPrfResult(assertion);
        if (!prfOutput) {
            throw new Error('This passkey does not support wallet derivation (PRF/hmac-secret). Try a platform passkey in a supported browser.');
        }

        const rawId = assertion.rawId || (typeof assertion.id === 'string' ? base64UrlToBuffer(assertion.id) : null);
        return {
            credentialId: rawId ? bufferToBase64Url(rawId) : (assertion.id || ''),
            prfOutput
        };
    }

    async function createPasskey() {
        if (!isValidRpId(window.location.hostname)) {
            throw new Error('Passkeys cannot be used on a raw IP address. Open this app at localhost or a domain name.');
        }
        const userId = randomBytes(32);
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: randomBytes(32),
                rp: {
                    name: 'Bitcoin Wallet',
                    id: window.location.hostname
                },
                user: {
                    id: userId,
                    name: 'btc-wallet',
                    displayName: 'Bitcoin Wallet'
                },
                pubKeyCredParams: [
                    { type: 'public-key', alg: -7 },
                    { type: 'public-key', alg: -257 }
                ],
                authenticatorSelection: {
                    residentKey: 'required',
                    requireResidentKey: true,
                    userVerification: 'required'
                },
                timeout: 60000,
                attestation: 'none',
                extensions: {
                    prf: {}
                }
            }
        });

        if (!credential) {
            throw new Error('Passkey creation returned no credential.');
        }

        const credentialIdBytes = new Uint8Array(credential.rawId);
        let prfOutput = readPrfResult(credential);
        let credentialId = bufferToBase64Url(credentialIdBytes);

        // Many browsers enable PRF on create but only return the secret from a follow-up get().
        if (!prfOutput) {
            try {
                const evaluated = await evaluatePrf(credentialIdBytes);
                prfOutput = evaluated.prfOutput;
                credentialId = evaluated.credentialId || credentialId;
            } catch (error) {
                if (isUserCancellation(error)) {
                    throw error;
                }
                if (!isPrfEnabled(credential)) {
                    throw new Error('This authenticator did not enable PRF. Passkey wallets need a passkey that supports the PRF extension.');
                }
                throw error;
            }
        }

        return {
            credentialId,
            privateKeyBytes: await derivePrivateKeyBytes(prfOutput)
        };
    }

    async function unlockPasskey(savedCredentialId) {
        let lastError = null;

        if (savedCredentialId) {
            try {
                const evaluated = await evaluatePrf(base64UrlToBuffer(savedCredentialId));
                return {
                    credentialId: evaluated.credentialId || savedCredentialId,
                    privateKeyBytes: await derivePrivateKeyBytes(evaluated.prfOutput)
                };
            } catch (error) {
                if (isUserCancellation(error)) {
                    throw error;
                }
                lastError = error;
            }
        }

        try {
            const evaluated = await evaluatePrf(null);
            return {
                credentialId: evaluated.credentialId,
                privateKeyBytes: await derivePrivateKeyBytes(evaluated.prfOutput)
            };
        } catch (error) {
            if (isUserCancellation(error)) {
                throw error;
            }
            throw lastError || error;
        }
    }

    root.PasskeyWallet = {
        STORAGE_KEY,
        detectSupport,
        getSavedCredentialId,
        saveCredentialId,
        clearSavedCredentialId,
        createPasskey,
        unlockPasskey,
        isUserCancellation,
        isValidRpId,
        bufferToBase64Url,
        base64UrlToBuffer,
        derivePrivateKeyBytes
    };
})(window);
