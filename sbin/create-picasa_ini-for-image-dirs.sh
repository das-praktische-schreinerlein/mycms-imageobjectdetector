#!/bin/bash
# exit on error
set -e
CWD=$(pwd)
function dofail {
    cd $CWD
    printf '%s\n' "$1" >&2  ## Send message to stderr. Exclude >&2 if you don't want it that way.
    exit "${2-1}"  ## Return a code specified by $2 or 1 by default.
}

# check parameters
if [ "$#" -ne 1 ]; then
    dofail "USAGE: create-picasa_ini-for-image-dirs.sh BASEDIR\nFATAL: requires 'BASEDIR' as parameters 'import-XXXX'" 1
    exit 1
fi
BASEDIR=$1

echo "OPEN: Do you want to create '.picasa.ini' for every subdirectory of '$BASEDIR'?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) break;;
        No ) exit;;
    esac
done

echo "start - create '.picasa.ini' for every subdirectory of '$BASEDIR'"

echo "now: create '.picasa.ini' for every subdirectory of '$BASEDIR'"
if [[ ! -d "${BASEDIR}" ]]; then
    echo "FATAL: '$BASEDIR' not exists"
    dofail "USAGE: create-picasa_ini-for-image-dirs.sh BASEDIR\nFATAL: requires existing directory '$BASEDIR' as parameters 'import-XXXX'" 1
    exit 1
fi

for DIR in $BASEDIR/*/; do
   touch "$DIR/.picasa.ini"
done

echo "done - create '.picasa.ini' for every subdirectory of '$BASEDIR'"
