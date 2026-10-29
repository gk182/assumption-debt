#!/usr/bin/env python3
"""Reference implementation. Usage: python propagate.py <seed.json> [refute_id]
Prints ranked risk and, if refute_id is given, the cascade. Self-test: --selftest"""
import json, sys
from collections import defaultdict, deque
from pathlib import Path

def load(path):
    d = json.load(open(path, encoding="utf-8"))
    return {n["id"]: n for n in d["nodes"]}, d["edges"]

def downstream(start, edges):
    rev = defaultdict(list)
    for e in edges:
        rev[e["to"]].append(e["from"])
    seen, depth, q, cycle = {start}, {}, deque([(start, 0)]), False
    while q:
        cur, dep = q.popleft()
        for nxt in rev[cur]:
            if nxt == start:
                cycle = True
            elif nxt not in seen:
                seen.add(nxt); depth[nxt] = dep + 1; q.append((nxt, dep + 1))
    return depth, cycle

def effort(ids, nodes):
    return sum(nodes[i].get("effortWeeks", 0) for i in ids)

def risk(a, nodes, edges):
    if a["status"] != "unverified":
        return 0.0
    d, _ = downstream(a["id"], edges)
    return (1 - a.get("confidence", 0.5)) * (a.get("importance", 3) / 5) * effort(d, nodes)

def find_default_seed():
    for p in [Path.cwd(), *Path(__file__).resolve().parents]:
        target = p / "data" / "demo" / "seed.json"
        if target.is_file():
            return str(target)
    return "data/demo/seed.json"

def main():
    if "--selftest" in sys.argv:
        nodes, edges = load(find_default_seed())
        d, c = downstream("A1", edges)
        assert set(d) == {"D1", "D2", "T1"}, d
        assert abs(effort(d, nodes) - 6.0) < 1e-9
        assert not c
        # diamond counted once
        e2 = edges + [{"from": "T1", "to": "D1", "relation": "depends_on"}]
        d2, _ = downstream("A1", e2)
        assert len(d2) == 3
        # cycle does not hang
        e3 = edges + [{"from": "A1", "to": "T1", "relation": "depends_on"}]
        _, c3 = downstream("A1", e3)
        assert c3
        print("selftest ok")
        return
    nodes, edges = load(sys.argv[1])
    ranked = sorted((n for n in nodes.values() if n["type"] == "assumption"),
                    key=lambda n: -risk(n, nodes, edges))
    print("Risk ranking (higher = verify first):")
    for n in ranked:
        print(f"  {risk(n, nodes, edges):5.1f}  {n['id']}  {n['text']}")
    if len(sys.argv) > 2:
        d, c = downstream(sys.argv[2], edges)
        print(f"\nRefuted {sys.argv[2]} -> needs review ({effort(d, nodes):.1f} weeks at risk, cycle={c}):")
        for i, dep in sorted(d.items(), key=lambda x: x[1]):
            print(f"  depth {dep}: {i}  {nodes[i]['text']}")

if __name__ == "__main__":
    main()
