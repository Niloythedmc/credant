# Credant: Escrow-Backed Ads Marketplace for Telegram

**Live Demo:** https://t.me/CredantBot
**Backend API:** https://credant-production.up.railway.app/api/

## 🚀 Overview
Credant is a high-performance MVP for a Telegram ads marketplace. It connects advertisers with channel owners through a secure, TON-based escrow system.

### Key Features
- **Custodial Wallets:** Unique TON V4R2 wallets generated for every user.
- **Secure Escrow:** Funds are held in ad-specific wallets and only released after 24h verification.
- **Auto-Posting:** Verified ads are automatically published via the Credant Bot.
- **Channel Purity Score:** Real-time stats verification using average views and "Humanity Checks."

## 🏗️ Architecture & Key Decisions
- **Frontend:** React (TWA) hosted on Firebase for instant loading and native feel.
- **Backend:** Node.js hosted on Railway, managing complex escrow logic and Telegram API interactions.
- **Database:** Firestore for real-time deal tracking and social feed updates.
- **TON Integration:** Fresh wallet creation per ad to ensure maximum isolation and security of funds.

## 🛠️ Installation & Deployment
### Frontend (Firebase)
1. `npm install`
2. `npm run build`
3. `firebase deploy`

### Backend (Railway)
1. Install Railway CLI.
2. `railway up --service credant`

## 🤖 AI Usage Disclosure
- **AI-Generated Code:** 90%
- **Tools Used:** Antigravity
- **Human Contribution:** Architecture design, security logic review, TON wallet integration strategy, and deployment orchestration.

## ⚠️ Known Limitations & Future Thoughts
- **Current Limitation:** Scraping `t.me/s/` is fragile; future versions will migrate to official Telegram Power Info APIs.
- **Future:** Implement a "Reputation DAO" where users can review on channel and Ads quality to improve the Purity Score and trust. Add Budget feature to increase budget on any campaign, unlock fund - option to unlock unused funds from campaign. Google translate - for auto translate any text, review, decription etc.
