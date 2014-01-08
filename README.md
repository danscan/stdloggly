stdloggly
=========

Run program... Stdout and stderr go to your loggly account.

# Installation

`npm install -g stdloggly`

# Usage

`stdloggly --auth [loggly auth token] --account [loggly account] node app.js`

## Parameters

`-t` or `--auth`: Your loggly auth token
`-a` or `--account`: Your loggly account

## Options

`-p` or `--prefix`: An optional prefix for your logs
`-q` or `--quiet`: Only log to loggly; don't output anything to stdout/stderr
