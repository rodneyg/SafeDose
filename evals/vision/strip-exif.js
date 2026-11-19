const { stripImage } = require('./image-metadata');
if (process.argv.length !== 4) {
  console.error('Usage: node evals/vision/strip-exif.js SOURCE NEW_DESTINATION');
  process.exitCode = 1;
} else {
  stripImage(process.argv[2], process.argv[3]).then(() => console.log('Created sanitized copy. Perform visual privacy review before ingest.')).catch(() => {
    console.error('Sanitization failed. Check format, input readability and destination availability.');
    process.exitCode = 1;
  });
}
