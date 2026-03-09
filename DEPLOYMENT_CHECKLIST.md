# Deployment & Launch Checklist

## Pre-Deployment Tasks

### Environment Setup
- [ ] PostgreSQL database created (`automation_hub`)
- [ ] PostgreSQL service is running
- [ ] .env.local configured with correct DATABASE_URL
- [ ] Node.js 18+ installed
- [ ] npm/yarn package manager working

### Initial Installation
- [ ] Cloned/pulled latest code
- [ ] Run `npm install` successfully
- [ ] No npm dependency warnings or errors

### Database Setup
- [ ] Run `npm run db:migrate` - schema created
- [ ] Run `npm run db:seed` - sample data populated
- [ ] Verified tables exist: `euro_retail`, `price_matrix`
- [ ] Sample data visible in Prisma Studio: `npm run db:studio`

### Code Verification
- [ ] No TypeScript compilation errors
- [ ] No ESLint violations: `npm run lint`
- [ ] All imports resolve correctly
- [ ] API route `/api/sale-request` accessible

### Functionality Testing

#### UI Testing (http://localhost:3010)
- [ ] Dashboard loads without errors
- [ ] "Request for Sale Prices" module visible
- [ ] Clicking module navigates to `/sale-request`
- [ ] Page title displays correctly
- [ ] All form elements render properly

#### File Upload Testing
- [ ] Item List file upload works (Excel)
- [ ] Price List file upload works (Excel)
- [ ] Drag & drop functionality works
- [ ] File validation rejects non-Excel files
- [ ] File size displays correctly

#### Form Input Testing
- [ ] Brand dropdown populated with: INT, CAL, MID, PER
- [ ] Country dropdown populated with: UAE, QA, KW, BH, LB
- [ ] Default selections: INT, UAE
- [ ] Can change brand and country

#### Processing Testing
Create test files and upload:

**test-items.xlsx:**
```
mancode | color | season | discount
MC001   | Red   | SS2024 | 0.25
MC002   | Blue  | SS2024 | 0.50
MC003   | Green | SS2024 | 0.70
```

**test-prices.xlsx** with tab "INT UAE":
```
Local Retail | 25  | 35  | 50  | 70  | 80
20           | 15  | 13  | 10  | 6   | 4
30           | 22.5| 19.5| 15  | 9   | 6
50           | 37.5| 32.5| 25  | 15  | 10
```

- [ ] Upload Item List file
- [ ] Upload Price List file  
- [ ] Select Brand: INT
- [ ] Select Country: UAE
- [ ] Click "Generate Prices"
- [ ] Processing completes (show spinner)
- [ ] No errors appear
- [ ] File downloads automatically
- [ ] Downloaded file is valid Excel
- [ ] Output file has correct columns
- [ ] Sale prices calculated correctly

#### Error Handling Testing
- [ ] Missing Item List file: Shows error
- [ ] Missing Price List file: Shows error
- [ ] Missing Brand: Shows error
- [ ] Missing Country: Shows error
- [ ] Invalid discount value: Shows row-level error
- [ ] Missing item column: Shows validation error
- [ ] Invalid price tab: Shows specific error
- [ ] Unknown mancode: Shows error with row number
- [ ] Error messages are clear and actionable

#### Integration Testing
- [ ] Dashboard still loads after changes
- [ ] COP module still works (no breaking changes)
- [ ] Can navigate between modules
- [ ] Other pages/features unaffected

### Performance Testing
- [ ] Process ~100 items: completes in <1 second
- [ ] Process ~1000 items: completes in <3 seconds
- [ ] Request headers show processing time
- [ ] No memory leaks during processing
- [ ] Database queries are efficient

### Database Testing
- [ ] Add new Euro Retail entry via Prisma Studio
- [ ] Add new Price Matrix entry via Prisma Studio
- [ ] Updates are reflected immediately
- [ ] Data persists after server restart
- [ ] Backups can be created

## Pre-Production Checklist

