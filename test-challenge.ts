// Script to test challenge verification of our webhook
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/webhook/nylas';
const TEST_CHALLENGE = 'test-challenge-' + Math.random().toString(36).substring(2, 10);

console.log('Testing webhook challenge verification');
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log(`Test Challenge: ${TEST_CHALLENGE}`);

async function testChallengeVerification() {
  try {
    console.log(`Sending GET request to: ${WEBHOOK_URL}?challenge=${TEST_CHALLENGE}`);
    
    const response = await fetch(`${WEBHOOK_URL}?challenge=${TEST_CHALLENGE}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',  // Accept plain text response
      }
    });
    
    // Get raw text
    const responseText = await response.text();
    
    console.log(`Status code: ${response.status} ${response.statusText}`);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));
    console.log('Transfer-Encoding:', response.headers.get('transfer-encoding'));
    
    // Compare the response directly
    console.log('Response text:', responseText); // For debugging
    
    if (responseText === TEST_CHALLENGE) {
      console.log('✅ SUCCESS: Challenge was returned exactly as sent');
      console.log('Your webhook should pass Nylas challenge verification');
    } else {
      console.log('❌ FAILED: Challenge was not returned exactly');
      console.log(`Expected: "${TEST_CHALLENGE}"`);
      console.log(`Received: "${responseText}"`);
      
      // Check for common issues
      if (responseText.includes(TEST_CHALLENGE)) {
        console.log('Challenge value is in the response but has extra content');
      }
      if (responseText.includes('"') && responseText.includes(TEST_CHALLENGE)) {
        console.log('Response includes quotes around the challenge value');
      }
      if (responseText.startsWith('{') || responseText.startsWith('[')) {
        console.log('Response appears to be JSON format instead of plain text');
      }
    }
  } catch (error) {
    console.error('Error testing challenge verification:', error);
  }
}

testChallengeVerification(); 