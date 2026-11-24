import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLoopbackListenPorts, parseMeminfoMiB } from './host-probe.mjs';

test('parseLoopbackListenPorts reads loopback and wildcard listeners', () => {
  const table = [
    'sl local_address rem_address st',
    '0: 0100007F:1F90 00000000:0000 0A',
    '1: 00000000:5FB1 00000000:0000 0A',
    '2: 0101017F:0050 00000000:0000 0A',
  ].join('\n');
  const ports = parseLoopbackListenPorts(table);
  assert.deepEqual(ports.sort((a, b) => a - b), [8080, 24497]);
});

test('parseMeminfoMiB converts KiB to MiB', () => {
  const values = parseMeminfoMiB('MemTotal:     8388608 kB\nMemAvailable:  4194304 kB\n');
  assert.equal(values.memAvailableMiB, 4096);
  assert.equal(values.memTotalMiB, 8192);
});