// Some restricted Windows automation hosts deny the token lookup used by
// libuv's os.userInfo(). Node reports that denial as ENOMEM. Tooling such as
// tsx only needs a stable username for a temporary-directory name, so provide
// the already established profile identity when the native lookup is broken.
const os = require('node:os');

try {
  os.userInfo();
} catch (error) {
  if (error?.code !== 'ERR_SYSTEM_ERROR') throw error;
  const profile = process.env.USERPROFILE || os.homedir();
  const username = require('node:path').basename(profile) || 'offscreen-user';
  os.userInfo = () => ({
    uid: -1,
    gid: -1,
    username,
    homedir: profile,
    shell: null,
  });
}
