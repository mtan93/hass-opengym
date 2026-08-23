/* Adapts an unmodified openGym checkout to run behind Home Assistant.
 *
 * Two changes, both asserted so a Dockerfile build fails loudly instead of shipping a
 * half-patched app when upstream moves the code around:
 *
 *   1. frontend/index.html — inject the Ingress fetch shim (see ingress-shim.html).
 *   2. api/server.js       — derive the expected WebAuthn origin / RP ID from the request
 *                            when the add-on options don't pin them, so passkeys work over
 *                            Ingress and over the direct port without hand-configuring a URL.
 *
 * Run from the root of the openGym checkout.
 */
import fs from 'node:fs'

const shimFile = process.argv[2] || '/opt/patch/ingress-shim.html'

function edit(file, edits) {
  let src = fs.readFileSync(file, 'utf8')
  for (const [find, replace, expected = 1] of edits) {
    const count = src.split(find).length - 1
    if (count !== expected) {
      throw new Error(`patch-opengym: ${file}: expected ${expected} occurrence(s) of ${JSON.stringify(find.slice(0, 80))}, found ${count}`)
    }
    src = src.split(find).join(replace)
  }
  fs.writeFileSync(file, src)
  console.log(`patched ${file}`)
}

/* ---------- 1. Ingress shim ---------- */
const shim = fs.readFileSync(shimFile, 'utf8').trimEnd()
edit('frontend/index.html', [['<head>', `<head>\n${shim}`]])

/* ---------- 2. Request-derived WebAuthn origin ---------- */
const ORIGIN_CONST = "const ORIGIN = process.env.ORIGIN || 'http://localhost:8080';"

const HELPERS = `
/* --- Home Assistant add-on ------------------------------------------------------------
   openGym can be reached through Home Assistant Ingress (https://<your-ha>/api/hassio_ingress/…)
   and/or directly on its own port, and the Ingress URL is not knowable ahead of time. When the
   add-on options pin ORIGIN / RP_ID those stay authoritative (ORIGIN may be a comma-separated
   list); otherwise the expected values are derived from the request the browser just made
   through the reverse proxy. That only relaxes the server-side double-check: the browser still
   refuses to hand out or use a credential whose RP ID doesn't match the page's own origin, which
   is what actually binds a passkey to this instance.
   -------------------------------------------------------------------------------------- */
const CONFIGURED_ORIGINS = (process.env.ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const CONFIGURED_RP_ID = (process.env.RP_ID || '').trim();
function requestOrigin(req) {
  const h = (req && req.headers) || {};
  const host = String(h['x-forwarded-host'] || h.host || '').split(',')[0].trim();
  if (!host) return null;
  const proto = String(h['x-forwarded-proto'] || 'http').split(',')[0].trim();
  return proto + '://' + host;
}
function originFor(req) {
  if (CONFIGURED_ORIGINS.length) return CONFIGURED_ORIGINS;
  const o = requestOrigin(req);
  return o ? [o] : [ORIGIN];
}
function rpIdFor(req) {
  if (CONFIGURED_RP_ID) return CONFIGURED_RP_ID;
  const o = requestOrigin(req);
  if (o) { try { return new URL(o).hostname; } catch { /* fall through */ } }
  return RP_ID;
}
`

edit('api/server.js', [
  // helpers go in right after ORIGIN, so the SECURE/VAPID consts below can use them
  [ORIGIN_CONST, ORIGIN_CONST + '\n' + HELPERS],
  // Secure cookies only when every configured origin is HTTPS. In derived mode we can't know
  // up front, and a Secure cookie silently vanishes over plain HTTP, so leave the flag off.
  [
    "const SECURE = /^https:/i.test(ORIGIN) ? ' Secure;' : '';",
    "const SECURE = CONFIGURED_ORIGINS.length > 0 && CONFIGURED_ORIGINS.every(o => /^https:/i.test(o)) ? ' Secure;' : '';",
  ],
  // ORIGIN may now be a list — a VAPID subject has to be a single URL.
  ['(SECURE ? ORIGIN : ', '(SECURE ? CONFIGURED_ORIGINS[0] : '],
  // the four WebAuthn call sites
  ['rpName: RP_NAME, rpID: RP_ID,', 'rpName: RP_NAME, rpID: rpIdFor(req),'],
  ['rpID: RP_ID, userVerification:', 'rpID: rpIdFor(req), userVerification:'],
  [
    'expectedOrigin: ORIGIN,\n        expectedRPID: RP_ID,',
    'expectedOrigin: originFor(req),\n        expectedRPID: rpIdFor(req),',
    2,
  ],
])
