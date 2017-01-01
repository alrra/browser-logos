#!/bin/bash

# This script automatically generates:
#
#   1) all the different sized versions of a logo
#   2) and, if needed:
#
#       * main-desktop-browser-logos.png
#       * main-mobile-browser-logos.png
#       * old-browser-logos.gif
#       * src/browser-logos.gif
#
# Usage: generate-images.sh [dir] [dir] ...
#   e.g: generate-images.sh src/edge src/archive/arora

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
    -gravity center \
"

declare -r -a IMAGE_SIZES=(
    "16x16"
    "24x24"
    "32x32"
    "48x48"
    "64x64"
    "128x128"
    "256x256"
    "512x512"
)

declare -r -a MAIN_DESKTOP_BROWSERS=(
    "chrome"
    "edge"
    "firefox"
    "opera"
    "safari"
)

declare -r -a MAIN_MOBILE_BROWSERS=(
    "android"
    "chrome"
    "edge-tile"
    "opera-mini"
    "safari-ios"
    "samsung-internet"
    "uc"
)

declare -r PROJECT_ROOT="$(dirname "${BASH_SOURCE[0]}")/.."

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

generate_preview_gif() {

    # Check if the GIF needs to be regenerated.

    [ -z "$(git status --porcelain "$1")" ] \
        && return 0

    # If so, regenerate the preview GIF.

    convert -background white \
            -alpha remove \
            -delay 30 \
            -loop 0 \
            $1 \
            "$2" \
        1> /dev/null

    print_result $? "$(basename "$2")"

}

generate_different_sized_images() {

    local basename="$(basename "$1")"
    local path="$1"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    # Check if the main image exists.

    if [ ! -f "$path/$basename.png" ]; then
        print_error "$path/$basename.png does not exist!"
        return 1
    fi

    # Remove any existing outdated images.

    rm "${path}/${basename}_*" &> /dev/null

    # Generate the different sized images
    # based on the main image.

    for imageSize in "${IMAGE_SIZES[@]}"; do

        convert "$path/$basename.png" \
                $CONVERT_BASE_OPTIONS \
                -resize "$imageSize" \
                "$path/${basename}_$imageSize.png" \
            1> /dev/null

        print_result $? "$path/${basename}_$imageSize.png"

    done

}

generate_group_image() {

    declare -r -a GROUP_IMAGES=("${!1}"); shift;
    declare -r GROUP_IMAGE_NAME="$1"; shift;

    local regenerateImage=false
    local tmp=()

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    # Check if any of the specified names
    # are part of the specified group.

    for i in "$@"; do
        for j in "${GROUP_IMAGES[@]}"; do
            if [ "$(basename "$i")" == "$j" ]; then
                regenerateImage=true
                break 2
            fi
        done
    done

    ! $regenerateImage \
        && return 1

    # If so, regenerate the group image.

    for i in "${GROUP_IMAGES[@]}"; do
        tmp+=("src/$i/$i.png")
    done

    convert "${tmp[@]}" \
            $CONVERT_BASE_OPTIONS \
            -resize 512x512 \
            -extent 562x562 \
            +append \
            "$GROUP_IMAGE_NAME" \
        1> /dev/null

    print_result $? "$(basename "$GROUP_IMAGE_NAME")"

}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    # Load utils.

    . "$PROJECT_ROOT/scripts/utils.sh" \
        || exit 1

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    # Check if ImageMagick's `convert`
    # command-line tool is available.

    if ! cmd_exists "convert"; then
        print_error "Please install ImageMagick's 'convert' command-line tool!"
        return 1
    fi

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    for i in "$@"; do
        printf "\n"
        generate_different_sized_images "$i"
    done

    cd "$PROJECT_ROOT" \
        || exit 1

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    printf "\n"

    generate_preview_gif \
        "src/archive/*/*_256x256.png" \
        "src/old-browser-logos.gif"

    generate_preview_gif \
        "src/*/*_256x256.png" \
        "src/browser-logos.gif"

    printf "\n"

    generate_group_image \
        "MAIN_DESKTOP_BROWSERS[@]" \
        "src/main-desktop-browser-logos.png" \
        "$@"

    generate_group_image \
        "MAIN_MOBILE_BROWSERS[@]" \
        "src/main-mobile-browser-logos.png" \
        "$@"

}

main "${@%/}"
