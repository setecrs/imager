#!/bin/bash
sed 99-imager-notify.rules -e "s|/root/|$(pwd)/|" > /etc/udev/rules.d/99-imager-notify.rules
