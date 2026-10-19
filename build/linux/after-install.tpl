#!/bin/bash

mkdir -p /usr/local/bin

# Link to the CLI bootstrap
ln -sf '/opt/${productFilename}/resources/bin/nocturne' '/usr/local/bin/nocturne'
