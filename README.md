stdloggly
=========
#### Send logs from anything to [Loggly](http://loggly.com)!
![stdloggly](https://raw.github.com/dscanlonpa/stdloggly/master/stdloggly.png)

* * *

## Example

#### Spawn a child process that logs to your Loggly account.
Monitor app.log, and send its contents to Loggly API.

`stdloggly --auth <loggly-auth-token> tail -f app.log`

#### You can also pipe data into stdloggly!  
Log *Parse Cloud Code* logs to Loggly.

`parse log -f | stdloggly --auth <loggly-auth-token>`

* * *

## Installing stdloggly (via npm)

`npm install -g stdloggly`

* * *

## Usage

```

  Usage: stdloggly [options] <command ...>

  Options:

    -h, --help         output usage information
    -V, --version      output the version number
    -a, --auth <auth>  Your loggly auth token
    -t, --tag [tag]    An optional (loggly) tag for logs from this process
    -b, --bulk         Send to Loggly API Bulk endpoint
    -q, --quiet        Suppress output to stdout/stderr

```

### Parameters

+ `-a` or `--auth`: Your loggly auth token

### Options

+ `-b` or `--bulk`: Send logs to Loggly API's Bulk endpoint
+ `-t` or `--tag`: An optional (Loggly) tag for logs from this process
+ `-q` or `--quiet`: Only log to loggly; don't output anything to stdout/stderr
