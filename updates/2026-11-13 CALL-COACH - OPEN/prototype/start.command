#!/bin/zsh
# Double-click in Finder to launch the Call Coach prototype (opens your browser).
cd "$(dirname "$0")" && exec node server.mjs
