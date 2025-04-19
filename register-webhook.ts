// Load environment variables
const NYLAS_API_KEY = process.env.NYLAS_API_KEY;
// Use the URL from the Postman request seen in the image
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://j5vpj7r6-3000.euw.devtunnels.ms/webhook/nylas';
// Update to use your actual email address
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'your-email@gmail.com';

if (!NYLAS_API_KEY) {
  console.error('Missing NYLAS_API_KEY environment variable');
  process.exit(1);
}

console.log('Registering webhook with Nylas...');
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log(`Using API Key: ${NYLAS_API_KEY.substring(0, 10)}...`);
console.log(`Notification Email: ${NOTIFICATION_EMAIL}`);

interface NylasWebhookResponse {
  id?: string;
  webhook_secret?: string;
  [key: string]: any;
}

async function registerWebhook() {
  try {
    // Update to include Google-specific trigger types for email notifications
    // Based on the Nylas documentation
    const response = await fetch('https://api.us.nylas.com/v3/webhooks/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NYLAS_API_KEY}`
      },
      body: JSON.stringify({
        trigger_types: [
          // Grant-related triggers
          "grant.created",
          "grant.deleted",
          "grant.expired",
          
          // Message-related triggers (requires gmail.readonly or gmail.modify scope)
          "message.created",
          "message.updated",
          
          // Message sending triggers (requires gmail.send scope)
          "message.send_success",
          "message.send_failed",
        ],
        description: "Google Email Webhook",
        webhook_url: WEBHOOK_URL,
        notification_email_addresses: [NOTIFICATION_EMAIL]
      })
    });
    
    const data = await response.json() as NylasWebhookResponse;
    
    if (response.ok) {
      console.log('Webhook registered successfully!');
      console.log('Webhook ID:', data.id);
      console.log('Webhook Secret:', data.webhook_secret);
      console.log('IMPORTANT: Save the webhook_secret for verifying incoming webhooks');
      console.log('Full response:', JSON.stringify(data, null, 2));
    } else {
      console.error('Failed to register webhook:');
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error('Error details:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error registering webhook:', error);
  }
}

registerWebhook(); 