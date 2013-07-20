#!/usr/bin/env bash

# This script automatically generates the `all-desktop.png` image as well as
# all the different sized versions of the logos. In order for it to work, you
# will need to have `ImageMagick Command-Line Tools` installed.
# http://www.imagemagick.org/script/command-line-tools.php.

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

declare groupImgName="all-desktop.png"

declare -a imgGroup=(
    "../chrome/chrome.png"
    "../firefox/firefox.png"
    "../ie9-10/ie9-10.png"
    "../opera/opera.png"
    "../safari/safari.png"
)

declare -a imgSizes=(
    '16x16'
    '24x24'
    '32x32'
    '48x48'
    '64x64'
    '128x128'
    '256x256'
    '512x512'
)

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

generate_group_img() {

    # `convert` command options:
    # http://www.imagemagick.org/script/convert.php#options

    convert "${imgGroup[@]}" \
            -background transparent \
            -gravity center \
            -resize 512x512 \
            -extent 562x562 \
            +append \
            "../$groupImgName" \
    && print_success_msg "  [create]" "../$groupImgName"
}

generate_imgs() {

    while read i; do

        # remove outdated images
        rm ../$i/${i}_* &> /dev/null

        # generate the different sized versions of an image
        for s in ${imgSizes[@]}; do
            convert "../$i/$i.png" \
                    -background transparent \
                    -gravity center \
                    -resize "$s" \
                    "../$i/${i}_$s.png" \
            && print_success_msg "  [create]" "../$i/${i}_$s.png"
        done

    done < <(ls -l ../ | grep '^d' | grep -v "scripts" | cut -d":" -f2 | cut -d' ' -f2-)
    #      └─ images directories

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
    printf "  %s\n" "$1"
}

print_success_msg() {
    print_msg "[0;32m$1[0m $2"
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    if [ $(is_installed "convert") -eq 1 ]; then

        print_msg ""
        print_success_msg "Generate images"
        print_msg ""

        generate_group_img \
            && generate_imgs \
            && (
                print_msg ""
                print_success_msg "Done! 🍻 "
                print_msg ""
            )

        # Optional: start ImageOptim
        # https://github.com/JamieMason/ImageOptim-CLI
        if (( "$(uname -s)" == "Darwin"
              && ( $(is_installed "imageOptim") == 1 ) )); then

            print_msg ""
            print_success_msg "Optimize images (this may take some time)"
            print_msg ""

            imageOptim --directory ../
        fi

    else
        print_error_msg "Please install ImageMagick Command-Line Tools!"
    fi

}

main
