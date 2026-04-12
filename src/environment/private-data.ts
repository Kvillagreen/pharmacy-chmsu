// private-data.ts
import * as CryptoJS from 'crypto-js';

export class PrivateData {

    generateCustomApiKey(variableKey: string): string {
        const monthAbbreviations = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
        const currentDate = new Date();
        const monthInitial = monthAbbreviations[currentDate.getMonth()];
        const variableKeyInitial = variableKey.charAt(0).toUpperCase();
        const dateString = currentDate.toISOString().split('T')[0];
        const hashedDate = CryptoJS.SHA256(dateString).toString(CryptoJS.enc.Hex);
        const uuidLikeHash = `${hashedDate.substring(0, 8)}-${hashedDate.substring(8, 12)}-${hashedDate.substring(12, 16)}-${hashedDate.substring(16, 20)}-${hashedDate.substring(20, 32)}`;
        return `_${monthInitial}${variableKeyInitial}RX-${uuidLikeHash}`;
    }

    generateBeforeDate(variableKey: string): string {
        const monthAbbreviations = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        const monthInitial = monthAbbreviations[currentDate.getMonth()];
        const variableKeyInitial = variableKey.charAt(0).toUpperCase();
        const dateString = currentDate.toISOString().split('T')[0];
        const hashedDate = CryptoJS.SHA256(dateString).toString(CryptoJS.enc.Hex);
        const uuidLikeHash = `${hashedDate.substring(0, 8)}-${hashedDate.substring(8, 12)}-${hashedDate.substring(12, 16)}-${hashedDate.substring(16, 20)}-${hashedDate.substring(20, 32)}`;
        return `_${monthInitial}${variableKeyInitial}RX-${uuidLikeHash}`;
    }
}
