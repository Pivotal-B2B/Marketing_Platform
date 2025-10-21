/**
 * Integration Testing Script
 * Tests Email Verification (EmailListVerify) and AI Enrichment (Replit AI)
 * 
 * Usage: tsx server/test-integrations.ts
 */

import axios from 'axios';
import OpenAI from 'openai';

console.log('🧪 Testing CRM Integrations\n');
console.log('=' .repeat(60));

// Test 1: Email List Verify API
async function testEmailListVerify() {
  console.log('\n1️⃣  Testing EmailListVerify API...');
  console.log('-'.repeat(60));
  
  const apiKey = process.env.EMAIL_LIST_VERIFY_API_KEY;
  
  if (!apiKey) {
    console.error('❌ EMAIL_LIST_VERIFY_API_KEY not found in environment');
    return false;
  }
  
  console.log(`✅ API Key configured: ${apiKey.substring(0, 8)}...`);
  
  const testEmail = 'test@example.com';
  
  try {
    console.log(`📧 Testing email: ${testEmail}`);
    
    const response = await axios.get(
      'https://apps.emaillistverify.com/api/verifyEmail',
      {
        params: {
          secret: apiKey,
          email: testEmail
        },
        timeout: 10000
      }
    );
    
    console.log('✅ EmailListVerify API Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error: any) {
    console.error('❌ EmailListVerify API Error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    return false;
  }
}

// Test 2: Replit AI / OpenAI Integration
async function testReplitAI() {
  console.log('\n2️⃣  Testing Replit AI (OpenAI Integration)...');
  console.log('-'.repeat(60));
  
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  
  if (!baseURL || !apiKey) {
    console.error('❌ AI integration environment variables missing:');
    console.error(`   AI_INTEGRATIONS_OPENAI_BASE_URL: ${baseURL || 'NOT SET'}`);
    console.error(`   AI_INTEGRATIONS_OPENAI_API_KEY: ${apiKey ? 'SET' : 'NOT SET'}`);
    return false;
  }
  
  console.log(`✅ Base URL: ${baseURL}`);
  console.log(`✅ API Key: ${apiKey === '_DUMMY_API_KEY_' ? '_DUMMY_API_KEY_' : apiKey.substring(0, 8) + '...'}`);
  
  try {
    const openai = new OpenAI({
      baseURL,
      apiKey
    });
    
    console.log('🤖 Testing GPT-4o model with simple query...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond in JSON format.'
        },
        {
          role: 'user',
          content: 'What is the capital of France? Respond in JSON with fields: country, capital'
        }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 100,
    });
    
    const result = completion.choices[0]?.message?.content;
    console.log('✅ AI Response:', result);
    
    if (!result) {
      console.error('❌ Empty response from AI');
      return false;
    }
    
    try {
      const parsed = JSON.parse(result);
      console.log('✅ JSON parsing successful:', parsed);
    } catch (e) {
      console.error('❌ Failed to parse AI response as JSON');
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Replit AI Error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    return false;
  }
}

// Test 3: Company Enrichment Example
async function testCompanyEnrichment() {
  console.log('\n3️⃣  Testing Company Enrichment (AI + Web Search)...');
  console.log('-'.repeat(60));
  
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  
  if (!baseURL || !apiKey) {
    console.error('❌ AI integration not configured');
    return false;
  }
  
  console.log(`✅ AI configured`);
  console.log(`${braveKey ? '✅' : '⚠️'}  Brave Search API ${braveKey ? 'configured' : 'NOT configured (fallback disabled)'}`);
  
  try {
    const openai = new OpenAI({
      baseURL,
      apiKey
    });
    
    const testCompany = 'Microsoft';
    const testCountry = 'Singapore';
    
    console.log(`🏢 Testing enrichment: ${testCompany} in ${testCountry}`);
    
    const prompt = `Find the LOCAL office information for ${testCompany} in ${testCountry}.

Return JSON with:
{
  "found": true/false,
  "address": {
    "address1": "street address",
    "city": "city",
    "state": "state/region",
    "postalCode": "postal code",
    "country": "${testCountry}"
  },
  "phone": "local phone number",
  "confidence": 0.0-1.0,
  "reason": "explanation if not found"
}`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a company data extraction expert. Only return real, verifiable data from your knowledge. Output valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1000,
    });
    
    const result = completion.choices[0]?.message?.content;
    console.log('✅ Enrichment Response:', result);
    
    if (result) {
      const parsed = JSON.parse(result);
      if (parsed.found) {
        console.log('✅ Company data found!');
        console.log(`   Address: ${parsed.address?.address1}`);
        console.log(`   Phone: ${parsed.phone || 'N/A'}`);
        console.log(`   Confidence: ${parsed.confidence}`);
      } else {
        console.log(`⚠️  Company data not found: ${parsed.reason}`);
      }
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Company Enrichment Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  const results = {
    emailVerify: false,
    replitAI: false,
    enrichment: false
  };
  
  results.emailVerify = await testEmailListVerify();
  results.replitAI = await testReplitAI();
  results.enrichment = await testCompanyEnrichment();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(60));
  console.log(`Email Verification (ELV): ${results.emailVerify ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Replit AI Integration:    ${results.replitAI ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Company Enrichment:       ${results.enrichment ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60));
  
  const allPassed = results.emailVerify && results.replitAI && results.enrichment;
  
  if (allPassed) {
    console.log('\n🎉 All integrations are working correctly!');
  } else {
    console.log('\n⚠️  Some integrations failed. Check the errors above.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
