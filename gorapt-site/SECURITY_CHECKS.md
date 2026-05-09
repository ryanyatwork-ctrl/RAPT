# GoRAPT Trust And Security Checks

Run these after `gorapt.com` is deployed.

## Required before HSTS preload

- `https://gorapt.com` loads cleanly.
- `https://www.gorapt.com` redirects to `https://gorapt.com`.
- `https://hostcopy.gorapt.com` supports HTTPS.
- Any future `*.gorapt.com` production subdomains support HTTPS.

The current `_headers` file includes:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Remove `preload` or `includeSubDomains` before launch if any subdomain is not
ready for HTTPS.

## Launch scans

- SecurityHeaders.com: target A or A+.
- MDN HTTP Observatory: review header and TLS recommendations.
- SSL Labs Server Test: confirm TLS configuration.
- Google Safe Browsing Site Status: confirm the domain is not flagged.
- Google Search Console: verify property, submit sitemap, check Security Issues.
- PageSpeed Insights: check mobile performance and image impact.

## Trust basics

- Legal pages are linked from the footer.
- Contact page lists `contact@gorapt.com`.
- Operator is listed as Belleville Systems.
- `robots.txt` points to `https://gorapt.com/sitemap.xml`.
- All product CTAs go to HTTPS URLs.
