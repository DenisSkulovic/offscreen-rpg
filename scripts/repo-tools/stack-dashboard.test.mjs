import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressState, acceptProgress, dashboardLines, shouldUseStackDashboard, cpuPercent, cleanLine } from './stack-dashboard.mjs';
test('progress advances only on explicit matching completion', () => {
  const state = createProgressState();
  acceptProgress(state,{type:'plan',phases:['platform','images']});
  acceptProgress(state,{type:'start',id:'platform'});
  acceptProgress(state,{type:'done',id:'images'});
  assert.equal(state.completed.size,0);
  acceptProgress(state,{type:'done',id:'platform'});
  assert.equal(state.completed.size,1);
  const lines = dashboardLines(state,{elapsed:20,cpu:25,mem:{used:2*1024**3,total:4*1024**3},columns:80,rows:24});
  assert.ok(lines.some(line=>line.includes('1/2  50%')));
  assert.ok(lines.some(line=>line.includes('CPU 25%')));
});
test('plain output for CI, non-TTY, and explicit opt out', () => {
  const tty={isTTY:true};
  assert.equal(shouldUseStackDashboard(['up'],{stdout:tty,stderr:tty,env:{}}),true);
  for(const env of [{CI:'true'},{TERM:'dumb'},{OFFSCREEN_STACK_UI:'plain'},{OFFSCREEN_STACK_PROGRESS:'1'}])
    assert.equal(shouldUseStackDashboard(['up'],{stdout:tty,stderr:tty,env}),false);
  assert.equal(shouldUseStackDashboard(['status'],{stdout:tty,stderr:tty,env:{}}),false);
  assert.equal(shouldUseStackDashboard(['up'],{stdout:{},stderr:tty,env:{}}),false);
});
test('CPU uses interval deltas and log lines cannot inject ANSI', () => {
  assert.equal(cpuPercent({idle:20,total:100},{idle:70,total:200}),50);
  assert.equal(cpuPercent({idle:20,total:100},{idle:20,total:100}),null);
  assert.equal(cleanLine('\x1b[2Jhello\r'),'hello');
});

test('phase timing, substeps and compact resize retain truthful progress', () => {
  const state = createProgressState();
  acceptProgress(state,{type:'plan',phases:['platform','rollout']},0);
  acceptProgress(state,{type:'start',id:'platform'},1000);
  acceptProgress(state,{type:'substep',id:'platform',done:2,total:4,text:'postgres'},2000);
  const options = {elapsed:4,cpu:25,mem:{used:1,total:2},columns:80,rows:24,now:5000};
  assert.ok(dashboardLines(state,options).some(line=>line.includes('2/4 verified')));
  assert.ok(dashboardLines(state,options).some(line=>line.includes('4.0s')));
  acceptProgress(state,{type:'done',id:'platform'},6000);
  assert.ok(dashboardLines(state,{...options,rows:6}).some(line=>line.includes('1/2  50%')));
  assert.equal(state.timings.get('platform').end,6000);
});
