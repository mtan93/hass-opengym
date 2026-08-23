# Notice

This repository packages [openGym](https://github.com/arvids-unavailable/openGym) as a
Home Assistant add-on. It contains no openGym source: the add-on image is built from an
upstream checkout that is fetched at build time, pinned by `OPENGYM_REF` in
[`opengym/build.yaml`](opengym/build.yaml).

Two small adaptations are applied to that checkout at build time by
[`opengym/scripts/patch-opengym.mjs`](opengym/scripts/patch-opengym.mjs), and the icon and
logo are taken from openGym's own assets. openGym is licensed under the GNU AGPL v3.0, so
this repository is too — see [LICENSE](LICENSE).

The exercise images and animations bundled in the image come from
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (CC),
by way of the openGym repository.
