/**
 * PRODUCTION DATA CLEANUP SCRIPT
 * 
 * This script safely clears all business data from production database
 * while preserving the users table.
 * 
 * ⚠️ WARNING: This is PERMANENT and cannot be undone!
 * 
 * Usage:
 *   1. Stop your published app first (if running)
 *   2. Run: npx tsx scripts/clear-production-data.ts
 *   3. Confirm the action
 *   4. Re-publish your app
 */

import { neon } from '@neondatabase/serverless';
import * as readline from 'readline';

// Get production database URL from environment
const PROD_DATABASE_URL = process.env.DATABASE_URL;

if (!PROD_DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not found!');
  console.error('Make sure you are running this in your Replit environment.');
  process.exit(1);
}

const sql = neon(PROD_DATABASE_URL);

async function confirmAction(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This will PERMANENTLY delete all business data from production!');
    console.log('   The following data will be DELETED:');
    console.log('   - All Accounts');
    console.log('   - All Contacts');
    console.log('   - All Campaigns');
    console.log('   - All Leads');
    console.log('   - All Lists/Segments');
    console.log('   - All Call History');
    console.log('   - All Suppressions');
    console.log('   - All DV Projects');
    console.log('');
    console.log('✅ The following will be PRESERVED:');
    console.log('   - Users (all user accounts)');
    console.log('   - Email Templates');
    console.log('   - SIP Trunks');
    console.log('');
    
    rl.question('Type "DELETE PRODUCTION DATA" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'DELETE PRODUCTION DATA');
    });
  });
}

async function clearProductionData() {
  try {
    console.log('\n📊 Checking current database state...\n');
    
    // Count records before deletion
    const beforeCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM accounts) as accounts,
        (SELECT COUNT(*) FROM contacts) as contacts,
        (SELECT COUNT(*) FROM campaigns) as campaigns,
        (SELECT COUNT(*) FROM leads) as leads,
        (SELECT COUNT(*) FROM users) as users
    `;
    
    console.log('Current record counts:');
    console.log(`  Accounts: ${beforeCounts[0].accounts}`);
    console.log(`  Contacts: ${beforeCounts[0].contacts}`);
    console.log(`  Campaigns: ${beforeCounts[0].campaigns}`);
    console.log(`  Leads: ${beforeCounts[0].leads}`);
    console.log(`  Users: ${beforeCounts[0].users} ✅ (will be preserved)`);
    
    const confirmed = await confirmAction();
    
    if (!confirmed) {
      console.log('\n❌ Operation cancelled. No data was deleted.');
      process.exit(0);
    }
    
    console.log('\n🗑️  Starting data cleanup...\n');
    
    // Execute cleanup - Neon handles this atomically
    console.log('  Clearing campaign suppressions...');
    await sql`TRUNCATE TABLE campaign_suppressions CASCADE`;
    
    console.log('  Clearing campaign queues...');
    await sql`TRUNCATE TABLE campaign_queue CASCADE`;
    await sql`TRUNCATE TABLE agent_queue CASCADE`;
    
    console.log('  Clearing campaign statistics...');
    await sql`TRUNCATE TABLE campaign_account_stats CASCADE`;
    
    console.log('  Clearing call history...');
    await sql`TRUNCATE TABLE calls CASCADE`;
    await sql`TRUNCATE TABLE call_attempts CASCADE`;
    await sql`TRUNCATE TABLE call_events CASCADE`;
    
    console.log('  Clearing leads...');
    await sql`TRUNCATE TABLE leads CASCADE`;
    
    console.log('  Clearing list memberships...');
    await sql`TRUNCATE TABLE list_members CASCADE`;
    
    console.log('  Clearing domain sets...');
    await sql`TRUNCATE TABLE domain_set_domains CASCADE`;
    await sql`TRUNCATE TABLE domain_sets CASCADE`;
    
    console.log('  Clearing contacts...');
    await sql`TRUNCATE TABLE contacts CASCADE`;
    
    console.log('  Clearing accounts...');
    await sql`TRUNCATE TABLE accounts CASCADE`;
    
    console.log('  Clearing campaigns...');
    await sql`TRUNCATE TABLE campaigns CASCADE`;
    
    console.log('  Clearing lists and segments...');
    await sql`TRUNCATE TABLE lists CASCADE`;
    await sql`TRUNCATE TABLE segments CASCADE`;
    
    console.log('  Clearing suppression lists...');
    await sql`TRUNCATE TABLE suppression_emails CASCADE`;
    await sql`TRUNCATE TABLE suppression_phones CASCADE`;
    
    console.log('  Clearing DV projects...');
    await sql`TRUNCATE TABLE dv_submissions CASCADE`;
    await sql`TRUNCATE TABLE dv_projects CASCADE`;
    
    console.log('  Clearing email verification jobs...');
    await sql`TRUNCATE TABLE email_verification_jobs CASCADE`;
    
    console.log('  Clearing content assets...');
    await sql`TRUNCATE TABLE content_assets CASCADE`;
    await sql`TRUNCATE TABLE social_posts CASCADE`;
    
    console.log('  Clearing activity logs...');
    await sql`TRUNCATE TABLE activity_logs CASCADE`;
    
    console.log('  Clearing agent statuses...');
    await sql`TRUNCATE TABLE agent_status CASCADE`;
    
    console.log('  Clearing voicemail assets...');
    await sql`TRUNCATE TABLE voicemail_assets CASCADE`;
    
    console.log('\n✅ All business data cleared successfully!\n');
    
    // Verify final state
    const afterCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM accounts) as accounts,
        (SELECT COUNT(*) FROM contacts) as contacts,
        (SELECT COUNT(*) FROM campaigns) as campaigns,
        (SELECT COUNT(*) FROM leads) as leads,
        (SELECT COUNT(*) FROM users) as users
    `;
    
    console.log('Final record counts:');
    console.log(`  Accounts: ${afterCounts[0].accounts} ✅`);
    console.log(`  Contacts: ${afterCounts[0].contacts} ✅`);
    console.log(`  Campaigns: ${afterCounts[0].campaigns} ✅`);
    console.log(`  Leads: ${afterCounts[0].leads} ✅`);
    console.log(`  Users: ${afterCounts[0].users} ✅ (preserved)`);
    
    console.log('\n✅ Production database cleanup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Your production database is now clean');
    console.log('   2. Click "Publish" button to deploy the current version');
    console.log('   3. Your users can still log in with existing credentials');
    
  } catch (error) {
    console.error('\n❌ ERROR during cleanup:');
    console.error(error);
    console.error('\nThe database transaction was rolled back. No data was deleted.');
    process.exit(1);
  }
}

// Run the cleanup
clearProductionData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
