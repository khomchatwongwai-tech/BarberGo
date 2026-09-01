import { listProducts } from './productRegistry';
import { corporateStore, newId } from './store';
import type { SpiderEdge, SpiderNode } from './types';

const NODE_CATEGORIES = new Set([
  'COMPANY',
  'PRODUCT',
  'SYSTEM',
  'ORGANIZATION',
  'LOCATION',
  'OPERATIONAL_DOMAIN',
  'MARKET',
  'INDEX',
  'SECTOR',
  'ETF',
  'STOCK',
  'EVENT',
  'ALERT',
  'INCIDENT',
  'RISK',
  'AI_ANALYSIS',
  'RESEARCH_REPORT',
  'WORKFLOW',
  'KPI',
  'STRATEGY',
  'DEPENDENCY',
]);

const RELATIONSHIPS = new Set([
  'DEPENDS_ON',
  'AFFECTS',
  'CORRELATED_WITH',
  'GENERATED',
  'TRIGGERED',
  'DEGRADED_BY',
  'RISK_TO',
  'SUPPORTED_BY',
  'CONTRADICTED_BY',
  'RELATED_TO',
  'OWNS',
  'USES',
  'REQUIRES',
  'IMPACTS',
]);

export function upsertNode(input: Omit<SpiderNode, 'updatedAt'> & { updatedAt?: string }): SpiderNode {
  const node: SpiderNode = {
    ...input,
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
  corporateStore().nodes.set(node.nodeId, node);
  return node;
}

export function upsertEdge(input: Omit<SpiderEdge, 'edgeId' | 'createdAt' | 'updatedAt'> & { edgeId?: string }): SpiderEdge | null {
  const confidence = Math.max(0, Math.min(1, input.confidence));
  if (confidence >= 0.8 && (!input.evidenceIds || input.evidenceIds.length === 0)) {
    return null;
  }
  if (!RELATIONSHIPS.has(input.relationshipType) || !NODE_CATEGORIES.has(
    (corporateStore().nodes.get(input.fromNode)?.category || 'PRODUCT')
  )) {
    // still allow if nodes exist
  }
  const now = new Date().toISOString();
  const edge: SpiderEdge = {
    edgeId: input.edgeId || newId('edge'),
    fromNode: input.fromNode,
    toNode: input.toNode,
    relationshipType: input.relationshipType,
    confidence,
    evidenceIds: input.evidenceIds || [],
    createdAt: now,
    updatedAt: now,
    source: input.source,
    validUntil: input.validUntil,
  };
  corporateStore().edges.set(edge.edgeId, edge);
  return edge;
}

export function seedSpiderWeb() {
  const { nodes } = corporateStore();
  if (nodes.size > 0) return;
  upsertNode({ nodeId: 'company:wongwai', category: 'COMPANY', label: 'Wongwai Group Inc', metadata: {} });
  for (const product of listProducts()) {
    upsertNode({
      nodeId: `product:${product.productId}`,
      category: 'PRODUCT',
      label: product.name,
      productId: product.productId,
      metadata: { classification: product.classification },
    });
    upsertEdge({
      fromNode: 'company:wongwai',
      toNode: `product:${product.productId}`,
      relationshipType: 'OWNS',
      confidence: 0.5,
      evidenceIds: ['registry:seed'],
      source: 'product_registry',
      validUntil: null,
    });
  }
  upsertNode({ nodeId: 'system:workqora-workflow', category: 'SYSTEM', label: 'Workqora workflow', productId: 'WORKQORA', metadata: {} });
  upsertNode({ nodeId: 'system:marketmind-realtime', category: 'SYSTEM', label: 'MarketMind realtime ingest', productId: 'MARKETMIND_AI', metadata: {} });
  upsertEdge({
    fromNode: 'product:WORKQORA',
    toNode: 'system:workqora-workflow',
    relationshipType: 'DEPENDS_ON',
    confidence: 0.7,
    evidenceIds: ['workqora:health.affectedSubsystems'],
    source: 'workqora_health',
    validUntil: null,
  });
  upsertEdge({
    fromNode: 'product:MARKETMIND_AI',
    toNode: 'system:marketmind-realtime',
    relationshipType: 'DEPENDS_ON',
    confidence: 0.4,
    evidenceIds: [],
    source: 'architecture',
    validUntil: null,
  });
  upsertEdge({
    fromNode: 'product:WONGWAI_GROUP',
    toNode: 'product:WORKQORA',
    relationshipType: 'USES',
    confidence: 0.6,
    evidenceIds: ['registry:seed'],
    source: 'product_registry',
    validUntil: null,
  });
  upsertEdge({
    fromNode: 'product:WONGWAI_GROUP',
    toNode: 'product:MARKETMIND_AI',
    relationshipType: 'USES',
    confidence: 0.6,
    evidenceIds: ['registry:seed'],
    source: 'product_registry',
    validUntil: null,
  });
}

export function listGraph(filters?: { productId?: string; relationshipType?: string }) {
  seedSpiderWeb();
  let edgeList = Array.from(corporateStore().edges.values());
  if (filters?.relationshipType) {
    edgeList = edgeList.filter((edge) => edge.relationshipType === filters.relationshipType);
  }
  const nodeList = Array.from(corporateStore().nodes.values()).filter((node) => {
    if (!filters?.productId) return true;
    return node.productId === filters.productId || node.nodeId.includes(filters.productId);
  });
  return { nodes: nodeList, edges: edgeList };
}

export function getNode(nodeId: string) {
  seedSpiderWeb();
  const node = corporateStore().nodes.get(nodeId);
  if (!node) return null;
  const edges = Array.from(corporateStore().edges.values()).filter(
    (edge) => edge.fromNode === nodeId || edge.toNode === nodeId
  );
  return { node, edges };
}

export function shortestPath(fromId: string, toId: string): string[] | null {
  seedSpiderWeb();
  const adjacency = new Map<string, string[]>();
  for (const edge of corporateStore().edges.values()) {
    const from = adjacency.get(edge.fromNode) || [];
    from.push(edge.toNode);
    adjacency.set(edge.fromNode, from);
    const to = adjacency.get(edge.toNode) || [];
    to.push(edge.fromNode);
    adjacency.set(edge.toNode, to);
  }
  const queue: string[][] = [[fromId]];
  const seen = new Set([fromId]);
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    if (last === toId) return path;
    for (const next of adjacency.get(last) || []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([...path, next]);
    }
  }
  return null;
}

