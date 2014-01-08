var program = require('commander'),
    assert = require('assert'),
    spawn = require('child_process').spawn,
    util = require('util'),
    request = require('request'),
    requestsDispatched = 0,
    requestsFinished = 0,
    userProcessExited = false,
    _LOG_LOGGLY_API_RESPONSES = false,
    logApiResponse,
    createRequestOptions,
    userProcess,
    userProcessCommand,
    userProcessArgs,
    userProcessExitCode;

program
  .version('0.0.4')
  .description('start <process> & send its stdout/stderr to loggly')
  .option('-a, --auth <auth>', 'Your loggly auth token')
  .option('-t, --tag [tag]', 'An optional tag for this process\'s logs')
  .option('-b, --bulk', 'Send to Loggly API Bulk endpoint')
  .option('-q, --quiet', 'Suppress output to stdout/stderr')
  .parse(process.argv);

try {
  assert(program.auth, 'Missing required argument --auth <auth>');
} catch (error) {
  console.error(error.message);
  process.exit(1);
};

/**
 * Log response from loggly api
 */
function logApiResponse(error, res, body) {
  if (! _LOG_LOGGLY_API_RESPONSES) {
    return;
  }

  if (error) {
    console.error('API REQUEST ERROR: error');
  }

  console.log('API RESPONSE BODY:', body);
  console.log('RESPONSE STATUS:', res.statusCode);

  requestsFinished++;

  if (requestsDispatched <= requestsFinished && userProcessExited) {
    console.log('requestsDispatched:', requestsDispatched);
    console.log('requestsFinished:', requestsFinished);
    console.log('userProcessExitCode:', userProcessExitCode);

    process.exit(userProcessExitCode);
  }
}

/**
 * Prepare to log to loggly
 */
createRequestOptions = function createRequestOptions() {
 return {
    url: util.format('https://logs-01.loggly.com/%s/%s/', (program.bulk ? 'bulk' : 'inputs'), program.auth),
    method: 'POST',
    headers: {
      'X-LOGGLY-TAG': program.tag
    },
    body: null
  };
};

/**
 * Start user process
 */
userProcessCommand = program.args.shift();
userProcessArgs = program.args;
userProcess = spawn(userProcessCommand, userProcessArgs, { detached: true });

/**
 * Data received from userProcess.stdout
 * -> Log to loggly.
 * -> Log to stdout if !program.quiet
 */
userProcess.stdout.on('data', function stdoutDataReceived(data) {
  if (! program.quiet && data.length) {
    console.log(data.toString());
  }

  logglyApiRequestOptions = createRequestOptions();

  logglyApiRequestOptions.body = data;
  request(logglyApiRequestOptions, logApiResponse);

  requestsDispatched++;
});

/**
 * Data received from userProcess.stderr
 * -> Log to loggly.
 * -> Log to stderr if !program.quiet
 */
userProcess.stderr.on('data', function stderrDataReceived(data) {
  if (! program.quiet && data.length) {
    console.error(data.toString());
  }

  logglyApiRequestOptions = createRequestOptions();

  logglyApiRequestOptions.body = data;
  logglyApiRequestOptions.headers['X-LOGGLY-TAG'] += ',error';
  request(logglyApiRequestOptions, logApiResponse);

  requestsDispatched++;
});

/**
 * userProcess exited with |code|.
 * -> Log to loggly.
 * -> Log to stdout/stderr(0:1) if !program.quiet
 * -> process.exit(code)
 */
userProcess.on('close', function exitEventReceived(code) {
  userProcessExitCode = code;
  userProcessExited = true;

  if (! program.quiet) {
    console[(code == 0 ? 'log' : 'error')]('userProcess exited with code:', code);
  }

  logglyApiRequestOptions = createRequestOptions();

  logglyApiRequestOptions.body = util.format('{ exitCode: %s }', code);
  logglyApiRequestOptions.headers['X-LOGGLY-TAG'] += ',exit';
  request(logglyApiRequestOptions, logApiResponse);

  requestsDispatched++;
});


