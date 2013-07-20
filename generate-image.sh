#!/usr/bin/env bash

# This script automatically generates the `all-desktop.png` image, but in
# order for it to work, you will need to have `ImageMagick Command-Line
# Tools` installed: http://www.imagemagick.org/script/command-line-tools.php.

generate_img() {

    local outputImgName=""

    if [ $(is_installed "convert") -eq 1 ]; then

        outputImgName="$1"
        shift

        # `convert` command options:
        # http://www.imagemagick.org/script/convert.php#options

        convert $@ \
                -background transparent \
                -gravity center \
                -resize 512x512 \
                -extent 562x562 \
                +append \
                $outputImgName \
        && print_success_msg "Done! 🍻 "

    else
        print_error_msg "Please install ImageMagick Command-Line Tools!"
    fi

}

is_installed() {

    #   0 = not installed
    #   1 = installed

    printf "$( [[ -x "$(command -v "$1")" ]] && printf "1" || printf "0" )"
}

print_error_msg() {
    print_msg "[0;31m$1[0m"
}

print_msg() {
    printf "\n  %s\n\n" "$1"
}

print_success_msg() {
    print_msg "[0;32m$1[0m"
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

generate_img "all-desktop.png" \
             "chrome.png" "firefox.png" "ie9-10.png" "opera.png" "safari.png"
