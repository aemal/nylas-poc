/**
 * Nylas Pub/Sub Integration
 * 
 * A Fastify server that integrates with Nylas APIs and Google Cloud Pub/Sub
 * to receive real-time notifications about email, calendar, and contact updates.
 * 
 * @license MIT
 * @copyright Copyright (c) 2025 Aemal Sayer
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import crypto from 'crypto';
import type { FastifyRequest } from 'fastify';

// Extend FastifyRequest to include rawBody property
declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string;
  }
}

// Define interface for email recipient
interface EmailRecipient {
  email: string;
  name?: string;
}

// Define Nylas notification payload types
interface NylasNotification {
  specversion: string;
  type: string;
  source: string;
  id: string;
  time?: number;
  webhook_delivery_attempt?: number;
  data: {
    application_id: string;
    grant_id?: string;
    object: any;
  };
}

// Define Google Pub/Sub message type
interface PubSubMessage {
  message: {
    data: string; // Base64 encoded message data
    messageId: string;
    publishTime: string;
    attributes?: Record<string, string>;
  };
  subscription: string;
}

// Initialize Fastify with raw body parsing
const fastify = Fastify({
  logger: {
    level: 'debug'
  },
  bodyLimit: 1048576 // 1MB
});

// Register the raw body plugin for signature verification
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    const parsed = JSON.parse(body as string);
    done(null, parsed);
  } catch (err) {
    done(err as Error, undefined);
  }
});

// Add a hook to save the raw body for signature verification
fastify.addHook('preHandler', (request, reply, done) => {
  if (request.routeOptions.url === '/webhook/nylas' && request.method === 'POST') {
    const rawBody = request.body;
    request.rawBody = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  }
  done();
});

// Register CORS
fastify.register(cors, {
  origin: true // Allow all origins
});

// Define a route
fastify.post('/', async (request, reply) => {
  return { hello: 'world' };
});

// Simple challenge endpoint (main handler for Nylas verification)
fastify.get('/webhook/nylas', async (request, reply) => {
  console.log('GET request received at /webhook/nylas');
  console.log('Query parameters:', request.query);
  console.log('Headers:', request.headers);
  
  const challenge = (request.query as { challenge?: string }).challenge;
  
  if (challenge) {
    console.log('Returning challenge:', challenge);
    return reply
      .header('Content-Type', 'text/plain')
      .send(challenge);
  }
  
  console.log('No challenge parameter found in request');
  return challenge;
});

// Nylas webhook notification endpoint
fastify.post('/webhook/nylas', async (request, reply) => {
  console.log('POST request received at /webhook/nylas');
  console.log('Headers:', JSON.stringify(request.headers, null, 2));
  
  try {
    const payload = request.body as NylasNotification;
    const nylasSignature = request.headers['x-nylas-signature'] as string;
    const webhookSecret = process.env.NYLAS_WEBHOOK_SECRET;

    console.log('Webhook signature:', nylasSignature);
    console.log('Webhook secret available:', !!webhookSecret);

    // Verify signature if webhook secret is provided
    if (webhookSecret && nylasSignature) {
      // Use the saved raw body for verification
      const rawBody = request.rawBody;
      
      if (!rawBody) {
        console.error('Raw body not available for signature verification');
        return reply.code(400).send({ error: 'Raw body not available' });
      }
      
      console.log('Raw body length for verification:', rawBody.length);
      
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(rawBody);
      const computedSignature = hmac.digest('hex');
      
      console.log('Computed signature:', computedSignature);
      console.log('Signature match:', computedSignature === nylasSignature);
      
      if (computedSignature !== nylasSignature) {
        console.error('Invalid webhook signature');
        return reply.code(401).send({ error: 'Invalid signature' });
      }
      
      console.log('Webhook signature verified successfully');
    } else {
      console.warn('No webhook secret or signature provided, skipping verification');
    }

    console.log('Received webhook notification from Nylas:');
    console.log('Notification ID:', payload.id);
    console.log('Notification Type:', payload.type);
    console.log('Notification Source:', payload.source);
    console.log('Delivery Attempt:', payload.webhook_delivery_attempt || 1);
    console.log('Full payload:', JSON.stringify(payload, null, 2));
    
    // Process the notification based on the type
    if (payload && payload.type) {
      console.log(`Processing notification type: ${payload.type}`);
      
      switch (payload.type) {
        case 'message.created':
          // Handle new message
          const messageData = payload.data.object;
          console.log(`New message received:`);
          console.log(`- ID: ${messageData.id}`);
          console.log(`- From: ${messageData.from?.[0]?.email || 'unknown'} (${messageData.from?.[0]?.name || 'unnamed'})`);
          console.log(`- To: ${messageData.to?.map((r: EmailRecipient) => r.email).join(', ') || 'unknown'}`);
          console.log(`- Subject: ${messageData.subject || 'No subject'}`);
          console.log(`- Date: ${new Date(messageData.date * 1000).toISOString()}`);
          break;
          
        case 'message.updated':
          // Handle updated message
          const updatedMessage = payload.data.object;
          console.log(`Message updated:`);
          console.log(`- ID: ${updatedMessage.id}`);
          console.log(`- Thread ID: ${updatedMessage.thread_id}`);
          console.log(`- Current folders: ${updatedMessage.folders?.join(', ') || 'none'}`);
          console.log(`- Unread status: ${updatedMessage.unread ? 'Unread' : 'Read'}`);
          break;
          
        case 'event.created':
          // Handle new calendar event
          const eventData = payload.data.object;
          console.log(`New event created:`);
          console.log(`- ID: ${eventData.id}`);
          console.log(`- Title: ${eventData.title || 'Untitled event'}`);
          console.log(`- Calendar ID: ${eventData.calendar_id}`);
          if (eventData.when) {
            const start = eventData.when.start_time 
              ? new Date(eventData.when.start_time * 1000).toISOString() 
              : 'unknown';
            const end = eventData.when.end_time 
              ? new Date(eventData.when.end_time * 1000).toISOString() 
              : 'unknown';
            console.log(`- Start: ${start}`);
            console.log(`- End: ${end}`);
          }
          console.log(`- Participants: ${eventData.participants?.length || 0}`);
          break;
          
        default:
          console.log(`Received ${payload.type} notification, no specific handling implemented`);
      }
    }
    
    // Log response status
    console.log('Sending 200 OK response to acknowledge receipt');
    return { success: true };
  } catch (error) {
    console.error('Error processing Nylas webhook:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    return reply.code(500).send({ error: 'Failed to process webhook' });
  }
});

// Google Pub/Sub push notification endpoint
fastify.post('/pubsub/nylas', async (request, reply) => {
  console.log('POST request received at /pubsub/nylas');
  
  try {
    const pubsubMessage = request.body as PubSubMessage;
    
    if (!pubsubMessage.message || !pubsubMessage.message.data) {
      console.error('Invalid Pub/Sub message format');
      return reply.code(400).send({ error: 'Invalid message format' });
    }
    
    // Decode the base64 message data
    const decodedData = Buffer.from(pubsubMessage.message.data, 'base64').toString('utf-8');
    console.log('Received Pub/Sub message:');
    console.log('- Message ID:', pubsubMessage.message.messageId);
    console.log('- Publish Time:', pubsubMessage.message.publishTime);
    console.log('- Subscription:', pubsubMessage.subscription);
    
    try {
      // Parse the decoded data as JSON (Nylas notification)
      const nylasNotification = JSON.parse(decodedData) as NylasNotification;
      
      console.log('Parsed Nylas notification from Pub/Sub:');
      console.log('- Notification ID:', nylasNotification.id);
      console.log('- Notification Type:', nylasNotification.type);
      console.log('- Notification Source:', nylasNotification.source);
      
      // Process the notification based on type (similar to webhook handling)
      if (nylasNotification && nylasNotification.type) {
        console.log(`Processing notification type: ${nylasNotification.type}`);
        
        // Get the base notification type without .transformed suffix
        const baseType = nylasNotification.type.split('.transformed')[0];
        
        switch (baseType) {
          case 'message.created':
            // Handle new message
            const messageData = nylasNotification.data.object;
            console.log(`New message received via Pub/Sub:`);
            console.log(`- ID: ${messageData.id}`);
            
            if (messageData.from && messageData.from.length > 0) {
              console.log(`- From: ${messageData.from[0]?.email || 'unknown'} (${messageData.from[0]?.name || 'unnamed'})`);
            }
            
            if (messageData.to) {
              console.log(`- To: ${messageData.to.map((r: EmailRecipient) => r.email).join(', ') || 'unknown'}`);
            }
            
            console.log(`- Subject: ${messageData.subject || 'No subject'}`);
            
            // Log email body if available
            if (messageData.body) {
              console.log(`- Body preview: ${messageData.body.substring(0, 100)}...`);
            }
            
            // Log date if available
            if (messageData.date) {
              console.log(`- Date: ${new Date(messageData.date * 1000).toISOString()}`);
            }
            
            console.log(`- Full message data:`, JSON.stringify(messageData, null, 2));
            break;
            
          case 'message.updated':
            // Handle updated message
            const updatedMessage = nylasNotification.data.object;
            console.log(`Message updated via Pub/Sub:`);
            console.log(`- ID: ${updatedMessage.id}`);
            
            if (updatedMessage.thread_id) {
              console.log(`- Thread ID: ${updatedMessage.thread_id}`);
            }
            
            if (updatedMessage.subject) {
              console.log(`- Subject: ${updatedMessage.subject}`);
            }
            
            if (updatedMessage.from && updatedMessage.from.length > 0) {
              console.log(`- From: ${updatedMessage.from[0]?.email || 'unknown'} (${updatedMessage.from[0]?.name || 'unnamed'})`);
            }
            
            if (updatedMessage.folders) {
              console.log(`- Current folders: ${updatedMessage.folders.join(', ') || 'none'}`);
            }
            
            console.log(`- Unread status: ${updatedMessage.unread ? 'Unread' : 'Read'}`);
            
            // Log email body if available
            if (updatedMessage.body) {
              console.log(`- Body preview: ${updatedMessage.body.substring(0, 100)}...`);
            }
            
            console.log(`- Full message data:`, JSON.stringify(updatedMessage, null, 2));
            break;
            
          default:
            console.log(`Received ${nylasNotification.type} notification via Pub/Sub, no specific handling implemented`);
            // Still log the object data for inspection
            console.log('Object data:', JSON.stringify(nylasNotification.data.object, null, 2));
        }
      }
      
    } catch (parseError) {
      console.error('Error parsing Pub/Sub message data as JSON:', parseError);
      console.log('Raw message data:', decodedData);
    }
    
    // Acknowledge receipt of the message
    return reply.code(204).send();
  } catch (error) {
    console.error('Error processing Pub/Sub message:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    return reply.code(500).send({ error: 'Failed to process Pub/Sub message' });
  }
});

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3002, host: '0.0.0.0' });
    console.log('Server listening on port 3002');
    console.log('Nylas webhook endpoint available at: http://your-server-url:3002/webhook/nylas');
    console.log('Pub/Sub push endpoint available at: http://your-server-url:3002/pubsub/nylas');
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
};

start();

