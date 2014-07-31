#!/usr/bin/env bash

# This script automatically generates the `main-desktop.png` image as well as
# all the different sized versions of the logos. In order for it to work, you
# will need to have `ImageMagick Command-Line Tools` installed.
# http://www.imagemagick.org/script/command-line-tools.php.

# Usage: generate-images.sh [dir] [dir] ...
#   e.g: generate-images.sh chrome archive/slik ...

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

declare groupImageName="main-desktop"

declare -a imageGroup=(
    "chrome"
    "firefox"
    "internet-explorer"
    "opera"
    "safari"
)

declare -a imageSizes=(
    '16x16'
    '24x24'
    '32x32'
    '48x48'
    '64x64'
    '128x128'
    '256x256'
    '512x512'
)

declare scriptLocation="$(dirname ${BASH_SOURCE[0]})"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

generate_group_image() {

    local generateGroupImage="false"
    declare -a tmp=()

    # Do not generate new group image if none of composing images are modified
    while [ $# -ne 0 ] && [ "$generateGroupImage" != "true" ]; do
        if [[ "${imageGroup[*]}" =~ "$1" ]]; then
            generateGroupImage="true"
        fi
        shift
    done

    if [ "$generateGroupImage" == "true" ]; then

        for i in ${imageGroup[@]}; do
            tmp+=("$i/$i.png")
        done

        # `convert` command options:
        # http://www.imagemagick.org/script/convert.php#options

        convert "${tmp[@]}" \
            -colorspace RGB \
            +sigmoidal-contrast 11.6933 \
            -define filter:filter=Sinc \
            -define filter:window=Jinc \
            -define filter:lobes=3 \
            -sigmoidal-contrast 11.6933 \
            -colorspace sRGB \
            -background transparent \
            -gravity center \
            -resize 512x512 \
            -extent 562x562 \
            +append \
            "$groupImageName.png" \
        && print_success_msg "  [create]" "$groupImageName.png"

    fi
}

generate_images() {

    local basename='', imageDirs='', path=''

    imageDirs=($@)

    for i in ${imageDirs[@]}; do

        path=${i%/*}
        basename=$(basename $i)

        if [ "$path" == "$basename" ]; then
            path="$basename/$basename"
        else
            path="$path/$basename/$basename"
        fi

        # Remove outdated images
        rm ../${path}_* &> /dev/null

        # Generate the different sized versions of an image
        for s in ${imageSizes[@]}; do
            convert "${path}.png" \
                    -colorspace RGB \
                    +sigmoidal-contrast 11.6933 \
                    -define filter:filter=Sinc \
                    -define filter:window=Jinc \
                    -define filter:lobes=3 \
                    -sigmoidal-contrast 11.6933 \
                    -colorspace sRGB \
                    -background transparent \
                    -gravity center \
                    -resize "$s" \
                    "${path}_$s.png" \
            && print_success_msg "  [create]" "${path}_$s.png"
        done

    done

}

is_installed() {
    printf "$( [[ -x "$(command -v "$1")" ]] && printf "1" || printf "0" )"
    #                                       installed ──┘             │
    #                                                 not installed ──┘
}

print_error_msg() {
    printf "\e[0;31m  $1 $2\e[0m\n"
}

print_success_msg() {
    printf "\e[0;32m  $1 $2\e[0m\n"
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {
    if [ $(is_installed "convert") -eq 1 ]; then
        if [ $# -ne 0 ]; then

            # Create files relative to the project root
            cd "$scriptLocation" && cd ..

            printf "\n"
            print_success_msg "Generate images"
            printf "\n"

            generate_group_image $@ \
                && generate_images $@ \
                && (
                    printf "\n"
                    print_success_msg "Done! 🍻 "
                    printf "\n"
                )
        fi
    else
        print_error_msg "Please install ImageMagick Command-Line Tools!"
    fi
}

main $@
