# AI Avatar Studio

A small Next.js prototype for generating talking-head avatar videos with Replicate's `prunaai/p-video-avatar` model.

## Setup

Create `.env.local` in this folder:

```bash
REPLICATE_API_TOKEN=r8_your_token_here
```

Then run:

```bash
npm run dev
```

Open http://127.0.0.1:3000.

## How it works

- Put reusable portrait images in `public/avatar-assets/`. Your current image is `public/avatar-assets/avatar.jpg`. After deployment, use `/avatar-assets/avatar.jpg` or `https://your-domain.com/avatar-assets/avatar.jpg` as the portrait URL.
- Add either a voice script or an audio URL. When both are supplied, the model uses the audio.
- The browser calls local Next.js API routes. Those routes call Replicate with the token from the server environment, so the token is not shipped to the client.
- Generated video output is proxied through `/api/avatar/output` so protected Replicate output URLs can still play in the browser.

The current prototype uses HTTP, HTTPS, or small data URLs for inputs. For production, add an upload step to store user files somewhere durable before sending them to Replicate.

