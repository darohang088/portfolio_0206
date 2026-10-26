# Rewrite wide Concat and Split nodes into trees with at most K inputs/outputs each, so every
# WebGPU shader stays under the storage-buffer limit (some GPUs allow only 8-10 per stage).
import onnx, sys
from onnx import helper, numpy_helper
K = 4
src, dst = sys.argv[1], sys.argv[2]
m = onnx.load(src)
g = m.graph
consts = {}
for n in g.node:
    if n.op_type == "Constant":
        consts[n.output[0]] = numpy_helper.to_array(n.attribute[0].t)
for t in g.initializer:
    consts[t.name] = numpy_helper.to_array(t)
new_nodes, uid = [], [0]

def name(base):
    uid[0] += 1
    return f"{base}__w{uid[0]}"

def split_tree(x, sizes, outs, axis, base):
    if len(outs) <= K:
        s = name(base + "_sizes")
        new_nodes.append(helper.make_node("Constant", [], [s], value=numpy_helper.from_array(__import__("numpy").array(sizes, dtype="int64"))))
        new_nodes.append(helper.make_node("Split", [x, s], list(outs), axis=axis, name=name(base)))
        return
    step = -(-len(outs) // K)
    groups = [(sizes[i:i + step], outs[i:i + step]) for i in range(0, len(outs), step)]
    mids = [o[0] if len(o) == 1 else name(base + "_mid") for _, o in groups]
    split_tree(x, [sum(s) for s, _ in groups], mids, axis, base)
    for (s, o), mid in zip(groups, mids):
        if len(o) > 1: split_tree(mid, s, o, axis, base)

for n in g.node:
    ins = [i for i in n.input if i]
    if n.op_type == "Concat" and len(ins) > K:
        axis = next(a.i for a in n.attribute if a.name == "axis")
        level = ins
        while len(level) > K:
            nxt = []
            for j in range(0, len(level), K):
                chunk = level[j:j + K]
                if len(chunk) == 1: nxt.append(chunk[0]); continue
                out = name(n.output[0])
                new_nodes.append(helper.make_node("Concat", chunk, [out], axis=axis, name=name(n.name)))
                nxt.append(out)
            level = nxt
        new_nodes.append(helper.make_node("Concat", level, list(n.output), axis=axis, name=n.name))
    elif n.op_type == "Split" and len(n.output) > K:
        axis = next((a.i for a in n.attribute if a.name == "axis"), 0)
        sizes = [int(v) for v in consts[n.input[1]]]
        assert len(sizes) == len(n.output)
        split_tree(n.input[0], sizes, list(n.output), axis, n.name)
    else:
        new_nodes.append(n)
del g.node[:]
g.node.extend(new_nodes)
onnx.checker.check_model(m)
onnx.save(m, dst)
print("rewrote, new nodes:", uid[0])
