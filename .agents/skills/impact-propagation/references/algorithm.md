# Algorithm

```
downstream(startId, edges):
  rev = map: to -> [from]          # who depends on X
  visited = {}; queue = [startId]; out = []
  while queue:
    cur = queue.pop()
    for dep in rev[cur]:
      if dep not in visited:
        visited.add(dep); out.append(dep); queue.push(dep)
  return out   # excludes startId even if cycle returns to it
```

Edge cases
- Self-loop or cycle back to start: ignore start in the output, report `cycleDetected: true`.
- Missing node id on an edge: skip the edge and log; never throw in the UI path.
- Depth: also return `depthById` (BFS layers) so the UI can animate the cascade layer by layer (delay = depth * 250ms).
- Re-validating a refuted assumption clears `needs_review` automatically because it is derived.
