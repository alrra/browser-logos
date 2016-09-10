#!/bin/bash

cmd_exists() {
    command -v "$1" &> /dev/null
}

is_convert_installed() {

    # Check if ImageMagick's convert
    # command-line tool is installed

    if ! cmd_exists "convert"; then
        print_error_msg "Please install ImageMagick's 'convert' command-line tool!"
        return 1
    fi

    return 0

}

print_error_msg() {
    printf "\e[0;31m [✖] %s\e[0m\n" "$1"
}

print_result() {

    if [ "$1" -eq 0 ]; then
        print_success_msg "$2"
    else
        print_error_msg "$2"
    fi

    return "$1"

}

print_success_msg() {
    printf "\e[0;32m [✔] %s\e[0m\n" "$1"
}
