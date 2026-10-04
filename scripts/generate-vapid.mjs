// Prints a fresh VAPID key pair for Web Push. Usage: node scripts/generate-vapid.mjs
import webpush from "web-push";
import { randomBytes } from "node:crypto";
const k = webpush.generateVAPIDKeys();
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${k.publicKey}\nVAPID_PRIVATE_KEY=${k.privateKey}\nVAPID_SUBJECT=mailto:you@example.com\nPUSH_DISPATCH_SECRET=${randomBytes(24).toString("hex")}`);