export function impactFrom(nodeId: string) {
  seedSpiderWeb();
  const seen = new Set<string>([nodeId]);
  const queue = [nodeId];
  const edges: SpiderEdge[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of corporateStore().edges.values()) {
      if (edge.fromNode !== current && edge.toNode !== current) continue;
      if (edge.relationshipType === 'DEPENDS_ON' || edge.relationshipType === 'AFFECTS' || edge.relationshipType === 'IMPACTS' || edge.relationshipType === 'DEGRADED_BY' || edge.relationshipType === 'USES' || edge.relationshipType === 'REQUIRES') {
        const other = edge.fromNode === current ? edge.toNode : edge.fromNode;
        edges.push(edge);
        if (!seen.has(other)) {
          seen.add(other);
          queue.push(other);
        }
      }
    }
  }
  const nodes = Array.from(seen)
    .map((id) => corporateStore().nodes.get(id))
    .filter((node): node is SpiderNode => Boolean(node));
  return { origin: nodeId, nodes, edges };
}

export function applyHealthToGraph(productId: string, degraded: string[]) {
  seedSpiderWeb();
  if (degraded.length === 0) return;
  const evidenceId = `health:${productId}:${degraded.join(',')}`;
  upsertNode({
    nodeId: `risk:${productId}`,
    category: 'RISK',
    label: `${productId} degradation`,
    productId,
    metadata: { degraded },
  });
  upsertEdge({
    fromNode: `product:${productId}`,
    toNode: `risk:${productId}`,
    relationshipType: 'DEGRADED_BY',
    confidence: 0.75,
    evidenceIds: [evidenceId],
    source: 'health_engine',
    validUntil: null,
  });
}
