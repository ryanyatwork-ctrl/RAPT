# GoRAPT Marketing Site

Static marketing site for `gorapt.com`.

## Deploy on Cloudflare Pages

- Build command: leave empty
- Build output directory: `gorapt-site`
- Production domain: `gorapt.com`

Current Cloudflare Pages project: `gorapt`.

Required DNS records after attaching custom domains:

| Type | Name | Target |
| --- | --- | --- |
| CNAME | `gorapt.com` | `gorapt.pages.dev` |
| CNAME | `www` | `gorapt.pages.dev` |

The `_headers` file is included for a strong SecurityHeaders.com score. Confirm
that every `gorapt.com` subdomain supports HTTPS before keeping the HSTS
`preload` directive.

## Post-launch checks

- SecurityHeaders.com
- MDN HTTP Observatory
- SSL Labs Server Test
- Google Safe Browsing Site Status
- PageSpeed Insights
- Google Search Console
