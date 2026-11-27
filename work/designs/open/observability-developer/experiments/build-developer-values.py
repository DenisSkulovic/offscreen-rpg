#!/usr/bin/env python3
"""R3 design specimen, not runtime config. Generate one dev overlay from pinned base."""
import copy
import pathlib
import sys
import yaml

base_path, out_path = map(pathlib.Path, sys.argv[1:])
base = yaml.safe_load(base_path.read_text())
original = base["alternateConfig"]
cfg = {"receivers": {"otlp/developer": {"protocols": {
    "grpc": {"endpoint": "0.0.0.0:4327"},
    "http": {"endpoint": "0.0.0.0:4328"},
}}}, "processors": {}, "service": {"pipelines": {}}}
common = [
    'resource.attributes["service.name"] != "offscreen-agent-poc" and resource.attributes["service.name"] != "offscreen-developer-proof"',
    'resource.attributes["service.namespace"] != "offscreen"',
    'resource.attributes["deployment.environment.name"] != "development"',
    'scope.name != "offscreen.operational.v1"',
]
name_pattern = "^[a-z][a-z0-9_.]{0,95}$"
candidate_values = ("vercel", "strands", "openai", "probe")
outcomes = ("ok", "error", "cancelled")

def enum_bad(path, values, optional=False):
    expr = " and ".join(f'{path} != "{value}"' for value in values)
    return f'{path} != nil and ({expr})' if optional else expr

def attr_bad(prefix):
    run = f'{prefix}.attributes["offscreen.run"]'
    candidate = f'{prefix}.attributes["offscreen.candidate"]'
    outcome = f'{prefix}.attributes["offscreen.outcome"]'
    retry = f'{prefix}.attributes["offscreen.retry"]'
    return [
        f'{run} != nil and (not IsString({run}) or not IsMatch({run}, "^[0-9a-f]{{16}}$"))',
        enum_bad(candidate, candidate_values, True),
        enum_bad(outcome, outcomes, True),
        f'{retry} != nil and (not IsInt({retry}) or {retry} < 0 or {retry} > 32)',
    ]

candidate = 'datapoint.attributes["offscreen.candidate"]'
sum_name = "offscreen.agent.runs"
gauge_name = "offscreen.agent.active"
hist_name = "offscreen.agent.duration"
cfg["processors"]["filter/developer"] = {
    "error_mode": "propagate",
    "trace_conditions": common + [f'not IsMatch(span.name, "{name_pattern}")'] + attr_bad("span"),
    "log_conditions": common + [
        'not IsString(log.body)', f'not IsMatch(log.body, "{name_pattern}")'
    ] + attr_bad("log"),
    "metric_conditions": common + [
        f'metric.name != "{sum_name}" and metric.name != "{gauge_name}" and metric.name != "{hist_name}"',
        f'metric.name == "{sum_name}" and (metric.type != METRIC_DATA_TYPE_SUM or metric.aggregation_temporality != AGGREGATION_TEMPORALITY_CUMULATIVE or metric.is_monotonic != true or metric.unit != "1")',
        f'metric.name == "{gauge_name}" and (metric.type != METRIC_DATA_TYPE_GAUGE or metric.unit != "1")',
        f'metric.name == "{hist_name}" and (metric.type != METRIC_DATA_TYPE_HISTOGRAM or metric.aggregation_temporality != AGGREGATION_TEMPORALITY_CUMULATIVE or metric.unit != "s")',
        'Len(datapoint.attributes) != 1',
        enum_bad(candidate, candidate_values),
    ]
}
resource = 'keep_keys(resource.attributes, ["service.name", "service.namespace", "deployment.environment.name"])'
scope = ['keep_keys(scope.attributes, [])', 'set(scope.version, "")']
allowed = '["offscreen.run", "offscreen.candidate", "offscreen.outcome", "offscreen.retry"]'
cfg["processors"]["transform/developer"] = {
    "error_mode": "propagate",
    "trace_statements": [resource, *scope, f'keep_keys(span.attributes, {allowed})',
        'set(span.status.message, "")', 'set(span.events, nil)', 'set(span.links, nil)',
        'set(span.trace_state, "")'],
    "log_statements": [resource, *scope, f'keep_keys(log.attributes, {allowed})',
        'set(log.event_name, "")', 'set(log.severity_text, "")'],
    "metric_statements": [resource, *scope, 'set(metric.description, "")',
        'keep_keys(metric.metadata, [])', 'set(datapoint.exemplars, nil)'],
}
for signal in ("traces", "logs", "metrics"):
    lane = copy.deepcopy(original["service"]["pipelines"][signal])
    lane["receivers"] = ["otlp/developer"]
    lane["processors"] = ["memory_limiter", "filter/developer", "transform/developer", "batch"]
    cfg["service"]["pipelines"][signal + "/developer"] = lane

overlay = {"ports": {
    "dev-otlp": {"enabled": True, "containerPort": 4327, "servicePort": 4327,
                 "protocol": "TCP", "appProtocol": "grpc"},
    "dev-otlp-http": {"enabled": True, "containerPort": 4328, "servicePort": 4328,
                      "protocol": "TCP"},
}, "alternateConfig": cfg}
out_path.write_text(yaml.safe_dump(overlay, sort_keys=False))
