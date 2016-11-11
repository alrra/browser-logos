#!/bin/bash

# This script creates a new release,
# updating all the necessary files.
#
# Usage: release.sh <newversion>
#   e.g: release.sh patch
#
# See also: https://docs.npmjs.com/cli/version

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

cd "$(dirname "${BASH_SOURCE[0]}")" \
    && . "utils.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

git_commit() {
    git add -A \
        && git commit -m "v$1"
}

git_tag() {
    git tag -a "$1" -m "v$1"
}

update() {

    declare -r INPUT_FILE="../$1"
    declare -r OUTPUT_FILE="$(mktemp /tmp/XXXXX)"
    declare -r UPDATE_FUNCTION="$2"
    declare -r VERSION="$3"

    declare returnValue=0

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    if [ ! -e "$INPUT_FILE" ]; then
        print_error "'$FILE' does not exist!"
        return 1
    fi

    if [ ! -f "$INPUT_FILE" ]; then
        print_error "'$FILE' is not a regular file!"
        return 1
    fi

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    $UPDATE_FUNCTION \
        "$INPUT_FILE" \
        "$OUTPUT_FILE" \
        "$VERSION"

    if [ $? -eq 0 ]; then
        mv "$OUTPUT_FILE" "$INPUT_FILE"
    else
        returnValue=1
    fi

    rm -rf "$OUTPUT_FILE"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    return $returnValue

}

update_changelog() {

    declare -r INPUT_FILE="$1"
    declare -r OUTPUT_FILE="$2"
    declare -r RELEASE_HEADER="$3 ("$(date +"%B %-d, %Y")")"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    # Change the release header,

    if grep "HEAD" &> /dev/null < "$INPUT_FILE"; then
        sed "s/HEAD/$RELEASE_HEADER/g" \
            < "$INPUT_FILE" \
            > "$OUTPUT_FILE"

    # or add one.

    else
        printf "## %s\n\n" "$RELEASE_HEADER" \
            | cat - "$INPUT_FILE" > "$OUTPUT_FILE"
    fi

}

update_readme() {

    # Update the version numbers in `README.md`.

    sed -e 's/\([0-9.]*\)\(\.zip\)/'"$3"'\2/' \
        -e 's/\(#\)\([0-9.]*\(`\)\)/\1'"$3"'\3/' \
        < "$1" \
        > "$2"

}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main() {

    declare version=""

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    # Get the new version number, and change
    # the version in the `package.json` file.

    version="$(npm --quiet version "$1" --no-git-tag-version)" \
        || return 1

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    # Remove leading `v` from the version number.

    version="${version#v}"

    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    # Update the version number in various files,
    # commit the changes, and tag a new release.

    update "CHANGELOG.md" "update_changelog" "$version" \
        && update "README.md" "update_readme" "$version" \
        && git_commit "$version" \
        && git_tag "$version"

    print_result $? "v$version"

}

main "$@"
