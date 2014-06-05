var program = require('commander'),
    assert = require('assert'),
    debug = require('debug')('stdloggly'),
    spawn = require('child_process').spawn,
    util = require('util'),
    request = require('request'),
    requestsDispatched = 0,
    requestsFinished = 0,
    userProcessExited = false,
    userProcessArgs = [],
    sendLogDataToLogglyApi,
    handleApiResponse,
    createRequestOptions,
    userProcess,
    userProcessCommand,
    userProcessExitCode;

program
  .version('0.0.7')
  .usage('[options] <command ...>')
  .option('-a, --auth <auth>', 'Your loggly auth token')
  .option('-t, --tag [tag]', 'An optional (loggly) tag for logs from this process')
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
 * handleApiResponse
 * Logs (via debug) response from loggly api, increments count 
 * of requests finished, and if userProcess was spawned and has exited, 
 * exits this parent process with userProcessExitCode.
 * ** Only outputs if process.env['DEBUG'] (csv) includes stdloggly **
 *
 * @param <Error> error
 * @param <Response> res
 * @param <Mixed> body
 */
handleApiResponse = function handleApiResponse(error, res, body) {
  res = res || {};

  if (error) {
    debug('API REQUEST ERROR:', error);
  }

  debug('API RESPONSE BODY:', body);
  debug('API RESPONSE STATUS:', res.statusCode);

  requestsFinished++;

  if (requestsFinished >= requestsDispatched && userProcessExited) {
    debug('requestsDispatched:', requestsDispatched);
    debug('requestsFinished:', requestsFinished);
    debug('userProcessExitCode:', userProcessExitCode);

    process.exit(userProcessExitCode);
  }
}

/**
 * createRequestOptions
 * Creates a request options object to use to
 * send logs to Loggly.
 *
 * @returns <Object> logglyApiRequestOptions
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
 * sendLogDataToLogglyApi
 * Sends log data to loggly API.
 *
 * @param <String || Buffer || Number:ExitCode> logData
 * @param <String> logType
 * @param <Function> callback
 */
sendLogDataToLogglyApi = function sendLogDataToLogglyApi(logData, logType, callback) {
  // Prepare loggly api request options
  logglyApiRequestOptions = createRequestOptions();

  switch (logType) {
    // Normal logs (originating from stdout)
    case 'normal':
      if (! program.quiet && logData.length) {
        console.log(logData.toString());
      }
      logglyApiRequestOptions.body = logData;
      request(logglyApiRequestOptions, callback);
    break;

    // Error logs (originating from stderr)
    case 'error':
      if (! program.quiet && logData.length) {
        console.error(logData.toString());
      }
      logglyApiRequestOptions.body = logData;
      logglyApiRequestOptions.headers['X-LOGGLY-TAG'] += ',error';
      request(logglyApiRequestOptions, callback);
    break;

    // Exit logs from process exit
    case 'exit':
      if (! program.quiet) {
        console[(logData == 0 ? 'log' : 'error')]('%s %s exited with code:', (userProcessCommand || 'stdin'), userProcessArgs.join(' '), logData);
      }
      logglyApiRequestOptions.body = util.format('%s exited with code:', logData);
      logglyApiRequestOptions.headers['X-LOGGLY-TAG'] += ',exit';
      request(logglyApiRequestOptions, callback);
    break;
  }

  // Increment count of requests dispatched
  requestsDispatched++;
};

/**
 * USAGE:
 * stdloggly can be used one of two ways:
 *
 * 1) by passing a process command to it as arguments
 *    -> in this case stdloggly will spawn the process and monitor it.
 *
 * 2) by piping stdout/stderr into stdloggly via stdin
 *    -> similar to the first case, except stdloggly will not automatically tag errors,
 *       as all logs (whether originating at stdout or stderr) will come through stdin.
 */
if (program.args.length) {
  /**
   * Start user process
   */
  userProcessCommand = program.args.shift();
  userProcessArgs = program.args;
  userProcess = spawn(userProcessCommand, userProcessArgs, { detached: true });

  /**
   * Data received from userProcess.stdout
   */
  userProcess.stdout.on('data', function stdoutDataReceived(data) {
    sendLogDataToLogglyApi(data, 'normal', handleApiResponse);
  });

  /**
   * Data received from userProcess.stderr
   */
  userProcess.stderr.on('data', function stderrDataReceived(data) {
    sendLogDataToLogglyApi(data, 'error', handleApiResponse);
  });

  /**
   * userProcess exited with |code|.
   */
  userProcess.on('close', function exitEventReceived(code) {
    userProcessExitCode = code;
    userProcessExited = true;

    sendLogDataToLogglyApi(userProcessExitCode, 'exit', handleApiResponse);
  });
} else {

  /**
   * Data received via process.stdin
   */
  process.stdin.on('data', function stdinDataReceived(data) {
    sendLogDataToLogglyApi(data, 'normal', handleApiResponse);
  });

  /**
   * userProcess exited.
   */
  process.stdin.on('end', function processExitEventReceived() {
    userProcessExitCode = 0;
    userProcessExited = true;

    sendLogDataToLogglyApi(userProcessExitCode, 'exit', handleApiResponse);
  });
}
 
