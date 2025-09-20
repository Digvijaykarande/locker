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

// ArrayBuffer -> CryptoJS WordArray
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

// WordArray -> Uint8Array
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

// Encrypt file
export async function encryptFile(file, pin) {
  const buffer = await file.arrayBuffer();
  const wordArray = arrayBufferToWordArray(buffer);
  return CryptoJS.AES.encrypt(wordArray, pin).toString();
}

// Decrypt file -> returns Blob
export function decryptFile(encryptedData, pin, mimeType = "application/octet-stream") {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, pin);
    if (!decrypted || decrypted.sigBytes === 0) {
      throw new Error("Decryption failed (wrong PIN or corrupt data).");
    }
    const u8 = wordArrayToUint8Array(decrypted);
    return new Blob([u8], { type: mimeType });
  } catch (err) {
    throw new Error("Decryption error: " + err.message);
  }
}

// Save encrypted file
export async function saveFile(filename, encryptedData, type) {
  const db = await getDB();
  await db.put("files", { filename, encryptedData, type });
}

// Load all files
export async function loadFiles() {
  const db = await getDB();
  return await db.getAll("files");
}

// Get single file by filename
export async function getFile(filename) {
  const db = await getDB();
  return await db.get("files", filename);
}

// Delete file
export async function deleteFile(filename) {
  const db = await getDB();
  await db.delete("files", filename);
}
