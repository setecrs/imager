#!/bin/bash

_readargs(){
DEV="${1?args: DEV OUTFILE}"
OUTFILE="${2?args: DEV OUTFILE}"
OUTDIR=${OUTFILE%/*}
}

_warningfileexists(){
if [ -e "${OUTFILE}" ]
then
  echo Warning - file already exists: ${OUTFILE}
  echo press Enter to continue, Ctrl-C to abort
  read
fi
}

_mkdir(){
mkdir -p -m 755 "${OUTDIR}"
}

# Info

_cdinfo(){
if [[ -b "${DEV}" ]]
then
    cd-info --no-device-info --dvd -C "${DEV}" | dd of="${OUTDIR}"/cd-info.txt
    cdrdao read-toc "${OUTDIR}"/toc.txt 2>&1 | dd of="${OUTDIR}"/read-toc.txt
    udevadm info --query=all --name="${DEV}" | dd of="${OUTDIR}"/udevinfo.txt
fi
}

_hdinfo(){
if [[ -b "${DEV}" ]]
then
	(date;smartctl -s on "${DEV}" && smartctl -a ${DEV})>> "${OUTDIR}"/smartctl.txt || echo -n
	(date;udevadm info --query=all --name="${DEV}") >> "${OUTDIR}"/udevinfo.txt || echo -n
fi
}

# Imager

_dd(){
dd if="${DEV}" of="${OUTFILE}" bs=${BS:-512} conv=noerror,sync
}

_dcfldd(){
dcfldd if="${DEV}" of="${OUTFILE}" bs=${BS:-512} conv=noerror,sync hash=md5 hashwindow=1G hashlog="${OUTDIR}"/hashlog.md5
}

_ddrescue(){
(( CD )) && _OPT='-b 2048'
# -r2 = 2 retries, -d direct access for input file
ddrescue "${DEV}" "${OUTFILE}" "${OUTDIR}"/ddrescue.log -r2 -d $_OPT $3 $4 $5 $6 $7
}

_ewfacquire(){
(( CD )) && _OPT='optical' || _OPT='fixed'
ewfacquire "${DEV}" -t "${OUTFILE%.E01}" -c fast -f encase6 -S 7EiB -b 64 -g 64 -u -e $(whoami) -E "${OUTDIR}" -m $_OPT || exit 1
ewfinfo "${OUTFILE}" > "${OUTDIR}"/ewfinfo.txt
}

# Hashes

_parallelhash(){
"$MYDIR"/parallelhash.sh "${OUTFILE}" "${OUTDIR}"
}

_hashdcfldd(){
dcfldd if="${OUTFILE}" of=/dev/null conv=noerror hash=md5 hashwindow=1G hashlog="${OUTDIR}"/hashlog.md5
}

# Finish

_imager.log(){
FILES="cd-info.txt read-toc.txt toc.txt ddrescue.log hashlog.* udevinfo.txt camcontrol.txt smartctl.txt dadoshd.txt ewfinfo.txt"
(
  cd "${OUTDIR}"
  for f in `ls $FILES 2>/dev/null `
  do
    echo '#######################'
    echo $f
    echo '#######################'
    cat $f
  done | dd of=imager.log
)
}

_permissions(){
chmod a-w "${OUTFILE}" "${OUTDIR}"/*.*
chmod a+rX "${OUTDIR}"
}
