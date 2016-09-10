#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

generate_archive_gif() {

    convert \
        -background white \
        -alpha remove \
        -delay 30 \
        -loop 0 \
        ../archive/**/*_256x256.png \
        ../archive.gif 1> /dev/null

    print_result $? "archive.gif"

}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    is_convert_installed \
        && generate_archive_gif

}

main
