# RAPT Deployment Guide

This guide covers deploying RAPT to Vercel with Supabase as the database backend.

## Prerequisites

- GitHub repository: https://github.com/ryanyatwork-ctrl/RAPT
- Vercel account connected to GitHub
- Supabase project with PostgreSQL database
- Stripe account with live API keys
- Manus OAuth credentials (if using Manus auth)

## Step 1: Prepare Supabase Database

### Create Database Connection String

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings → Database → Connection String**
4. Copy the **PostgreSQL** connection string (URI format)
5. Replace `[YOUR-PASSWORD]` with your database password

Example format:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
```

### Run Migrations

1. Clone the RAPT repository locally:
   ```bash
   git clone https://github.com/ryanyatwork-ctrl/RAPT.git
   cd RAPT
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set environment variables:
   ```bash
   export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
   ```

4. Run Drizzle migrations:
   ```bash
   pnpm drizzle-kit migrate
   ```

5. Verify tables were created in Supabase:
   - Go to Supabase → SQL Editor
   - Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

## Step 2: Deploy to Vercel

### Connect GitHub Repository

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click **Add New → Project**
3. Select **Import Git Repository**
4. Search for and select `ryanyatwork-ctrl/RAPT`
5. Click **Import**

### Configure Environment Variables

1. In Vercel, go to **Settings → Environment Variables**
2. Add all required variables (see `.env.example` for complete list):

   **Database:**
   - `DATABASE_URL`: Your Supabase connection string

   **Authentication:**
   - `JWT_SECRET`: Random 32-character string (generate with `openssl rand -hex 16`)
   - `VITE_APP_ID`: Your Manus OAuth app ID
   - `OAUTH_SERVER_URL`: Manus OAuth server URL
   - `VITE_OAUTH_PORTAL_URL`: Manus OAuth portal URL
   - `OWNER_OPEN_ID`: Your Manus user ID
   - `OWNER_NAME`: Your name

   **Stripe:**
   - `STRIPE_SECRET_KEY`: Your Stripe live secret key
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret
   - `VITE_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key

   **Manus APIs:**
   - `BUILT_IN_FORGE_API_URL`: Manus API URL
   - `BUILT_IN_FORGE_API_KEY`: Manus API key
   - `VITE_FRONTEND_FORGE_API_URL`: Manus frontend API URL
   - `VITE_FRONTEND_FORGE_API_KEY`: Manus frontend API key

3. Click **Save**

### Deploy

1. Click **Deploy**
2. Wait for build to complete (typically 2-5 minutes)
3. Once deployed, you'll get a live URL: `https://rapt-[random].vercel.app`

## Step 3: Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → Webhooks**
3. Click **Add Endpoint**
4. Enter your Vercel URL: `https://rapt-[random].vercel.app/api/stripe/webhook`
5. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
6. Click **Add Endpoint**
7. Copy the **Signing Secret** and add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 4: Custom Domain (Optional)

1. In Vercel, go to **Settings → Domains**
2. Add your custom domain (e.g., `rapt.yourcompany.com`)
3. Follow Vercel's DNS configuration instructions
4. Update Stripe webhook URL to use your custom domain

## Step 5: Monitor & Troubleshoot

### View Logs

```bash
# In Vercel Dashboard: Deployments → [Latest] → Logs
```

### Common Issues

**Database Connection Failed:**
- Verify `DATABASE_URL` is correct
- Check Supabase firewall allows Vercel IPs
- Ensure migrations ran successfully

**Stripe Webhook Not Triggering:**
- Verify webhook URL is correct
- Check Stripe webhook signing secret matches `STRIPE_WEBHOOK_SECRET`
- View webhook delivery logs in Stripe Dashboard

**OAuth Not Working:**
- Verify `VITE_APP_ID` and OAuth URLs are correct
- Check callback URL is registered in Manus OAuth settings

## Step 6: Continuous Deployment

Every push to `main` branch on GitHub automatically triggers a new Vercel deployment.

To deploy manually:
```bash
git push origin main
```

## Rollback

If deployment fails, Vercel automatically keeps previous versions. To rollback:

1. Go to Vercel Dashboard → Deployments
2. Find the previous successful deployment
3. Click the three dots → **Promote to Production**

## Environment Variables Reference

| Variable | Source | Required |
|----------|--------|----------|
| `DATABASE_URL` | Supabase | ✅ |
| `JWT_SECRET` | Generate | ✅ |
| `VITE_APP_ID` | Manus | ✅ |
| `OAUTH_SERVER_URL` | Manus | ✅ |
| `VITE_OAUTH_PORTAL_URL` | Manus | ✅ |
| `OWNER_OPEN_ID` | Manus | ✅ |
| `OWNER_NAME` | Your name | ✅ |
| `STRIPE_SECRET_KEY` | Stripe | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe | ✅ |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe | ✅ |
| `BUILT_IN_FORGE_API_URL` | Manus | ✅ |
| `BUILT_IN_FORGE_API_KEY` | Manus | ✅ |
| `VITE_FRONTEND_FORGE_API_URL` | Manus | ✅ |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus | ✅ |
| `TICKETMASTER_API_KEY` | Ticketmaster | ❌ |
| `EVENTBRITE_API_KEY` | Eventbrite | ❌ |

## Support

For issues with:
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
- **Stripe**: https://stripe.com/docs
- **RAPT**: Check GitHub issues or contact support
