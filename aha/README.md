# Aha! Catcher — personal web MVP

Deployed in the existing ai-chat service, from the aha-catcher branch. The main branch preserves ChatGPT Clone.

- Native browser microphone, 16 kHz requested, rolling two-minute buffer.
- First capture freezes the preceding buffer and continues recording. Second capture saves and uploads. Maximum total clip: ten minutes, automatically saved at the limit.
- Browser IndexedDB persists captured audio and returned notes on this device. It is not a cloud archive: clearing website data deletes records. Export important notes.
- Server performs transcription and agent research in the request. Interrupted/failed requests can be retried from the locally saved audio. Durable cloud jobs and multi-device history are NOT implemented.
- Mobile Safari must stay active; this web build does not promise locked-screen/background capture. A native app is still required for that experiment.
- API requests require the private high-entropy access code. Only its SHA-256 digest is in access.json. The code is delivered locally, never in git or deployment environment variables. AI_BUILDER_TOKEN is injected by the platform.
- The server writes no user recordings or transcripts to disk. New clients recover history only from their own browser storage.

Run from this directory with AI_BUILDER_TOKEN configured and uvicorn server:app. Deployment Dockerfile uses PORT.
