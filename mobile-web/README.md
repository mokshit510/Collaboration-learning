# PRAMAAN Mobile Web Companion

Phone-first web application enabling frontline mobile credential capture (NFC input and live biometric camera feed) integrated with the PRAMAAN 8-stage verification pipeline.

---

## Capabilities

1. **Stage 3 NFC Input Gate:**
   - Supports hardware Web NFC scanning (`NDEFReader.scan()`) on compatible Android Chrome browsers.
   - Provides 1-tap transmission of genuine and tampered NFC chip payloads with cryptographic integrity hashes (`POST /api/v1/nfc/verify`).
2. **Stage 6 Face Camera Gate:**
   - Real-time front-facing camera viewfinder (`navigator.mediaDevices.getUserMedia`) with oval alignment guideline.
   - Captures high-resolution frame to canvas and transmits base64 JPEG to backend (`POST /api/v1/face/verify`).
   - Includes mobile native camera file-picker fallback (`<input type="file" capture="user">`) and one-tap test biometric likeness options.
3. **Multi-Device Pipeline Sync:**
   - Sends periodic device heartbeats every 1.8 seconds to maintain `phoneConnected` status on the desktop console.
   - Automatically tracks desktop pipeline progression across all 8 stages.
   - Built-in LAN server settings modal to configure workstation IP and target session ID.

---

## Running

```bash
# 1. Install dependencies
npm install

# 2. Start Vite server (bound to 0.0.0.0:5174 for LAN access)
npm run dev

# 3. Build for production
npm run build
```

Open on mobile browser at:
```
http://<YOUR_WORKSTATION_IP>:5174
```
Ensure your mobile device and computer are connected to the same Wi-Fi network.
