exports.error = function error(code, message, cause) {
  const err = new Error(message)
  err.code = code
  if (cause) err.cause = cause
  return err
}
