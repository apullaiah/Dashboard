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
1. Initialize git and push this project folder to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Chittoor Resurvey Monitoring Production Release"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/chittoor-resurvey-monitoring.git
   git push -u origin main
   ```
2. Log into [vercel.com](https://vercel.com) using your GitHub account.
3. Click **"Add New..."** -> **"Project"**.
4. Import your repository `chittoor-resurvey-monitoring`.
5. Leave all settings at default:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: *(leave empty)*
   - **Output Directory**: *(leave empty)*
6. Click **Deploy**.
7. In ~20 seconds, your application will be live at `https://chittoor-resurvey-monitoring.vercel.app` (or your chosen project name).

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
