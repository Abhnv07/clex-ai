function createBootstrapFailureHandler(error) {
  console.error('Failed to initialize backend entrypoint:', error);

  return (_req, res) => {
    const payload = {
      error: {
        message: 'Backend failed to initialize.',
        type: 'server_error',
        code: 'bootstrap_failed',
        status: 500,
      },
    };

    if (process.env.NODE_ENV !== 'production' && error && typeof error.message === 'string') {
      payload.error.details = error.message;
    }

    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };
}

let handler;

try {
  const built = require('./dist/index.js');
  handler = built.default || built;
} catch (error) {
  handler = createBootstrapFailureHandler(error);
}

module.exports = handler;
