#!/usr/bin/env bun

/**
 * Nylas Pub/Sub Integration - ngrok Setup Script
 * 
 * This script automatically detects your ngrok URL and sets up a Google Cloud Pub/Sub
 * push subscription that points to your local development environment.
 * 
 * @license MIT
 * @copyright Copyright (c) 2025 Aemal Sayer
 * 
 * Prerequisites:
 * 1. ngrok must be running (ngrok http 3002)
 * 2. Your server must be running (bun run index.ts)
 * 
 * Run with: bun run setup-ngrok.ts
 */

import { execSync } from 'child_process';
import axios from 'axios';

// Configuration
const PROJECT_ID = 'nylus-samantha';
const TOPIC_NAME = 'nylas-samantha';
const SUBSCRIPTION_NAME = 'nylas-push-subscription';
const ACK_DEADLINE_SECONDS = 60;

async function main() {
  try {
    console.log('🔍 Detecting ngrok tunnel...');
    
    // Get ngrok tunnels from the local API
    const response = await axios.get('http://localhost:4040/api/tunnels');
    const tunnels = response.data.tunnels;
    
    if (!tunnels || tunnels.length === 0) {
      throw new Error('No active ngrok tunnels found. Please start ngrok with: ngrok http 3001');
    }
    
    // Find a secure tunnel (https)
    const secureTunnel = tunnels.find((tunnel: any) => tunnel.proto === 'https');
    
    if (!secureTunnel) {
      throw new Error('No secure (HTTPS) ngrok tunnel found. HTTPS is required for Pub/Sub push.');
    }
    
    const ngrokUrl = secureTunnel.public_url;
    console.log(`✅ Found ngrok tunnel: ${ngrokUrl}`);
    
    // Construct the push endpoint URL
    const PUSH_ENDPOINT = `${ngrokUrl}/pubsub/nylas`;
    console.log(`🔗 Push endpoint will be: ${PUSH_ENDPOINT}`);
    
    // Configure the Pub/Sub push subscription
    console.log(`\n📡 Setting up Pub/Sub push subscription for Nylas notifications`);
    console.log(`Project: ${PROJECT_ID}`);
    console.log(`Topic: ${TOPIC_NAME}`);
    
    // Check if subscription already exists
    try {
      console.log('Checking if subscription already exists...');
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
    
    console.log(`\nRunning: ${createCommand}`);
    const result = execSync(createCommand).toString();
    
    console.log(`\n✅ Success! Pub/Sub push subscription created:`);
    console.log(result);
    
    // Verify Fastify server is running
    try {
      await axios.get('http://localhost:3002/');
      console.log('✅ Fastify server is running on port 3002');
    } catch (error) {
      console.warn('⚠️ Warning: Fastify server does not appear to be running on port 3002.');
      console.warn('Please start your server with: bun run index.ts');
    }
    
    console.log('\n🎉 Setup complete! Your local Fastify server will now receive Nylas notifications via Pub/Sub.');
    console.log(`The ngrok tunnel at ${ngrokUrl} will forward requests to your local server.`);
    console.log('Remember that ngrok URLs expire when you restart ngrok. Run this script again if you restart ngrok.');
    
  } catch (error: unknown) {
    console.error(`\n❌ Error setting up Pub/Sub with ngrok:`);
    
    if (error instanceof Error) {
      console.error(error.message);
      
      if (error.message.includes('ECONNREFUSED') && error.message.includes('4040')) {
        console.error('\nngrok does not appear to be running. Start it with: ngrok http 3001');
      }
    } else {
      console.error(String(error));
    }
    
    process.exit(1);
  }
}

main(); 