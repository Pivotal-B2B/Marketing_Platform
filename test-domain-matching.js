import { storage } from './server/index.js';

const domainSetId = '0210e54b-2c0b-4586-9927-8b8e1921a5f4';

console.log('Starting domain set matching for', domainSetId);

storage.processDomainSetMatching(domainSetId)
  .then(() => {
    console.log('Matching complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during matching:', err);
    process.exit(1);
  });
