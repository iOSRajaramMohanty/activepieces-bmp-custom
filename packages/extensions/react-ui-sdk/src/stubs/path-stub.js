/**
 * Browser-compatible path module stub
 * 
 * Provides minimal path utilities for browser environments.
 * This is used by packages like mime-types that expect Node.js path module.
 */

module.exports = {
  extname: (filename) => {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0] : '';
  },
  basename: (filename) => {
    return filename.split('/').pop() || filename;
  },
  dirname: (filename) => {
    const parts = filename.split('/');
    parts.pop();
    return parts.join('/') || '.';
  },
  join: (...paths) => {
    return paths.join('/').replace(/\/+/g, '/');
  },
  resolve: (...paths) => {
    return paths.join('/').replace(/\/+/g, '/');
  },
};
