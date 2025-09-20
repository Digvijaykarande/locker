// src/storage.js
import { openDB } from "idb";
import CryptoJS from "crypto-js";

// Open IndexedDB
export async function getDB() {
  return openDB("SecureVault", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "filename" });
      }
    },
  });
}

// Helper: ArrayBuffer -> CryptoJS WordArray
function arrayBufferToWordArray(ab) {
  const u8 = new Uint8Array(ab);
  const words = [];
  for (let i = 0; i < u8.length; i += 4) {
    words.push(
      (u8[i] << 24) |
      ((u8[i + 1] || 0) << 16) |
      ((u8[i + 2] || 0) << 8) |
      (u8[i + 3] || 0)
    );
  }
  return CryptoJS.lib.WordArray.create(words, u8.length);
}

// Helper: CryptoJS WordArray -> Uint8Array
function wordArrayToUint8Array(wordArray) {
  const { words, sigBytes } = wordArray;
  const u8 = new Uint8Array(sigBytes);
  let idx = 0;
  for (let i = 0; i < words.length; i++) {
    let w = words[i];
    u8[idx++] = (w >>> 24) & 0xff; if (idx >= sigBytes) break;
    u8[idx++] = (w >>> 16) & 0xff; if (idx >= sigBytes) break;
    u8[idx++] = (w >>> 8) & 0xff;  if (idx >= sigBytes) break;
    u8[idx++] = w & 0xff;          if (idx >= sigBytes) break;
  }
  return u8;
}

// Encrypt file (returns base64 string)
export async function encryptFile(file, pin) {
  const buffer = await file.arrayBuffer();
  const wordArray = arrayBufferToWordArray(buffer);
  // AES encrypt returns a CipherParams object; toString() gives base64 by default
  const encrypted = CryptoJS.AES.encrypt(wordArray, pin).toString();
  return encrypted;
}

// Decrypt encryptedData (base64 string) with pin -> returns Blob
export function decryptFile(encryptedData, pin, mimeType = "application/octet-stream") {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, pin);
    // If the password is wrong, decrypted.sigBytes may be 0 or content will be garbage
    if (!decrypted || decrypted.sigBytes === 0) {
      throw new Error("Decryption failed (wrong PIN or corrupt data).");
    }
    const u8 = wordArrayToUint8Array(decrypted);
    return new Blob([u8], { type: mimeType });
  } catch (err) {
    throw new Error("Decryption error: " + err.message);
  }
}

// Save encrypted file to DB
export async function saveFile(filename, encryptedData, type) {
  const db = await getDB();
  await db.put("files", { filename, encryptedData, type });
}

// Load metadata for all files
export async function loadFiles() {
  const db = await getDB();
  return await db.getAll("files"); // each item: { filename, encryptedData, type }
}

// Get a single file entry from DB by filename
export async function getFile(filename) {
  const db = await getDB();
  return await db.get("files", filename); // returns object or undefined
}
