# Fiscus

A lightweight personal finance tracker that runs in your browser. Use the Overview, Transactions, and Spending pages to review your balance, search and filter transactions, explore your monthly spending categories, and compare recent cash flow. It defaults to Singapore dollars (SGD), supports Malaysian ringgit (MYR), and uses Singapore time and regional date formatting. Singapore and Malaysia share the UTC+08:00 time zone.

## Run it

Open `index.html` in a modern browser. No build step or dependencies are required.

## Publish it for free

You can host the static site with GitHub Pages:

1. Create a public GitHub repository and upload `index.html`, `styles.css`, and `app.js` (plus this README).
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and the `/ (root)` folder, then save.
4. Open the published URL shown on the Pages settings screen after deployment finishes.

Anyone with the public URL can use the tracker. The source code is also public when the repository is public.

Transactions and the selected currency are saved in each visitor's browser local storage; they are not uploaded to GitHub or a server. Each visitor's data stays separate. It persists on the same browser and site address, but does not sync to another device or browser, and can be removed if browser data is cleared. Export a CSV backup from the dashboard when needed. Changing currency changes how amounts are labelled; it does not convert values using exchange rates.

The layout adapts to phone, tablet, and desktop sizes. The mobile navigation remains available below the Fiscus logo.

## Customize

The currency selector includes SGD, MYR, USD, EUR, GBP, CAD, AUD, and JPY. Income and expense categories are selected based on the transaction type in `app.js`.
