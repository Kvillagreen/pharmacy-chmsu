import { CookieService } from 'ngx-cookie-service';
import * as CryptoJS from 'crypto-js';
import { Injectable } from '@angular/core';
import { PrivateData } from './private-data';

@Injectable({
    providedIn: 'root',
})
export class EncryptData {
    privateData = new PrivateData();
    cookieService = new CookieService();

    private getCookieName(key: string): string {
        return this.privateData.generateCustomApiKey(key);
    }

    private getSecretKey(key: string): string {
        return this.privateData.generateCustomApiKey(key);
    }

    private setCookie(name: string, value: string, hours = 2): void {
        const expires = hours / 24;
        this.cookieService.set(name, encodeURIComponent(value), expires, '/', undefined, true, 'Strict');
    }

    private deleteCookie(name: string): void {
        this.cookieService.delete(name, '/');
    }

    encryptAndStoreData(key: string, data: any): void {
        const secretKey = this.getSecretKey(key);
        const cookieName = this.getCookieName(key);

        if (!secretKey) {
            return;
        }

        const payload = JSON.stringify(data);
        const encryptedData = CryptoJS.AES.encrypt(payload, secretKey).toString();

        this.deleteCookie(this.privateData.generateBeforeDate(key));
        this.setCookie(cookieName, encryptedData, 2);
    }

    encryptAndStoreVerifyData(key: string, data: any): string {
        try {
            const secretKey = this.getSecretKey(key);
            if (!secretKey) {
                return '';
            }

            const jsonStr = JSON.stringify(data);
            const encrypted = CryptoJS.AES.encrypt(jsonStr, secretKey).toString();
            this.setCookie(this.getCookieName(key), encrypted, 2);
            return encrypted;
        } catch (err) {
            console.error('Encryption error:', err);
            return '';
        }
    }

    getEncryptedVerifyData(key: string): string | null {
        const cookieName = this.getCookieName(key);
        const cookieValue = this.cookieService.get(cookieName);
        return cookieValue ? decodeURIComponent(cookieValue) : null;
    }

    getUserDataDecryptedVerifyData(encryptedData: string, key = 'encrypt'): any {
        try {
            if (!encryptedData) {
                return null;
            }

            const decryptKey = this.getSecretKey(key);
            const bytes = CryptoJS.AES.decrypt(decodeURIComponent(encryptedData), decryptKey);
            const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);

            return decryptedStr ? JSON.parse(decryptedStr) : null;
        } catch (err) {
            console.error('Decryption error:', err);
            return null;
        }
    }

    logoutDelete(key?: string): void {
        const knownKeys = ['user', 'super_admin', 'web', 'sales', 'data', 'branch', 'encrypt'];

        if (key) {
            this.deleteCookie(this.getCookieName(key));
            return;
        }

        knownKeys.forEach((storedKey) => {
            this.deleteCookie(this.getCookieName(storedKey));
        });
    }

    getQrEncryptedData(): string {
        return this.cookieService.get(this.getCookieName('qr'));
    }

    getUserDataDecryptedData(encryptedData: string): any {
        try {
            if (!encryptedData) {
                return null;
            }

            const secretKey = this.getSecretKey('encrypt');
            const bytes = CryptoJS.AES.decrypt(decodeURIComponent(encryptedData), secretKey);
            const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
            return decryptedStr ? JSON.parse(decryptedStr) : null;
        } catch (err) {
            console.error('Decryption error:', err);
            return null;
        }
    }

    getQrDecryptedData(data: string): any {
        try {
            const bytes = CryptoJS.AES.decrypt(decodeURIComponent(data), this.getSecretKey('qr'));
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            return decryptedData ? JSON.parse(decryptedData) : null;
        } catch (err) {
            console.error('Decryption error:', err);
            return null;
        }
    }

    decryptData(key: string): any {
        const secretKey = this.getSecretKey(key);
        if (!secretKey) {
            return null;
        }

        const cookieName = this.getCookieName(key);
        const encryptedData = this.cookieService.get(cookieName);
        if (!encryptedData) {
            return null;
        }

        try {
            const bytes = CryptoJS.AES.decrypt(decodeURIComponent(encryptedData), secretKey);
            const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
            return decryptedStr ? JSON.parse(decryptedStr) : null;
        } catch (err) {
            console.error('Decryption error:', err);
            return null;
        }
    }
}
