// Simple test to verify clustering service works
const fs = require('fs');
const path = require('path');

// Read the clustering service file to verify it's syntactically correct
const clusteringServicePath = path.join(__dirname, 'src/services/clustering.service.ts');
const knowledgebaseServicePath = path.join(__dirname, 'src/services/knowledgebase.service.ts');
const aiServicePath = path.join(__dirname, 'src/services/ai.services.ts');

console.log('Testing clustering implementation...');

// Check if files exist
if (!fs.existsSync(clusteringServicePath)) {
  console.error('ERROR: clustering.service.ts not found');
  process.exit(1);
}

if (!fs.existsSync(knowledgebaseServicePath)) {
  console.error('ERROR: knowledgebase.service.ts not found');
  process.exit(1);
}

if (!fs.existsSync(aiServicePath)) {
  console.error('ERROR: ai.services.ts not found');
  process.exit(1);
}

console.log('✓ All required files exist');

// Try to compile the TypeScript files
const { execSync } = require('child_process');

try {
  // Try to compile just our new files to check for syntax errors
  execSync('npx tsc --noEmit src/services/clustering.service.ts', { stdio: 'pipe' });
  console.log('✓ clustering.service.ts compiles successfully');
} catch (error) {
  console.error('✗ clustering.service.ts compilation failed:');
  console.error(error.stdout.toString() || error.stderr.toString() || error.message);
  process.exit(1);
}

try {
  execSync('npx tsc --noEmit src/services/knowledgebase.service.ts', { stdio: 'pipe' });
  console.log('✓ knowledgebase.service.ts compiles successfully');
} catch (error) {
  console.error('✗ knowledgebase.service.ts compilation failed:');
  console.error(error.stdout.toString() || error.stderr.toString() || error.message);
  process.exit(1);
}

try {
  execSync('npx tsc --noEmit src/services/ai.services.ts', { stdio: 'pipe' });
  console.log('✓ ai.services.ts compiles successfully');
} catch (error) {
  console.error('✗ ai.services.ts compilation failed:');
  console.error(error.stdout.toString() || error.stderr.toString() || error.message);
  process.exit(1);
}

console.log('\n🎉 All files compile successfully!');
console.log('\nImplementation Summary:');
console.log('- Added hierarchical clustering service with TF-IDF vectorization');
console.log('- Integrated clustering into knowledgebase service for better retrieval');
console.log('- Updated AI service to refit clustering model when new entries are added');
console.log('- Clustering automatically activates for knowledgebases with >50 entries');
console.log('- Uses agglomerative clustering with average linkage for topic organization');