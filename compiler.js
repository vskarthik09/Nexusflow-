import { Subject } from 'rxjs';
export class RuleCompiler {
  constructor(io) { this.io = io; this.input = new Subject(); this.rules = new Map(); this.input.subscribe(point => this.evaluate(point)); }
  validate(graph) {
    const nodes = graph?.nodes || [], edges = graph?.edges || [];
    if (!nodes.length) throw new Error('Add at least one node before deploying');
    const ids = new Set(nodes.map(n => n.id));
    if (ids.size !== nodes.length) throw new Error('Node IDs must be unique');
    for (const e of edges) if (!ids.has(e.source) || !ids.has(e.target)) throw new Error('An edge references a missing node');
    const incoming = new Map(nodes.map(n => [n.id, []]));
    edges.forEach(e => incoming.get(e.target).push(e.source));
    const indegree = new Map(nodes.map(n => [n.id, incoming.get(n.id).length]));
    const queue = nodes.filter(n => indegree.get(n.id) === 0).map(n => n.id);
    let visited = 0;
    while (queue.length) { const id = queue.shift(); visited++; edges.filter(e => e.source === id).forEach(e => { indegree.set(e.target, indegree.get(e.target)-1); if (indegree.get(e.target) === 0) queue.push(e.target); }); }
    if (visited !== nodes.length) throw new Error('Rule graph contains a cycle');
    return true;
  }
  deploy(id, graph) { this.validate(graph); this.rules.set(id, { ...graph, samples: new Map() }); return { id, status: 'active' }; }
  remove(id) { this.rules.delete(id); }
  push(point) { this.input.next(point); }
  evaluate(point) {
    for (const [ruleId, graph] of this.rules) {
      const values = new Map(), nodes = graph.nodes || [], edges = graph.edges || [];
      const pending = [...nodes], processed = new Set();
      while (pending.length) {
        const index = pending.findIndex(n => edges.filter(e => e.target === n.id).every(e => processed.has(e.source)));
        if (index < 0) break;
        const n = pending.splice(index, 1)[0], parents = edges.filter(e => e.target === n.id).map(e => values.get(e.source));
        let input = parents.length ? parents[0] : point.value, output = input;
        const d = n.data || {};
        if (n.type === 'sensor' || n.type === 'dataSource') output = point.value;
        else if (n.type === 'average' || n.type === 'movingAverage') {
          const samples = graph.samples.get(n.id) || []; samples.push(Number(input)); if (samples.length > Number(d.window || 5)) samples.shift();
          graph.samples.set(n.id, samples); output = samples.reduce((a,b)=>a+b,0)/samples.length;
        } else if (n.type === 'threshold') output = Number(input) > Number(d.limit ?? 80);
        else if (n.type === 'and') output = parents.every(Boolean);
        else if (n.type === 'or') output = parents.some(Boolean);
        else if (n.type === 'sms' || n.type === 'smsAlert' || n.type === 'alert') {
          if (input === true) this.io.emit('alert', { ruleId, deviceId: point.meta?.deviceId, value: point.value, severity: d.severity || 'high', message: d.message || 'Threshold exceeded', createdAt: new Date().toISOString() });
        }
        values.set(n.id, output); processed.add(n.id);
      }
    }
  }
}
