#!/bin/bash

# This script automatically generates the `main-desktop.png` and the
# `main-mobile.png` images as well as all the different sized versions
# of the logos, but in order for it to work, you will need to have
# ImageMagick's convert command-line tool installed.
#
# http://www.imagemagick.org/script/convert.php
#
# Usage: generate-images.sh [dir] [dir] ...
#   e.g: generate-images.sh chrome archive/arora

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

declare -r CONVERT_BASE_OPTIONS="\
    -colorspace RGB \
    +sigmoidal-contrast 11.6933 \
    -define filter:filter=Sinc \
    -define filter:window=Jinc \
    -define filter:lobes=3 \
    -sigmoidal-contrast 11.6933 \
    -colorspace sRGB \
    -background transparent \
    -gravity center\
"

declare -r -a IMAGE_SIZES=(
    '16x16'
    '24x24'
    '32x32'
    '48x48'
    '64x64'
    '128x128'
    '256x256'
    '512x512'
)

declare -r -a MAIN_DESKTOP_BROWSERS=(
    "chrome"
    "firefox"
    "internet-explorer"
    "opera"
    "safari"
)

declare -r -a MAIN_MOBILE_BROWSERS=(
    "android"
    "chrome-android"
    "firefox"
    "internet-explorer-tile"
    "opera-mini"
    "safari-ios"
    "uc"
)

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

generate_group_image() {

    declare -a imageDirs=("${!1}"); shift;
    local imageName="$1.png"; shift;
    local generate="false"

    # Do not regenerate the group image if
    # none of the composing images are modified

    while [ $# -ne 0 ] && [ "$generate" != "true" ]; do
        if [[ "${imageDirs[*]}" =~ "$1" ]]; then
            generate="true"
            break;
        fi
        shift
    done

    if [ "$generate" == "true" ]; then

        for i in ${imageDirs[@]}; do
            tmp+=("$i/$i.png")
        done

        convert "${tmp[@]}" \
            $CONVERT_BASE_OPTIONS \
            -resize 512x512 \
            -extent 562x562 \
            +append \
            "$imageName" \
        && print_success_msg "[create] $imageName" \
        || print_error_msg "[create] $imageName"

    fi
}

generate_images() {

    local basename=''
    local imageDirs=($@)
    local path=''

    for i in ${imageDirs[@]}; do

        basename=$(basename $i)
        path="$(dirname $i)/$basename"

        if [ ! -f "$path/$basename.png" ]; then
            print_error_msg "'$path/$basename.png' does not exist!"
            continue
        fi

        # Remove outdated images
        rm ${path}/${basename}_* &> /dev/null

        # Generate the different sized versions of the image
        for s in ${IMAGE_SIZES[@]}; do
            convert "$path/$basename.png" \
                $CONVERT_BASE_OPTIONS \
                -resize "$s" \
                "$path/${basename}_$s.png" \
            && print_success_msg "[create] $path/${basename}_$s.png" \
            || print_error_msg "[create] $path/${basename}_$s.png"
        done

    done
}

print_error_msg() {
    printf "\e[0;31m  $1\e[0m\n"
}

print_success_msg() {
    printf "\e[0;32m  $1\e[0m\n"
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    # Check if ImageMagick's convert command-line tool is installed
    if [ -x "$(command -v "convert")" ]; then

        # Ensure that the following actions
        # are made relative to the project root
        cd "$(dirname ${BASH_SOURCE[0]})"

        printf "\n"
        generate_images $@
        generate_group_image MAIN_DESKTOP_BROWSERS[@] "main-desktop" $@
        generate_group_image MAIN_MOBILE_BROWSERS[@] "main-mobile" $@
        printf "\n"

    else
        print_error_msg "Please install ImageMagick's \`convert\` command-line tool!"
    fi

}

main $@
