# SIMATIC IOT2050 PID Tuning Application V3

A web-based interface for monitoring and configuring Siemens S7-1200 PLC PIDCompact V2 loops, specifically designed for the **Mitr Phol Pin Mill Plant Gate Valve Control and Monitoring Project**.

This application runs directly on the Siemens SIMATIC IOT2050 edge gateway, communicating with the PLC and displaying a stunning, modern UI on a locally connected monitor via Kiosk mode.

## 🏗 Architecture
- **Hardware:** Siemens SIMATIC IOT2050 (Debian OS) connected to an S7-1200 PLC.
- **Backend:** Node.js using the `nodes7` library for seamless S7 Protocol communication.
- **Frontend:** Vanilla HTML, CSS (Glassmorphism design), and JS. Includes `Chart.js` for real-time trend plotting.
- **Display:** Chromium running in X11 Kiosk mode directly on the IOT2050 display port.

## ✨ Key Features
- **Real-time Trend Graphing:** Live plotting of Setpoint (SP), Process Value (PV), and Control Output %.
- **PID Parameter Configuration:** Read and write Kp, Ti, and Td parameters live to the PLC.
- **Process Simulation:** First-Order Plus Dead Time (FOPDT) simulation model for testing loops offline.
- **Auto-Tune Calculator:** IMC-based PID tuning recommendations based on process characteristics.
- **Performance Dashboard:** Analytics including Current Error, Overshoot, Rise Time, Settling Time, IAE, ISE, and RMSE.
- **Security:** PIN-protected parameter editing lock.
- **Robustness:** Built-in safeguards against Chromium profile corruption and RAM exhaustion on the edge device.

---

## 🚀 Installation & Deployment (IOT2050)

### 1. Preparing the Board
The IOT2050 must have Node.js installed. Due to the limited RAM on the IOT2050, it is **highly recommended** to create a swap file before installing dependencies to prevent `npm` from crashing.

```bash
# Create a 1GB Swap file
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make swap permanent across reboots
echo "/swapfile none swap sw 0 0" >> /etc/fstab
```

### 2. Deploying the Application
1. Transfer this repository to the IOT2050 at `/opt/pid-tuning-app`.
   > ⚠️ **IMPORTANT:** Do NOT copy the `node_modules` folder from Windows to Linux. It contains OS-specific binaries.
2. SSH into the board and install dependencies:
   ```bash
   cd /opt/pid-tuning-app
   rm -rf node_modules
   npm install
   ```

### 3. Kiosk Mode Display Setup (`~/.xinitrc`)
To launch the application automatically in full-screen on the connected monitor, create or edit `~/.xinitrc` for the `root` user:

```bash
#!/bin/bash
xsetroot -cursor_name left_ptr &
xset s off
xset s noblank

# Prevent Chromium "Profile error occurred" dialogs caused by hard power resets
rm -rf ~/.config/chromium/

# Launch Kiosk Mode (Adjust --force-device-scale-factor for screen resolution)
while true; do
  chromium --no-sandbox --disable-dev-shm-usage --no-first-run --password-store=basic --kiosk --disable-infobars --force-device-scale-factor=0.8 http://localhost:3000/splash.html
  sleep 2
done
```
Make the script executable: `chmod +x ~/.xinitrc`

### 4. Emoji Font Support
If UI icons (🔒, 🗑, ⚙) render as empty squares on the Linux monitor, the board is missing emoji fonts.
- **If connected to the internet:**
  ```bash
  apt-get update && apt-get install fonts-noto-color-emoji -y
  ```
- **If offline (Standalone):**
  Download `NotoColorEmoji.ttf`, place it in `public/fonts/`, and ensure `style.css` imports it via `@font-face`.

---

## 💻 Usage

1. **Start the Server:** 
   ```bash
   node server.js
   # Or using PM2 for auto-restart: pm2 start server.js --name "pid-app"
   ```
2. **Connecting to PLC:** Enter the PLC IP Address (e.g., `192.168.1.10`), Rack (0), and Slot (0).
3. **Adding Loops:** Find the correct byte offsets for the PIDCompact DB in TIA Portal and configure them in the "DB Offsets" menu.
4. **Unlocking Parameters:** Click "Locked" in the top right and enter the 4-digit PIN to allow writing parameters back to the PLC.

---
*Developed for Mitr Phol Pin Mill Plant Gate Valve Control and Monitoring Project. By Dream Piyapong.*
