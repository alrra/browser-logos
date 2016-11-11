#!/bin/bash

cmd_exists() {
    command -v "$1" &> /dev/null
}

print_error() {
    printf "\e[0;31m [✖] %s\e[0m\n" "$1"
}

print_result() {

    if [ "$1" -eq 0 ]; then
        print_success "$2"
    else
        print_error "$2"
    fi

    return "$1"

}

print_success() {
    printf "\e[0;32m [✔] %s\e[0m\n" "$1"
}
