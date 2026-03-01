/**
 * DEPLOYMENT GUIDE
 * COP Automation System
 */

# Deployment Guide

## Local Development

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- Git

### Installation & Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd cop-automation
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Create production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Production Deployment

### Build for Production

```bash
npm run build
npm run start
```

### Environment Variables

Create a `.env.local` file:
```env
# Optional: Configure file upload limits
NEXT_PUBLIC_MAX_FILE_SIZE=52428800
NEXT_PUBLIC_MAX_ROWS=50000
NEXT_PUBLIC_UPLOAD_TIMEOUT=300000

# Optional: API endpoint configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Deployment Platforms

#### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Vercel automatically detects Next.js
4. Deploy with one click

```bash
npm install -g vercel
vercel
```

#### Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV production
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t cop-automation .
docker run -p 3000:3000 cop-automation
```

#### Traditional Server (Node.js)

1. SSH into server
2. Install Node.js 18+
3. Clone repository
4. Install dependencies: `npm install`
5. Build: `npm run build`
6. Start with process manager (PM2):

```bash
npm install -g pm2
pm2 start npm --name "cop-automation" -- start
pm2 save
pm2 startup
```

#### AWS

1. Upload to AWS CodeDeploy
2. Use Elastic Beanstalk or EC2
3. Configure environment in `.ebextensions/nodecommand.config`

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
```

## Performance Optimization

### File Upload Limits
- Default: 50MB max file size
- Configure via `NEXT_PUBLIC_MAX_FILE_SIZE` env var
- Adjust based on server resources

### Recommended Specs
- **CPU**: 2+ cores
- **RAM**: 2GB minimum (4GB recommended)
- **Disk**: 10GB free space
- **Network**: 10Mbps+ bandwidth

### Scaling
- Use load balancer for multi-instance setup
- Files don't persist, so stateless scaling works well
- Cache API responses if same files uploaded frequently

## Security

### HTTPS
- Always use HTTPS in production
- Use SSL certificates (Let's Encrypt for free)
- Configure CORS if needed

### File Upload Security
- Extension validation (.xlsx, .xls only)
- File size limits enforced
- Content-type validation recommended
- No file persistence reduces attack surface

### API Security
- Add rate limiting for `/api/process`
- Implement authentication if needed
- Use CSRF protection
- Add request timeout

### Environment
- Never commit `.env.local` to git
- Use secrets management for production credentials
- Enable security headers

## Monitoring & Logs

### Application Logs
```bash
# Output logs to file
npm run start > app.log 2>&1

# View logs
tail -f app.log
```

### Error Tracking (Optional)
Integrate Sentry:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Health Check
Add monitoring endpoint:
```typescript
// GET /api/health
export async function GET() {
  return NextResponse.json({ status: 'healthy' });
}
```

## Backup & Recovery

### Database None Required
- System is stateless
- No persistent data storage
- No backup needed for core functionality

### Configuration Backup
- Backup `.env` variables
- Version control all code
- Document custom configurations

## Maintenance

### Regular Updates
```bash
# Check for updates
npm outdated

# Update packages
npm update

# Audit vulnerabilities
npm audit
npm audit fix
```

### Testing Before Production
1. Test with sample files
2. Verify all calculations correct
3. Check output format matches ERP requirements
4. Test with large files (25k+ rows)
5. Performance test with concurrent uploads

## Rollback Procedures

### If Deployment Fails
```bash
# Revert to previous version
git revert <commit>
npm run build
npm start
```

## Support & Troubleshooting

### Common Issues

**Port 3000 already in use:**
```bash
# Find process
lsof -i :3000
# Kill process
kill -9 <PID>
```

**Out of memory errors:**
- Increase Node.js heap:
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm start
```

**Slow processing:**
- Check server resources
- Monitor RAM usage
- Reduce concurrent uploads

### Getting Help
- Check server logs: `tail -f app.log`
- Verify file formats match requirements
- Test with smaller files first
- Check browser console for frontend errors

## Compliance & Auditing

### Data Handling
- No data persisted to storage
- All processing in-memory
- Files deleted after processing
- No user data collection

### Audit Trail
- Log all COP file generations
- Track user/timestamp
- Store generated TXT files if required

Example audit logging:
```typescript
// Add to API route
console.log({
  timestamp: new Date(),
  totalRows: result.summary.totalSKUs,
  status: result.success ? 'success' : 'failed',
  duration: Date.now() - startTime,
});
```

## Disaster Recovery

### System Failure
1. Redeploy from git
2. No data recovery needed (stateless)
3. Users re-upload files if needed

### Rollback Strategy
- Keep previous 2-3 versions tagged in git
- Test before production rollback
- Document breaking changes

---

For production readiness checklist, see: PRODUCTION_CHECKLIST.md
