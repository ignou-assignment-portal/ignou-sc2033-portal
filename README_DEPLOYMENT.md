# Deployment Guide: IGNOU Study Centre 2033 Web App on GitHub & Vercel

This repository is fully configured for zero-configuration, production-grade deployment to **Vercel** via **GitHub**, using your live **Google Sheets / Google Apps Script Web App** as the cloud database backend.

---

## Architecture Overview

```
┌─────────────────────────────────┐       ┌──────────────────────────────┐       ┌──────────────────────────────┐
│        User Browser             │       │    Vercel Edge / Serverless   │       │   Google Sheets Backend      │
│  (React 19 + Tailwind CSS SPA)  │ ───>  │  - Static Asset CDN          │ ───>  │  - Apps Script Web App       │
│                                 │       │  - Serverless Proxy          │       │  - 597+ Student Admissions   │
│  Counter Desk / Student Portal  │       │    (/api/sheets.js)          │       │  - Intake Register & Ledger  │
└─────────────────────────────────┘       └──────────────────────────────┘       └──────────────────────────────┘
```

1. **Frontend**: Vite React SPA hosted on Vercel's global CDN with instant loading and client-side routing.
2. **Serverless Proxy (`/api/sheets.js`)**: Included in this repo. Proxies queries and mutations to Google Apps Script to eliminate CORS errors and handle Google's HTTP `302` redirects automatically.
3. **Database Backend**: Your deployed Google Apps Script connected to your Google Spreadsheet.

---

## Step 1: Push Project to GitHub

### Option A: Using Git Command Line (Terminal)

Open your terminal in this project's root folder and run:

```bash
# 1. Initialize git repository (if not already initialized)
git init

# 2. Add all files (excluding node_modules and dist via .gitignore)
git add .

# 3. Create initial commit
git commit -m "feat: complete IGNOU SC-2033 deployment configuration for Vercel"

# 4. Rename default branch to main
git branch -M main

# 5. Link to your GitHub repository (replace with your actual GitHub username and repo)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ignou-sc2033-portal.git

# 6. Push to GitHub
git push -u origin main
```

> **Note**: If you haven't created the repository on GitHub yet, go to [github.com/new](https://github.com/new), name it `ignou-sc2033-portal` (Private or Public), and do not initialize with README (since we already have one).

---

## Step 2: Deploy on Vercel

1. **Sign in to Vercel**:
   Go to [vercel.com](https://vercel.com) and log in with your GitHub account.

2. **Import Git Repository**:
   - Click **"Add New..."** $\rightarrow$ **"Project"**.
   - Under *Import Git Repository*, find and select your `ignou-sc2033-portal` repository.
   - Click **"Import"**.

3. **Configure Project Settings**:
   Vercel will automatically detect `Vite` thanks to `vercel.json`:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (or leave default `vite build`)
   - **Output Directory**: `dist` (default)

4. **Add Environment Variables**:
   Under the **"Environment Variables"** section, add the following key-value pairs:

   | Variable Name | Recommended Value | Description |
   | :--- | :--- | :--- |
   | `GOOGLE_APPS_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbwb-LmuQ2TiUQEGmdWKZAKd9jB9hxeIESL4i-F0h-NwSba8BEbdTaqhato_9aWeXlxy/exec` | Used by `/api/sheets.js` proxy |
   | `VITE_GOOGLE_APPS_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbwb-LmuQ2TiUQEGmdWKZAKd9jB9hxeIESL4i-F0h-NwSba8BEbdTaqhato_9aWeXlxy/exec` | Used by frontend client |
   | `VITE_DIRECT_SHEETS` | `false` | `false` uses serverless proxy (recommended); `true` uses direct browser fetch |
   | `VITE_CENTRE_CODE` | `SC-2033` | Study Centre Code |
   | `VITE_COORDINATOR_NAME` | `Dr. Sant Kumar Gupta` | Coordinator Name |
   | `VITE_COORDINATOR_PHONE`| `9436013686` | Coordinator Contact |

5. **Deploy**:
   - Click **"Deploy"**.
   - Vercel will build and deploy your application in ~45 seconds.
   - You will receive a production URL such as `https://ignou-sc2033-portal.vercel.app`.

---

## Step 3: Verify Google Apps Script Web App Permissions

Ensure your Google Apps Script has the necessary execution settings:

1. Open your Google Sheet and click **Extensions** $\rightarrow$ **Apps Script**.
2. Click **Deploy** $\rightarrow$ **Manage deployments**.
3. Verify the deployment configuration:
   - **Execute as**: `Me (your Google email)`
   - **Who has access**: `Anyone` *(Crucial: if set to "Only myself", Vercel and students will get 401/403 authorization errors)*.
4. If you make any changes to the Apps Script code in the future:
   - Click **Deploy** $\rightarrow$ **New deployment**.
   - Select type **Web app**.
   - Choose **New version** and click **Deploy**.

---

## Step 4: Verify Deployment Functionality

Once deployed on Vercel:

1. **Universal Search Verification**:
   - Open your deployed Vercel URL.
   - Test the **Registration Status Search** on the home page with an enrollment number (e.g. `2401850814`).
   - Confirm it instantly displays the student's admission record from the live Google Sheet.
2. **Counter Desk Intake**:
   - Log into the Desk Counter (PIN: `1001` or Admin PIN: `2033`).
   - Type an enrollment number to verify student profile auto-fill.
   - Submit an intake and verify that the stamped receipt is issued and synced.
3. **Data Sync Monitor**:
   - Click **Sync Monitor** (or Settings $\rightarrow$ Data Sync Monitor).
   - Verify latency indicator displays **Connected (Green)** with round-trip latency.

---

## Step 5: Optional Custom Domain Setup

To use a custom domain (e.g., `ignousc2033.org` or `ignou.sdjaingirlscollege.com`):

1. Go to your project on Vercel $\rightarrow$ **Settings** $\rightarrow$ **Domains**.
2. Enter your domain name and click **Add**.
3. Add the provided `CNAME` or `A` records in your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.).
4. Vercel automatically provisions and renews a free **SSL certificate** via Let's Encrypt.