### Code Quality
- [ ] No `any` types in TypeScript
- [ ] All imports use correct paths
- [ ] No console.log statements (except logging)
- [ ] Error messages user-friendly
- [ ] Code follows project conventions

### Security
- [ ] No hardcoded credentials
- [ ] Database URL configured via environment
- [ ] File uploads validated
- [ ] No SQL injection risks (using Prisma)
- [ ] No XSS vulnerabilities

### Documentation
- [ ] README files complete
- [ ] API endpoints documented
- [ ] Setup guide followed and verified
- [ ] Troubleshooting guide created
- [ ] Database schema documented

### Testing
- [ ] Unit test sample files created
- [ ] Integration tests pass
- [ ] Error cases handled gracefully
- [ ] Happy path works end-to-end
- [ ] Performance acceptable

## Production Deployment

### Pre-Deployment
- [ ] Create production database
- [ ] Generate strong database credentials
- [ ] Configure production DATABASE_URL
- [ ] Set up database backups
- [ ] Create database user with limited permissions

### Deployment Steps
```bash
# 1. Deploy code to production server
git pull origin main

# 2. Install dependencies
npm install --production

# 3. Build application
npm run build

# 4. Run migrations on production database
npx prisma migrate deploy

# 5. (Optional) Seed initial reference data
# npx ts-node prisma/seed.ts

# 6. Start production server
npm run start
```

### Post-Deployment Verification
- [ ] Application starts without errors
- [ ] Database connection successful
- [ ] Dashboard accessible
- [ ] Sale Request module functional
- [ ] File upload works
- [ ] Processing completes successfully
- [ ] Excel output valid
- [ ] No error logs in console
- [ ] Performance acceptable under load

### Production Monitoring
- [ ] Set up error logging (e.g., Sentry)
- [ ] Monitor database connections
- [ ] Track processing times
- [ ] Alert on failures
- [ ] Regular database backups running

## Rollback Plan

If issues occur in production:

1. **Immediate Rollback**
   ```bash
   git revert <commit-hash>
   npm install
   npm run build
   npm run start
   ```

2. **Database Rollback**
   ```bash
   npx prisma migrate resolve --rolled-back <migration-name>
   # Or restore from backup
   ```

3. **Service Check**
   - Verify old version running
   - Check database integrity
   - Monitor for any lingering issues

## Post-Deployment

### Day 1
- [ ] Monitor error logs hourly
- [ ] Test with production data samples
- [ ] Verify all features working
- [ ] Check performance metrics
- [ ] User acceptance testing

### Week 1
- [ ] Monitor for edge cases
- [ ] Gather user feedback
- [ ] Watch database growth
- [ ] Performance trending stable
- [ ] No critical issues reported

### Month 1
- [ ] All systems stable
- [ ] User adoption rates good
- [ ] Performance meets expectations
- [ ] Database backups verified
- [ ] Document lessons learned

## Maintenance Tasks

### Daily
- [ ] Check error logs
- [ ] Monitor database health
- [ ] Verify backups completed

### Weekly
- [ ] Review processing statistics
- [ ] Check disk space
- [ ] Verify backup integrity
- [ ] Update any security patches

### Monthly
- [ ] Archive old processing logs
- [ ] Review performance trends
- [ ] Update documentation
- [ ] Plan future enhancements

## Contact & Support

### Escalation Path
1. **First Level:** Check error logs and documentation
2. **Second Level:** Review SALE_REQUEST_SETUP.md troubleshooting
3. **Third Level:** Check database state in Prisma Studio
4. **Fourth Level:** Review code and implementation details

### Key Contacts
- Database Admin: [TBD]
- DevOps: [TBD]
- Project Lead: [TBD]

---

## Notes

- Keep this checklist updated as issues are discovered
- Document any customizations made to the module
- Maintain backup of database schema
- Update version numbers in package.json for releases

---

**Last Updated:** March 6, 2026
**Version:** 1.0
**Status:** Ready for Deployment
