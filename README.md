# Nylas Pub/Sub Integration

This project demonstrates how to integrate Nylas notifications with Google Cloud Pub/Sub, allowing you to efficiently receive and process notifications about email, calendar, and contact changes.

## Prerequisites

- Bun.js installed
- Google Cloud SDK installed and configured
- Nylas API key and credentials
- A Google Cloud Platform project

## Setup

1. **Create a Google Cloud Pub/Sub topic**:

```bash
gcloud pubsub topics create nylas-samantha
```

2. **Add the Nylas service account as a publisher**:

```bash
gcloud pubsub topics add-iam-policy-binding nylas-samantha \
  --member=serviceAccount:nylas-datapublisher@nylas-gma-mt.iam.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

3. **Create a Pull Subscription** (for manual testing):

```bash
gcloud pubsub subscriptions create nylas-subscriber \
  --topic=nylas-samantha \
  --ack-deadline=60
```

4. **Create a Nylas Pub/Sub Channel**:

```bash
curl --request POST \
  --url 'https://api.us.nylas.com/v3/channels/pubsub' \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json, application/gzip' \
  --header 'Authorization: Bearer YOUR_NYLAS_API_KEY' \
  --data-raw '{
    "description": "Nylas Samantha PubSub Channel",
    "trigger_types": [
      "message.created",
      "message.updated"
    ],
    "topic": "projects/YOUR_PROJECT_ID/topics/nylas-samantha",
    "notification_email_addresses": [
      "your@email.com"
    ]
  }'
```

## Usage

### Running the Fastify Server

The Fastify server includes an endpoint that can receive Pub/Sub notifications:

```bash
bun run index.ts
```

The server will listen on port 3001 and provide the following endpoints:
- Webhook endpoint: `http://your-server-url/webhook/nylas`
- Pub/Sub endpoint: `http://your-server-url/pubsub/nylas`

### Local Development with ngrok

For local development, you'll need to expose your localhost server to the internet so that Google Pub/Sub can push messages to it. This is where ngrok comes in:

1. **Install ngrok**:

```bash
npm install -g ngrok
```

2. **Start your Fastify server**:

```bash
bun run index.ts
```

3. **In a separate terminal, start ngrok**:

```bash
ngrok http 3002
```

4. **Automatically configure Pub/Sub with ngrok** (recommended):

The easiest way to set up the push subscription with your ngrok URL is to use the provided helper script:

```bash
bun run setup-ngrok.ts
```

This script will:
- Automatically detect your current ngrok URL
- Create or update the Pub/Sub push subscription with this URL
- Verify that your server is running

Run this script whenever you restart ngrok (as ngrok generates a new URL each time).

5. **Manually configure** (alternative method):

If you prefer to configure manually, copy the ngrok URL (e.g., `https://a1b2c3d4.ngrok.io`) and update the `PUSH_ENDPOINT` variable in `setup-pubsub.ts` with this URL plus the path:

```javascript
const PUSH_ENDPOINT = 'https://a1b2c3d4.ngrok.io/pubsub/nylas';
```

Then run the standard setup script:

```bash
bun run setup-pubsub.ts
```

Every time you restart ngrok, you'll get a new URL, so remember to update the `PUSH_ENDPOINT` and re-run the script.

### Setting up a Push Subscription

To configure a Push subscription that delivers messages to your server:

```bash
bun run setup-pubsub.ts
```

Make sure to update the `PUSH_ENDPOINT` variable in the script with your server's public URL.

### Manually Pulling Messages

To manually pull and view messages from your Pub/Sub subscription:

```bash
bun run pull-messages.ts
```

## Notification Types

Nylas can send different types of notifications through Pub/Sub:

- `message.created` - When new emails are received
- `message.updated` - When emails are modified (read, moved, etc.)
- `event.created` - When new calendar events are created
- `event.updated` - When calendar events are modified
- `contact.created` - When new contacts are added
- `contact.updated` - When contacts are modified

You can configure which notification types you want to receive when creating the Pub/Sub channel.

## Troubleshooting

- If you're not receiving notifications, check that your Nylas API key is valid
- Verify that the Pub/Sub topic and subscription are correctly configured
- Make sure your server is publicly accessible if using a Push subscription
- Check Google Cloud console logs for any Pub/Sub delivery errors

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
