stdloggly
=========

Start a process and send its stdout and stderr to [Loggly](http://loggly.com).

## Installation

`npm install -g stdloggly`

## Usage

`stdloggly --auth [loggly auth token] --account [loggly account] node app.js`

### Parameters

+ `-t` or `--auth`: Your loggly auth token
+ `-a` or `--account`: Your loggly account

### Options

+ `-p` or `--prefix`: An optional prefix for your logs
+ `-q` or `--quiet`: Only log to loggly; don't output anything to stdout/stderr
