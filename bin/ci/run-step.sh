#!/usr/bin/env bash
# [nocturne] CI step wrapper.
#
# Usage: bin/ci/run-step.sh "<step name>" <command> [args...]
#
# Runs the command, mirrors its output into ci-logs/<os>-<step>.log (uploaded as a
# diagnostics artifact), and on failure emits the tail of the log as a GitHub
# annotation. Annotations are readable through the public check-runs API, so a
# failing cloud build can be diagnosed without downloading the full job log.
set -uo pipefail

name="$1"
shift

mkdir -p ci-logs
slug="$(printf '%s' "$name" | tr -c 'A-Za-z0-9._-' '-')"
log="ci-logs/${RUNNER_OS:-local}-${slug}.log"

echo "::group::${name}"
started="$(date +%s)"
"$@" 2>&1 | tee "$log"
status="${PIPESTATUS[0]}"
elapsed="$(($(date +%s) - started))"
echo "::endgroup::"
echo "${name}: exit ${status} after ${elapsed}s"

if [ "$status" -ne 0 ]; then
  # Strip ANSI colours, keep the last lines, and encode newlines for the workflow command.
  tail_text="$(perl -pe 's/\e\[[0-9;?]*[A-Za-z]//g; s/\r//g' "$log" | tail -n 120 |
    perl -pe 's/%/%25/g' | awk '{printf "%s%%0A", $0}')"
  safe_title="$(printf '%s' "$name" | tr -d ':,')"
  echo "::error title=${safe_title} failed (exit ${status})::${tail_text}"
fi

exit "$status"
