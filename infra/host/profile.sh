#!/usr/bin/env bash
# Shared read-only host classifier.
host_profile() {
  case "$(uname -s)" in
    Linux)
      if grep -qi 'microsoft.*wsl2' /proc/sys/kernel/osrelease; then
        echo windows-wsl
      else
        echo linux
      fi
      ;;
    Darwin) echo macos ;;
    *) echo unsupported ;;
  esac
}
