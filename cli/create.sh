#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source $DIR/print.sh

PACKAGE_NAME=${1}
HELP="Usage: b7 create <PACKAGE_NAME>"

if [ -z "$PACKAGE_NAME" ]; then
    print_error "No package name specified"
    print_info $HELP
    exit 1;
fi

if [ -d "$PACKAGE_NAME" ]; then
    print_error "Package '$PACKAGE_NAME' already exists"
    print_info $HELP
    exit 1;
fi

mkdir $PACKAGE_NAME
cd $PACKAGE_NAME
yarn init -y
b7 install
yarn