# RAPT Deployment Checklist

Use this checklist to ensure all prerequisites are met before deploying to Vercel.

## Pre-Deployment Setup

- [ ] **GitHub Repository**: Code pushed to https://github.com/ryanyatwork-ctrl/RAPT
- [ ] **Vercel Account**: Connected to GitHub
- [ ] **Supabase Project**: Database created and accessible
- [ ] **Stripe Account**: Live API keys obtained
- [ ] **Manus OAuth**: App credentials available (if using Manus auth)

## Database Preparation

- [ ] **Supabase Connection String**: Obtained from Supabase Dashboard
- [ ] **Local Migrations**: Tested locally with `pnpm drizzle-kit migrate`
- [ ] **Tables Created**: Verified in Supabase SQL Editor
  - `users`
  - `properties`
  - `events`
  - `pricing_rules`
  - `subscriptions`
  - `calendar_data`
  - `listing_suggestions`

## Environment Variables

### Required for Vercel Deployment

- [ ] `DATABASE_URL` - Supabase PostgreSQL connection string
- [ ] `JWT_SECRET` - Random 32-character string
- [ ] `VITE_APP_ID` - Manus OAuth app ID
- [ ] `OAUTH_SERVER_URL` - Manus OAuth server URL
- [ ] `VITE_OAUTH_PORTAL_URL` - Manus OAuth portal URL
- [ ] `OWNER_OPEN_ID` - Your Manus user ID
- [ ] `OWNER_NAME` - Your name
- [ ] `STRIPE_SECRET_KEY` - Stripe live secret key
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `BUILT_IN_FORGE_API_URL` - Manus API URL
- [ ] `BUILT_IN_FORGE_API_KEY` - Manus API key
- [ ] `VITE_FRONTEND_FORGE_API_URL` - Manus frontend API URL
- [ ] `VITE_FRONTEND_FORGE_API_KEY` - Manus frontend API key

### Optional

- [ ] `TICKETMASTER_API_KEY` - For event imports
- [ ] `EVENTBRITE_API_KEY` - For event imports
- [ ] `VITE_ANALYTICS_ENDPOINT` - Analytics endpoint
- [ ] `VITE_ANALYTICS_WEBSITE_ID` - Analytics website ID

## Vercel Configuration

- [ ] **Project Created**: In Vercel Dashboard
- [ ] **GitHub Connected**: Repository linked to Vercel
- [ ] **Environment Variables**: All required vars added to Vercel
- [ ] **Build Settings**: 
  - Build Command: `pnpm build`
  - Output Directory: `dist`
  - Install Command: `pnpm install`
- [ ] **Domains**: Custom domain configured (if applicable)

## Stripe Configuration

- [ ] **Webhook Endpoint**: Created in Stripe Dashboard
- [ ] **Webhook URL**: Set to `https://your-domain.vercel.app/api/stripe/webhook`
- [ ] **Events Subscribed**: 
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- [ ] **Signing Secret**: Added to Vercel as `STRIPE_WEBHOOK_SECRET`

## GitHub Actions CI/CD

- [ ] **Workflow File**: `.github/workflows/deploy.yml` created
- [ ] **GitHub Secrets**: Added to repository settings
  - `VERCEL_TOKEN` - Vercel authentication token
  - `VERCEL_ORG_ID` - Vercel organization ID
  - `VERCEL_PROJECT_ID` - Vercel project ID
  - All environment variables as secrets

## Pre-Deployment Testing

- [ ] **Local Tests Pass**: `pnpm test` runs successfully
- [ ] **TypeScript Check**: `pnpm check` passes
- [ ] **Build Succeeds**: `pnpm build` completes without errors
- [ ] **Dev Server Works**: `pnpm dev` runs locally
- [ ] **Database Connection**: Can connect to Supabase
- [ ] **Stripe Integration**: Test checkout flow locally

## Deployment Steps

1. [ ] **Push to GitHub**: `git push origin main`
2. [ ] **Verify GitHub Actions**: Workflow runs and passes
3. [ ] **Check Vercel Deployment**: Deployment completes successfully
4. [ ] **Test Live URL**: Visit deployed app and verify functionality
5. [ ] **Test Authentication**: Login with OAuth
6. [ ] **Test Stripe**: Create a test subscription
7. [ ] **Check Webhooks**: Verify Stripe webhooks are being received

## Post-Deployment

- [ ] **Monitor Logs**: Check Vercel and Supabase logs for errors
- [ ] **Test All Features**:
  - [ ] User authentication
  - [ ] Property management
  - [ ] Pricing engine
  - [ ] Event intelligence
  - [ ] Subscription upgrades
  - [ ] Admin panel
- [ ] **Set Up Monitoring**: Configure alerts for errors/downtime
- [ ] **Database Backups**: Enable automatic backups in Supabase
- [ ] **SSL Certificate**: Verify HTTPS is working
- [ ] **Custom Domain**: If using custom domain, verify DNS is configured

## Rollback Plan

If deployment fails:
1. [ ] Check Vercel deployment logs for errors
2. [ ] Verify all environment variables are correct
3. [ ] Check database connection and migrations
4. [ ] Rollback to previous deployment in Vercel
5. [ ] Fix issues locally and push new commit

## Maintenance

- [ ] **Regular Updates**: Keep dependencies updated with `pnpm update`
- [ ] **Security Patches**: Monitor for security advisories
- [ ] **Database Optimization**: Monitor query performance
- [ ] **Cost Monitoring**: Track Supabase and Vercel usage
- [ ] **Backup Strategy**: Regular database backups

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **GitHub Actions**: https://docs.github.com/en/actions
- **RAPT Repository**: https://github.com/ryanyatwork-ctrl/RAPT

---

**Last Updated**: 2026-04-03
**Status**: Ready for deployment
