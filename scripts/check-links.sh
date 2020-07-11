#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

declare exitCode=0
declare markdownFiles=$( \
    find . \
        -name "*.md" \
        -not -name "CHANGELOG.md" \
        -not -path "./changelogs/*" \
        -not -path "./node_modules/*" \
);

for file in $markdownFiles; do
    markdown-link-check -pv "$file" \
        || exitCode=1
done

exit $exitCode
