#!/bin/bash -e
: ${2?Use $0 SOURCE OUTPUTDIR}
ORIG="$1"
PDEST="$2"
MYDIR="$(cd "$(dirname "$0")"; pwd)"
if [[ "$(uname -m)" == "x86_64" ]]
then
    MYARCH=64
else
    MYARCH=32  
fi

mkdir -p "$PDEST"

time "$MYDIR"/parallelhash"$MYARCH" -y -i "$ORIG" --sha1 "$PDEST"/hashlog.sha1,1Gi --md5 "$PDEST"/hashlog.md5,1Gi || exit 1
