# Home Assistant only passes BUILD_FROM when a (deprecated) build.yaml is present, so the
# base image is pinned here. It is a multi-arch index and buildx --platform picks the
# matching variant, which is why there is no per-architecture mapping any more.
ARG BUILD_FROM="ghcr.io/home-assistant/base:3.21"

# ---------------------------------------------------------------------------
# Stage 1 — fetch openGym, adapt it for Home Assistant, build the frontend.
#
# Built on the native architecture only. Cross-building this stage under QEMU
# is known to corrupt esbuild/rollup's platform binaries and break `vite build`
# with unrelated-looking module-resolution errors — build each arch natively.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

ARG OPENGYM_REPO=arvids-unavailable/openGym
ARG OPENGYM_REF=c42ba6b98e3776af5981f20c05ba392238799670

WORKDIR /src

RUN apk add --no-cache curl tar \
    && curl -fsSL "https://codeload.github.com/${OPENGYM_REPO}/tar.gz/${OPENGYM_REF}" \
        | tar -xz --strip-components=1

# Ingress shim + request-derived WebAuthn origin (see scripts/patch-opengym.mjs)
COPY scripts/ /opt/patch/
RUN node /opt/patch/patch-opengym.mjs /opt/patch/ingress-shim.html

RUN cd frontend && (npm ci || npm install) && npm run build
RUN cd api && (npm ci --omit=dev || npm install --omit=dev) && npm cache clean --force

# ---------------------------------------------------------------------------
# Stage 2 — the add-on image
# ---------------------------------------------------------------------------
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    NODE_ENV=production

RUN apk add --no-cache nodejs nginx tzdata

# The built app, the ~140 MB exercise image/GIF set that ships with openGym, and the API
COPY --from=build /src/frontend/dist/ /opt/opengym/www/
COPY --from=build /src/media/img/     /opt/opengym/www/img/
COPY --from=build /src/media/gif/     /opt/opengym/www/gif/
COPY --from=build /src/api/           /opt/opengym/api/

COPY rootfs /
RUN chmod a+x /etc/s6-overlay/s6-rc.d/*/run /etc/s6-overlay/s6-rc.d/*/finish

ARG BUILD_ARCH
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION
LABEL \
    io.hass.name="${BUILD_NAME}" \
    io.hass.description="${BUILD_DESCRIPTION}" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version="${BUILD_VERSION}" \
    org.opencontainers.image.title="${BUILD_NAME}" \
    org.opencontainers.image.description="${BUILD_DESCRIPTION}" \
    org.opencontainers.image.source="https://github.com/${BUILD_REPOSITORY}" \
    org.opencontainers.image.licenses="AGPL-3.0-or-later" \
    org.opencontainers.image.created=${BUILD_DATE} \
    org.opencontainers.image.revision=${BUILD_REF} \
    org.opencontainers.image.version=${BUILD_VERSION}
