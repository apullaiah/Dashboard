## Security & Access Control

The dashboard is configured for **Direct Open Access** (no officer PIN or password prompt is required to view the monitoring data).

### Disabling Vercel Password / Deployment Protection
If visitors to your Vercel link (`*.vercel.app`) see a password screen from Vercel:
1. Log in to [vercel.com](https://vercel.com) and open your project.
2. Go to **Settings** → **Deployment Protection**.
3. Under **Password Protection**, turn the toggle to **Disabled** (or clear the password).
4. Under **Vercel Authentication**, ensure it is set to **Disabled**.
5. Click **Save**. Your Vercel link will now open immediately for anyone without requiring a password.

---

## 1. Deploy on Vercel (Recommended for Public Officer Access)

Vercel provides free, high-speed worldwide cloud hosting with automatic HTTPS and zero maintenance.

### Option A: Via GitHub (Fastest & Auto-updates)
1. Push code to your connected GitHub repository:
   ```bash
   git add .
   git commit -m "feat: add WhatsApp poor performing village notices from AD Chittoor and Vercel webhook updates"
   git push origin main
   ```
2. Vercel automatically detects the push to `main` on [https://github.com/apullaiah/Dashboard](https://github.com/apullaiah/Dashboard) and redeploys the updated build in ~20 seconds.
3. Access your Vercel project dashboard at:
   [https://vercel.com/apullaiah/dashboard](https://vercel.com/apullaiah/dashboard)
4. Your live application is accessible at:
   [https://chittor-resurvey-dashboard.vercel.app](https://chittor-resurvey-dashboard.vercel.app)

### Option B: Direct Terminal Deploy via Vercel CLI
1. Open PowerShell or Command Prompt in this folder.
2. Run:
   ```bash
   npx vercel
   ```
3. Log in when prompted, accept the default settings, and Vercel will generate your live production link immediately.
4. For production release:
   ```bash
   npx vercel --prod
   ```

---

## 2. Deploy on Render.com / Railway / Docker
The repository includes preconfigured `render.yaml`, `Dockerfile`, and `Procfile`:
* **Render**: Connect the GitHub repo to Render as a "Web Service" using Node.js runtime, start command `node server.js`.
* **Docker**: Build and run anywhere (e.g. NIC MeghRaj, DigitalOcean, AWS):
  ```bash
  docker build -t chittoor-resurvey .
  docker run -p 4173:4173 chittoor-resurvey
  ```

---

## 3. Run Locally or on District Collectorate LAN
To run directly inside the Collectorate or district office network:
1. Double-click **`run-server.bat`** (or run `node server.js`).
2. Officers on the same office Wi-Fi / LAN network can access the dashboard directly at:
   ```
   http://10.101.85.247:4173
   ```
   *(or substitute your machine's local IP address)*

---

## 4. WhatsApp Cloud API & Webhook Configuration (Vercel)

### A. Vercel Environment Variables
Under your project settings in [vercel.com](https://vercel.com) -> **Settings** -> **Environment Variables**, add the following keys:

| Environment Variable | Description | Example / Recommended Value |
|----------------------|-------------|-----------------------------|
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Phone Number ID from WhatsApp Getting Started | `109283746592019` |
| `WHATSAPP_ACCESS_TOKEN` | System User Permanent Access Token with `whatsapp_business_messaging` permissions | `EAAG...` |
| `WHATSAPP_VERIFY_TOKEN` | Verification token for Meta Webhook challenge | `CTR_RESURVEY_WA_2026` |
| `WHATSAPP_WABA_ID` | WhatsApp Business Account ID | `293847561029384` |
| `WHATSAPP_SENDER_NAME` | Official sender designation displayed on notices | `AD, Chittoor` |

*(Note: You can also update these directly in the dashboard UI under the **WhatsApp Webhook** tab).*

### B. Meta Developer Portal Webhook Settings
1. Open [developers.facebook.com](https://developers.facebook.com) -> Your WhatsApp App -> **WhatsApp** -> **Configuration**.
2. Click **Edit** under **Webhook**:
   - **Callback URL**: `https://chittor-resurvey-dashboard.vercel.app/api/whatsapp/webhook`
   - **Verify Token**: `CTR_RESURVEY_WA_2026`
3. Click **Verify and save**. Meta will verify the URL immediately with HTTP 200.
4. Under **Webhook fields**, click **Manage** and subscribe to **`messages`**.

### C. Sending Poor Performing Village Notices to Concerned VS
- In the Web Dashboard: Open the **WhatsApp Webhook** tab -> review the **🚨 Poor Performing Villages & VS Progress Broadcast (AD, Chittoor)** section -> Click **"⚡ Broadcast Notices to All Concerned VS (AD, Chittoor)"** or click **"Send Notice"** for an individual village.
- Via CLI script:
  ```bash
  node scripts/send_poor_villages_notices.js
  ```
  *(Or with `--dry-run` to preview all 322 notices safely before sending).*

