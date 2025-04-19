#!/usr/bin/env bun

/**
 * This script configures a Google Cloud Pub/Sub subscription to push messages to a specified endpoint.
 * Run with: bun run setup-pubsub.ts
 */

import { execSync } from 'child_process';

// Configuration
const PROJECT_ID = 'nylus-samantha'; // Your GCP project ID
const TOPIC_NAME = 'nylas-samantha'; // Your Pub/Sub topic
const SUBSCRIPTION_NAME = 'nylas-push-subscription'; // Name for the push subscription
const PUSH_ENDPOINT = 'https://3eb9ff9f3873.ngrok.app/pubsub/nylas'; // Replace with your ngrok URL
const ACK_DEADLINE_SECONDS = 60; // Time to acknowledge messages

console.log(`Setting up Pub/Sub push subscription for Nylas notifications`);
console.log(`Project: ${PROJECT_ID}`);
console.log(`Topic: ${TOPIC_NAME}`);
console.log(`Push endpoint: ${PUSH_ENDPOINT}`);

try {
  // Check if subscription already exists
  try {
    const checkResult = execSync(
      `gcloud pubsub subscriptions describe ${SUBSCRIPTION_NAME} --project=${PROJECT_ID}`,
      { stdio: 'pipe' }
    ).toString();
    
    console.log(`Subscription ${SUBSCRIPTION_NAME} already exists. Deleting it first...`);
    execSync(`gcloud pubsub subscriptions delete ${SUBSCRIPTION_NAME} --project=${PROJECT_ID}`);
  } catch (error) {
    console.log(`Subscription ${SUBSCRIPTION_NAME} does not exist yet. Creating it...`);
  }
  
  // Create the push subscription
  const createCommand = [
    `gcloud pubsub subscriptions create ${SUBSCRIPTION_NAME}`,
    `--topic=${TOPIC_NAME}`,
    `--push-endpoint=${PUSH_ENDPOINT}`,
    `--ack-deadline=${ACK_DEADLINE_SECONDS}`,
    `--project=${PROJECT_ID}`
  ].join(' ');
  
  console.log(`Running: ${createCommand}`);
  const result = execSync(createCommand).toString();
  
  console.log(`\nSuccess! Pub/Sub push subscription created:`);
  console.log(result);
  
  // Verify the subscription
  console.log(`\nVerifying subscription details:`);
  const verifyResult = execSync(
    `gcloud pubsub subscriptions describe ${SUBSCRIPTION_NAME} --project=${PROJECT_ID}`
  ).toString();
  
  console.log(verifyResult);
  
  console.log(`\nSetup complete! Your Fastify server will now receive Nylas notifications via Pub/Sub.`);
  console.log(`Make sure your server is publicly accessible at ${PUSH_ENDPOINT}`);
  
} catch (error: unknown) {
  console.error(`Error setting up Pub/Sub subscription:`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} 