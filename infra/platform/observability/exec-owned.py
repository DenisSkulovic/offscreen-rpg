"""Linux parent-death wrapper. Direct exec only; no shell and no grandchildren."""

import os
import sys


def main() -> None:
    if len(sys.argv) < 4:
        raise SystemExit(2)
    expected_parent = int(sys.argv[1])
    inherited = int(sys.argv[2])
    command = sys.argv[3:]
    if inherited < 0 or len(command) == 0 or command[0] == "":
        raise SystemExit(2)

    libc = __import__("ctypes").CDLL(None, use_errno=True)
    # The signal stays with this process across exec, so the command itself dies with the parent.
    if libc.prctl(1, 9, 0, 0, 0) != 0:
        raise SystemExit(1)
    if os.getppid() != expected_parent:
        raise SystemExit(1)
    for offset in range(inherited):
        os.set_inheritable(3 + offset, True)
    os.execvp(command[0], command)


if __name__ == "__main__":
    main()
