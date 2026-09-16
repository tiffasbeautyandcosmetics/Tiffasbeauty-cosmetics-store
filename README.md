# TIFFAS BEAUTY AND COSMETICS

Clean deployment structure for the TIFFAS online storefront.

## Architecture
- Root frontend: GitHub Pages
- `backend/`: Node/Express M-Pesa API for Render
- `render.yaml`: Render Blueprint
- `.github/workflows/pages.yml`: automatic GitHub Pages deployment
- `config.js`: the only frontend setting that needs the Render URL

## GitHub Pages
Open repository Settings → Pages and select **GitHub Actions** as the deployment source if GitHub asks for a source. Pushes to `main` deploy the site automatically.

## Render
Create a Web Service from this repository, or use the Blueprint in `render.yaml`.

Manual settings:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Add these environment variables in Render. Never commit real credentials to GitHub:
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE` = `8049446`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL` = `https://YOUR-RENDER-SERVICE.onrender.com/api/mpesa/callback`
- `MPESA_ENV` = `production`
- `MPESA_TRANSACTION_TYPE` = `CustomerBuyGoodsOnline`

After Render gives you the service URL, edit `config.js` and replace `https://YOUR-BACKEND.onrender.com` with the real Render URL, then commit the change.

## Products
`products.json` currently contains the four sample products from the existing project. Replace it with the complete 498-product catalogue when that source file is available.

## M-Pesa
The backend is configured for the Buy Goods STK flow. If `8049446` is actually a PayBill rather than a Buy Goods Till, the Daraja transaction type and business payload must be changed to the PayBill configuration before taking payments.

## Security
Do not put Safaricom consumer keys, secrets, passkeys, or other credentials in `config.js`, frontend JavaScript, or GitHub. Keep them only in Render environment variables.
