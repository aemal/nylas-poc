#!/usr/bin/env bun

/**
 * This script manually pulls messages from a Google Cloud Pub/Sub subscription.
 * It's an alternative to the push delivery method and can be useful for testing.
 * Run with: bun run pull-messages.ts
 */

import { execSync } from 'child_process';

// Configuration
const PROJECT_ID = 'nylus-samantha'; // Your GCP project ID
const SUBSCRIPTION_NAME = 'nylas-subscriber'; // Your pull subscription name
const MAX_MESSAGES = 10; // Maximum number of messages to pull at once

console.log(`Pulling messages from Pub/Sub subscription: ${SUBSCRIPTION_NAME}`);
console.log(`Project: ${PROJECT_ID}`);
console.log(`Maximum messages: ${MAX_MESSAGES}`);

try {
  // Pull messages
  const pullCommand = [
    `gcloud pubsub subscriptions pull ${SUBSCRIPTION_NAME}`,
    `--project=${PROJECT_ID}`,
    `--auto-ack`,
    `--limit=${MAX_MESSAGES}`,
    `--format=json`
  ].join(' ');
  
  console.log(`\nRunning: ${pullCommand}`);
  const result = execSync(pullCommand).toString();
  
  if (!result || result.trim() === '[]') {
    console.log('\nNo messages available in the subscription.');
  } else {
    try {
      const messages = JSON.parse(result);
      console.log(`\nReceived ${messages.length} message(s):`);
      
      messages.forEach((message: any, index: number) => {
        console.log(`\n--- Message ${index + 1} ---`);
        console.log(`Message ID: ${message.messageId}`);
        console.log(`Publish Time: ${message.publishTime}`);
        
        if (message.attributes && Object.keys(message.attributes).length > 0) {
          console.log('Attributes:');
          for (const [key, value] of Object.entries(message.attributes)) {
            console.log(`  ${key}: ${value}`);
          }
        }
        
        // Base64 decode and parse the message data
        if (message.data) {
          try {
            const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
            console.log('Message Data (decoded):');
            
            try {
              // Try to parse as JSON
              const jsonData = JSON.parse(decodedData);
              console.log(JSON.stringify(jsonData, null, 2));
            } catch (parseError) {
              // If not JSON, just print the string
              console.log(decodedData);
            }
          } catch (decodeError) {
            console.log(`Unable to decode data: ${message.data}`);
          }
        } else {
          console.log('No message data.');
        }
      });
      
      console.log('\nMessages have been acknowledged automatically.');
    } catch (parseError) {
      console.error('\nError parsing JSON response:');
      console.error(parseError instanceof Error ? parseError.message : String(parseError));
      console.log('Raw response:');
      console.log(result);
    }
  }
  
} catch (error: unknown) {
  console.error(`\nError pulling messages from Pub/Sub subscription:`);
  console.error(error instanceof Error ? error.message : String(error));
  
  // Check if subscription exists
  try {
    execSync(`gcloud pubsub subscriptions describe ${SUBSCRIPTION_NAME} --project=${PROJECT_ID}`);
  } catch (subError) {
    console.error(`\nSubscription "${SUBSCRIPTION_NAME}" does not exist. Create it with:`);
    console.error(`gcloud pubsub subscriptions create ${SUBSCRIPTION_NAME} --topic=nylas-samantha --project=${PROJECT_ID}`);
  }
  
  process.exit(1);
} 