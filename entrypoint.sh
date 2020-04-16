#!/bin/bash
cat >/etc/udev/rules.d/99-imager-notify.rules <<EOF
ACTION=="add|change|remove", SUBSYSTEM=="block", DRIVER=="", RUN+="/root/notify http://${UDEV_LISTEN} \$attr{size}"
EOF

exec "$@"