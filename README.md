# openGym — Home Assistant add-on

Runs [openGym](https://github.com/arvids-unavailable/openGym) — a self-hosted workout
planner, gym logger and body-weight tracker — as a Home Assistant add-on, in the sidebar
next to everything else.

<img src="opengym/logo.png" alt="openGym" width="480">

## Install

1. In Home Assistant, go to **Settings → Add-ons → Add-on store**.
2. From the **⋮** menu, choose **Repositories**, and add:

   ```
   https://github.com/mtan93/hass-opengym
   ```

3. Find **openGym** in the store and click **Install**.

   This downloads a prebuilt image, so it takes about as long as any other add-on —
   nothing is compiled on your Home Assistant machine.

4. Click **Start**, then **Open Web UI**.

## What you get

| | |
| --- | --- |
| **Sidebar panel** | openGym appears in the Home Assistant sidebar, through Ingress — no extra port, no extra login. |
| **Your data stays put** | Profiles, passkeys and workout history live in the add-on's `/data` volume, so they survive updates and are covered by Home Assistant backups. |
| **Exercise library included** | The ~140 MB image and GIF set ships inside the add-on image; nothing is fetched at runtime. |
| **Optional direct port** | Map port `8080` if you also want to reach openGym on its own address, e.g. to install it as a PWA. |

## Passkeys, in one paragraph

openGym signs you in with a passkey, and browsers only allow that in a **secure context** —
HTTPS, or `localhost`. If you reach Home Assistant at `http://192.168.x.x:8123`, creating a
profile will fail; over Home Assistant Cloud, a TLS reverse proxy, or `http://localhost:8123`
it works. The add-on figures out the expected passkey origin from the address you actually
used, so there is normally nothing to configure. The exception is Home Assistant sitting
behind *another* reverse proxy that Home Assistant doesn't know about — then list your real
URL under the `origins` option.

Full option-by-option notes are in [the add-on documentation](opengym/DOCS.md).

## How the image is built

`.github/workflows/build.yaml` builds one image per architecture on a native runner and
pushes it to GHCR, tagged with the add-on version. `image:` in
[`opengym/config.yaml`](opengym/config.yaml) points Home Assistant at those, so installing
is a pull.

Building on the Home Assistant machine instead — by removing the `image:` line — works but
is not recommended: it downloads the openGym source and runs a Vite build, which is enough
to get killed for running out of memory on a small box.

Both GHCR packages must be **public**, or Home Assistant gets a 403 on install.

## Updating openGym

1. Bump `OPENGYM_REF` in [`opengym/Dockerfile`](opengym/Dockerfile) to the upstream commit
   you want.
2. Bump `version` in [`opengym/config.yaml`](opengym/config.yaml).
3. Push. CI publishes an image tagged with the new version, and Home Assistant offers the
   update — in that order, because Home Assistant pulls `<image>:<version>` and will fail
   if the tag doesn't exist yet.

## License

AGPL-3.0-or-later, same as openGym. See [NOTICE.md](NOTICE.md).
