#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

declare -r -a IGNORED_URLS=(
    "https://github.com/alrra/browser-logos/commit/4406d8a2ef0f9cf1fd91cf1c9b438b2096a51bba"
    "https://web.archive.org/web"
)

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

find .  -name "*.md" \
        -not -path "./node_modules/*" \
        -exec awesome_bot \
                --allow-dupe \
                --allow-redirect \
                --set-timeout 150 \
                --white-list "$(IFS=,;printf "%s" "${IGNORED_URLS[*]}")" \
                {} +
