#!/bin/sh

mkdir -p /usr/lib/oobe
cp -r public /usr/lib/oobe
cp server.js /usr/lib/oobe/oobe-server.js
cp oobe.service /lib/systemd/system

cp configure_edison /usr/bin
chmod a+x /usr/bin/configure_edison

cp start_oobe /usr/bin
chmod a+x /usr/bin/start_oobe

# systemctl enable oobe
ln -s '/lib/systemd/system/oobe.service' '/etc/systemd/system/multi-user.target.wants/oobe.service'

echo ""
echo ""
echo "SETUP COMPLETE"
echo ""
echo "Feel free to delete this folder or keep it here."
