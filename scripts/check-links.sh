#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

find ../ -name "*.md" \
    | xargs awesome_bot --allow-dupe \
                        --allow-redirect \
                        --set-timeout 150 \
                        --white-list "https://web.archive.org/web"
