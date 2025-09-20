// src/App.jsx
import { useState, useEffect } from "react";
import { encryptFile, saveFile, loadFiles, getFile, decryptFile } from "./storage";

function App() {
  const [pin, setPin] = useState("");
  const [files, setFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);

  useEffect(() => {
    refreshList();
    // cleanup preview URL on unmount
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  async function refreshList() {
    const all = await loadFiles();
    setFiles(all || []);
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!pin) return alert("Enter PIN first!");
    const encrypted = await encryptFile(file, pin);
    await saveFile(file.name, encrypted, file.type || "application/octet-stream");
    await refreshList();
    e.target.value = null;
  };

  // open and preview (or download) a file
  const handleOpen = async (filename) => {
    const entry = await getFile(filename);
    if (!entry) return alert("File not found");
    // If you prefer, prompt for PIN only when needed:
    const userPin = pin || prompt("Enter PIN to open file:");
    if (!userPin) return alert("PIN required");

    try {
      const blob = decryptFile(entry.encryptedData, userPin, entry.type);
      // create object URL
      const url = URL.createObjectURL(blob);

      // revoke previous preview URL
      if (previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch(e) {}
      }

      setPreviewUrl(url);
      setPreviewType(entry.type);

      // For non-previewable types, open in new tab (downloads or show)
      const isImage = entry.type.startsWith("image/");
      const isVideo = entry.type.startsWith("video/");
      if (!isImage && !isVideo) {
        // open in new tab (browser will download or show depending on type)
        window.open(url, "_blank");
      }
    } catch (err) {
      alert(err.message || "Failed to decrypt file. Wrong PIN?");
    }
  };

  const handleDownload = async (filename) => {
    const entry = await getFile(filename);
    if (!entry) return alert("File not found");
    const userPin = pin || prompt("Enter PIN to download file:");
    if (!userPin) return alert("PIN required");
    try {
      const blob = decryptFile(entry.encryptedData, userPin, entry.type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // revoke after short timeout
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(err.message || "Failed to decrypt file. Wrong PIN?");
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>🔒 Secure Locker (React + Vite)</h2>

      <div style={{ marginBottom: 12 }}>
        <input
          type="password"
          placeholder="Enter PIN (used for encrypt/decrypt)"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input type="file" onChange={handleUpload} />
      </div>

      <h3>Stored Files:</h3>
      <ul>
        {files.map((f) => (
          <li key={f.filename} style={{ marginBottom: 6 }}>
            <strong>{f.filename}</strong> <em>({f.type})</em>{" "}
            <button onClick={() => handleOpen(f.filename)} style={{ marginLeft: 8 }}>Open/Preview</button>
            <button onClick={() => handleDownload(f.filename)} style={{ marginLeft: 6 }}>Download</button>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 20 }}>
        {previewUrl && previewType.startsWith("image/") && (
          <div>
            <h4>Preview (image)</h4>
            <img src={previewUrl} alt="preview" style={{ maxWidth: "80%", height: "auto", border: "1px solid #ccc" }} />
          </div>
        )}

        {previewUrl && previewType.startsWith("video/") && (
          <div>
            <h4>Preview (video)</h4>
            <video src={previewUrl} controls style={{ maxWidth: "80%" }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
