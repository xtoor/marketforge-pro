# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

If you discover a security vulnerability, please send an email to **security@marketforge-pro.com** with:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** of the vulnerability
4. **Suggested fix** (if you have one)

You should receive a response within 48 hours. If the issue is confirmed, we will:

1. Acknowledge receipt of your report
2. Provide an estimated timeline for a fix
3. Notify you when the vulnerability is fixed
4. Credit you in the security advisory (unless you prefer to remain anonymous)

### What to Expect

- **Initial Response**: Within 48 hours
- **Status Updates**: At least every 5 business days
- **Resolution Timeline**: Varies by severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

## Security Best Practices

### For Users

1. **API Keys**
   - Never commit API keys to version control
   - Use environment variables for all sensitive credentials
   - Rotate API keys regularly
   - Use read-only API keys when possible

2. **Environment Files**
   - Keep `.env` files in `.gitignore`
   - Never share `.env` files publicly
   - Use different credentials for development and production

3. **Updates**
   - Keep MarketForge Pro updated to the latest version
   - Monitor security advisories
   - Update dependencies regularly

4. **Electron App**
   - Only download releases from official sources
   - Verify checksums before installation
   - Keep auto-updates enabled

### For Developers

1. **Code Security**
   - Never hardcode secrets or API keys
   - Sanitize all user inputs
   - Use parameterized queries for database operations
   - Validate and escape all data before rendering
   - Follow OWASP Top 10 guidelines

2. **Dependency Management**
   - Regularly update dependencies
   - Run `npm audit` and `pip check` before releases
   - Use `dependabot` for automated updates
   - Review dependency security advisories

3. **Authentication & Authorization**
   - Use encryption for API keys in Electron app
   - Implement rate limiting on all API endpoints
   - Never expose internal APIs publicly
   - Use HTTPS in production

4. **Data Protection**
   - Encrypt sensitive data at rest
   - Use secure WebSocket connections
   - Implement proper CORS policies
   - Never log sensitive information

## Known Security Considerations

### API Key Storage

The Electron application uses `electron-store` with encryption to store API keys locally. The encryption key should be changed in production builds:

```javascript
// electron/main.js
const store = new Store({
  encryptionKey: 'CHANGE-THIS-IN-PRODUCTION'  // ⚠️ Update this!
});
```

### CORS Configuration

By default, CORS allows `localhost` origins. Update `.env` for production:

```env
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Rate Limiting

Default rate limit is 100 requests per minute per IP. Adjust in `backend/middleware/rate_limiter.py` if needed:

```python
MAX_REQUESTS = 100
WINDOW_SECONDS = 60
```

### Database Security

- SQLite database is stored locally without encryption by default
- For production, consider using PostgreSQL with SSL
- Never expose database files publicly
- Implement proper backup encryption

## Third-Party Security

### Broker API Integrations

When using broker APIs:
- Always use API keys with minimal required permissions
- Enable IP whitelisting where supported
- Use withdraw-restricted API keys
- Monitor API usage for anomalies
- Review broker security policies regularly

### External Services

MarketForge Pro integrates with:
- **CoinGecko**: Public API, no authentication required
- **Resonance.ai**: Optional, requires API key
- **TradingView**: Client-side library only
- **Broker APIs**: ccxt library (Kraken, Coinbase, Binance, Gemini)

Each service has its own security policies. Please review:
- [CoinGecko API Terms](https://www.coingecko.com/en/api/terms)
- [ccxt Security](https://github.com/ccxt/ccxt/wiki/Manual#api-keys)

## Security Audit History

| Date       | Type          | Findings | Status   |
|------------|---------------|----------|----------|
| 2025-01-XX | Initial Setup | N/A      | Complete |

## Responsible Disclosure

We kindly ask that you:

1. **Allow us time** to address the vulnerability before public disclosure
2. **Make a good faith effort** to avoid privacy violations and data destruction
3. **Do not exploit** the vulnerability beyond what's necessary to demonstrate it
4. **Contact us immediately** if you encounter user data during testing

## Bug Bounty Program

We currently do not have a formal bug bounty program, but we recognize and appreciate security researchers who help keep MarketForge Pro safe:

- **Recognition**: Listed in security advisories (with permission)
- **Swag**: MarketForge Pro merchandise for valid reports
- **Early Access**: Beta access to new features

## Security Checklist for Releases

Before each release, we:

- [ ] Run security audit (`npm audit`, `safety check`)
- [ ] Update all dependencies to latest secure versions
- [ ] Review and rotate any test credentials
- [ ] Verify `.gitignore` excludes sensitive files
- [ ] Test authentication and authorization
- [ ] Verify rate limiting is enabled
- [ ] Check for hardcoded secrets
- [ ] Review CORS configuration
- [ ] Test input validation
- [ ] Scan for SQL injection vulnerabilities
- [ ] Verify HTTPS is enforced in production
- [ ] Check cryptographic implementations
- [ ] Review access control logic
- [ ] Generate security checksums for releases

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

## Contact

For security concerns: **security@marketforge-pro.com**

For general inquiries: **hello@marketforge-pro.com**

---

Last Updated: 2025-01-XX
