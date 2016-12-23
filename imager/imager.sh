#!/bin/bash -ex
MYDIR="$(cd "$(dirname "$0")"; pwd)"
source $MYDIR/functions.sh

_readargs "$@"

#    if                   then        else
(( ${CD:-0} ))            && _BS=2048 || _BS=512
BS=${BS:-$_BS}

(( ${WARN:-0} ))          && _warningfileexists
(( ${MKDIR:-1} ))         && _mkdir
(( ${CD:-0} ))            && _cdinfo
(( ${HD:-1} ))            && _hdinfo


(( ${DD:-0} ))            && _dd            && OK=1
(( ${DCFLDD:-0} ))        && _dcfldd        && OK=1
(( ${DDRESCUE:-1} ))      && _ddrescue "$@" && OK=1
(( ${EWF:-0} ))           && _ewfacquire    && OK=1

(( $OK )) || exit 1

(( ${PARALLELHASH:-1} ))  && _parallelhash
(( ${HASHDCFLDD:-0} ))    && _hashdcfldd

(( ${LOG:-1} ))           && _imager.log
(( ${PERMISSIONS:-1} ))   && _permissions
