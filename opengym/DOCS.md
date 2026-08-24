# openGym

Self-hosted workout planner, gym logger and body-weight tracker, running as a Home
Assistant add-on. Upstream project: <https://github.com/arvids-unavailable/openGym>.

## Getting started

Start the add-on and click **Open Web UI** (or use the openGym item in the sidebar).
Create a profile — your device will offer to save a passkey — and you're in. The first
profile you create is just a normal user; see `admin_uids` below to give it the Admin
screen.

## Passkeys

openGym has no passwords. Sign-in is a passkey, which browsers only hand out in a
**secure context**:

| How you reach Home Assistant | Passkeys |
| --- | --- |
| `https://…` (Home Assistant Cloud, or your own TLS reverse proxy) | ✅ |
| `http://localhost:8123` on the machine itself | ✅ |
| `http://homeassistant.local:8123`, `http://192.168.x.x:8123` | ❌ browser blocks it |

A passkey is bound to the hostname you created it on. Create one over Home Assistant Cloud
and it will not work over the LAN address, and the other way round — that is WebAuthn
working as designed, not the add-on misbehaving. Pick the address you'll actually use.

By default the add-on trusts the address the request arrived on, which is what makes the
sidebar panel work without configuration. If Home Assistant is behind a reverse proxy it
doesn't know about, it may report the wrong scheme or host — set `origins` in that case.

## Options

### `origins`

A list of the exact URLs openGym is reached on, e.g. `https://home.example.com`. Leave it
empty (the default) unless Home Assistant sits behind another reverse proxy. Listing more
than one is fine — a passkey is still only valid on the host it was created for.

### `rp_id`

The bare hostname passkeys are bound to, e.g. `home.example.com` — no scheme, no port.
Empty means "derive it", either from the first entry of `origins` or from the request.
Changing this invalidates every passkey already created.

### `rp_name`

The name your phone or laptop shows when it asks to save or use a passkey. Cosmetic.

### `invite_only`

When on, creating a profile requires an invite code. Codes are generated from openGym's
Admin screen, which needs `admin_uids` set first.

### `admin_uids`

Comma-separated openGym user IDs that get the Admin screen (user list, invite codes).
Find your ID in openGym under **Settings**.

### `session_days`

How long a sign-in lasts before a passkey is needed again. Default `90`. Lowering it never
cuts an existing session short — the expiry is baked into each sign-in.

### `log_level`

Verbosity of the add-on log: `trace`, `debug`, `info` (default), `notice`, `warning`,
`error`, `fatal`.

## Direct access on port 8080

The add-on is reachable through Ingress out of the box. Map port `8080` under
**Configuration → Network** if you also want it on its own address — useful for installing
openGym as a PWA, or for push notifications, which want a stable URL rather than the
rotating Ingress path. Remember the secure-context rule: to use passkeys there, that
address needs HTTPS too.

## Your data

Everything openGym stores — profiles, passkeys, workout history, push subscriptions, the
session signing secret — lives in the add-on's `/data` volume:

- included in Home Assistant backups,
- kept across add-on updates and restarts,
- **deleted when the add-on is uninstalled.** Take a backup first.

## Notifications

openGym's rest-timer push notifications need a service worker, which needs HTTPS. They
work best on the direct port with a stable hostname; over Ingress the URL changes between
sessions and notifications may stop working until you reopen the app.

## Updating openGym itself

The add-on pins an upstream commit (`OPENGYM_REF` in the `Dockerfile`) and runs from a
prebuilt image. To move to a newer openGym, bump that value and the add-on `version`, let
CI publish the new image, then update the add-on.

## Troubleshooting

**"verification failed" when creating a profile.** The origin openGym expected didn't match
the one your browser used. Check the add-on log — it prints the origin at startup — and set
`origins` to the exact URL in your address bar.

**The panel is blank or endlessly loading.** Check the log for the API service; if it
crashed, the add-on halts on purpose rather than serving a broken app.

**Exercise images don't load.** They're baked into the image; a missing image means the
build was interrupted. Rebuild the add-on.

**Install fails with no useful error.** If the add-on is set to build locally rather than
pull a prebuilt image, the Vite build can be killed for running out of memory on smaller
hardware, which surfaces as a bare "can't build" with nothing in the log. Use the published
image (the default) rather than building on the Home Assistant machine.
