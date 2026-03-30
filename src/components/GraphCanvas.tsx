import { useEffect, useMemo, useRef, useState } from 'react';

import { buildNodeColorMap } from '../lib/nodePalette';
import type { CatechismEdge, CatechismNode } from '../types';

type GraphCanvasProps = {
  nodes: CatechismNode[];
  edges: CatechismEdge[];
  focusId?: number | null;
  selectedId?: number | null;
  highlightId?: number | null;
  clusterRootId?: number | null;
  onNodeClick: (id: number) => void;
  onNodeHover?: (id: number | null) => void;
  onNodeLongPress?: (id: number) => void;
  onBackgroundClick?: () => void;
  showDirectionalArrows?: boolean;
  caption?: string[];
  initialScale?: number;
  fitToNodes?: boolean;
  minScreenNodeRadius?: number;
  hoverDelayMs?: number;
};

function getTooltipHierarchy(node: CatechismNode) {
  return {
    part: node.breadcrumbs.find((entry) => entry.startsWith('Part ')) ?? node.part,
    section: node.breadcrumbs.find((entry) => entry.startsWith('Section ')) ?? 'Section: -',
    chapter: node.breadcrumbs.find((entry) => entry.startsWith('Chapter ')) ?? 'Chapter: -',
  };
}

function createDefaultTransform(scale: number) {
  return { x: 0, y: 0, k: scale };
}

function getZoomRatio(scale: number, initialScale: number) {
  return Math.max(1, scale / initialScale);
}

function getNodeScreenRadius(
  node: CatechismNode,
  minScreenNodeRadius: number,
  scale: number,
  initialScale: number,
) {
  const growthFactor = Math.min(1.85, Math.pow(getZoomRatio(scale, initialScale), 0.2));
  return Math.max(node.visualRadius, minScreenNodeRadius) * growthFactor;
}

function getSpacingFactor(scale: number, initialScale: number, fitToNodes: boolean) {
  if (fitToNodes) {
    return 1;
  }

  return Math.max(0.54, 1 / Math.pow(getZoomRatio(scale, initialScale), 0.34));
}

function getRenderedPosition(
  node: CatechismNode,
  center: { x: number; y: number },
  spacingFactor: number,
) {
  return {
    x: center.x + (node.position.x - center.x) * spacingFactor,
    y: center.y + (node.position.y - center.y) * spacingFactor,
  };
}

function getGraphBounds(nodes: CatechismNode[]) {
  if (nodes.length === 0) {
    return null;
  }

  return nodes.reduce(
    (current, node) => ({
      minX: Math.min(current.minX, node.position.x),
      maxX: Math.max(current.maxX, node.position.x),
      minY: Math.min(current.minY, node.position.y),
      maxY: Math.max(current.maxY, node.position.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function getFullGraphFitScale(
  bounds: { minX: number; maxX: number; minY: number; maxY: number } | null,
  size: { width: number; height: number },
) {
  if (!bounds || size.width === 0 || size.height === 0) {
    return 0;
  }

  const width = Math.max(bounds.maxX - bounds.minX, 80);
  const height = Math.max(bounds.maxY - bounds.minY, 80);
  const padding = 64;

  return Math.max(0.18, Math.min((size.width - padding) / width, (size.height - padding) / height));
}

function scaleAroundViewportCenter(
  current: { x: number; y: number; k: number },
  nextScale: number,
  size: { width: number; height: number },
) {
  if (current.k === nextScale) {
    return current;
  }

  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const worldX = (centerX - current.x) / current.k;
  const worldY = (centerY - current.y) / current.k;

  return {
    k: nextScale,
    x: centerX - worldX * nextScale,
    y: centerY - worldY * nextScale,
  };
}

function getTouchDistance(
  touches: Pick<React.TouchList, 'length'> & {
    [index: number]: { clientX: number; clientY: number };
  },
) {
  if (touches.length < 2) {
    return 0;
  }

  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function getTouchMidpoint(
  touches: Pick<React.TouchList, 'length'> & {
    [index: number]: { clientX: number; clientY: number };
  },
) {
  if (touches.length < 2) {
    return { x: 0, y: 0 };
  }

  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function getCanvasPointFromClient(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

export function GraphCanvas({
  nodes,
  edges,
  focusId,
  selectedId,
  highlightId,
  clusterRootId,
  onNodeClick,
  onNodeHover,
  onNodeLongPress,
  onBackgroundClick,
  showDirectionalArrows = false,
  caption = ['Scroll to zoom', 'Drag to pan', 'Click a node for full paragraph detail'],
  initialScale = 0.42,
  fitToNodes = false,
  minScreenNodeRadius = 6.4,
  hoverDelayMs = 100,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    longPressTriggered: boolean;
    moved: boolean;
    pressedNodeId: number | null;
    startX: number;
    startY: number;
    x: number;
    y: number;
  }>({
    active: false,
    longPressTriggered: false,
    moved: false,
    pressedNodeId: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
  });
  const holdTimerRef = useRef<number | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const touchRef = useRef<{
    mode: 'idle' | 'tap' | 'gesture';
    moved: boolean;
    startX: number;
    startY: number;
    pressedNodeId: number | null;
    startDistance: number;
    startMidpoint: { x: number; y: number };
    startTransform: { x: number; y: number; k: number };
  }>({
    mode: 'idle',
    moved: false,
    startX: 0,
    startY: 0,
    pressedNodeId: null,
    startDistance: 0,
    startMidpoint: { x: 0, y: 0 },
    startTransform: { x: 0, y: 0, k: initialScale },
  });

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState(() => createDefaultTransform(initialScale));
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const nodeColors = useMemo(() => buildNodeColorMap(nodes), [nodes]);
  const edgeSet = useMemo(() => new Set(edges.map((edge) => `${edge.source}:${edge.target}`)), [edges]);
  const graphBounds = useMemo(() => getGraphBounds(nodes), [nodes]);
  const clusterNeighborIds = useMemo(() => {
    const neighbors = new Set<number>();
    if (clusterRootId === null || clusterRootId === undefined) {
      return neighbors;
    }

    for (const edge of edges) {
      if (edge.source === clusterRootId) {
        neighbors.add(edge.target);
      }
      if (edge.target === clusterRootId) {
        neighbors.add(edge.source);
      }
    }

    return neighbors;
  }, [clusterRootId, edges]);
  const layoutCenter = useMemo(() => {
    if (nodes.length === 0) {
      return { x: 0, y: 0 };
    }

    const bounds = nodes.reduce(
      (current, node) => ({
        minX: Math.min(current.minX, node.position.x),
        maxX: Math.max(current.maxX, node.position.x),
        minY: Math.min(current.minY, node.position.y),
        maxY: Math.max(current.maxY, node.position.y),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    );

    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }, [nodes]);
  const spacingFactor = useMemo(
    () => getSpacingFactor(transform.k, initialScale, fitToNodes),
    [fitToNodes, initialScale, transform.k],
  );
  const minZoomScale = useMemo(() => getFullGraphFitScale(graphBounds, size), [graphBounds, size]);
  const renderedPositions = useMemo(
    () => {
      const basePositions = new Map(
        nodes.map((node) => [node.id, getRenderedPosition(node, layoutCenter, spacingFactor)]),
      );

      if (clusterRootId === null || clusterRootId === undefined) {
        return basePositions;
      }

      const rootPosition = basePositions.get(clusterRootId);
      if (!rootPosition) {
        return basePositions;
      }

      const clusteredPositions = new Map(basePositions);
      for (const neighborId of clusterNeighborIds) {
        const neighborPosition = basePositions.get(neighborId);
        if (!neighborPosition) {
          continue;
        }

        clusteredPositions.set(neighborId, {
          x: rootPosition.x + (neighborPosition.x - rootPosition.x) * 0.2,
          y: rootPosition.y + (neighborPosition.y - rootPosition.y) * 0.2,
        });
      }

      return clusteredPositions;
    },
    [clusterNeighborIds, clusterRootId, layoutCenter, nodes, spacingFactor],
  );

  const hoveredNode = hoveredId ? nodeMap.get(hoveredId) ?? null : null;
  const hoveredHierarchy = hoveredNode ? getTooltipHierarchy(hoveredNode) : null;
  const activeHighlightId = highlightId ?? null;

  const highlighted = useMemo(() => {
    const active = new Set<number>();
    if (activeHighlightId === null || activeHighlightId === undefined) {
      return active;
    }

    let frontier = new Set([activeHighlightId]);
    active.add(activeHighlightId);

    for (let depth = 0; depth < 2; depth += 1) {
      const nextFrontier = new Set<number>();

      for (const edge of edges) {
        if (frontier.has(edge.source) && !active.has(edge.target)) {
          active.add(edge.target);
          nextFrontier.add(edge.target);
        }

        if (frontier.has(edge.target) && !active.has(edge.source)) {
          active.add(edge.source);
          nextFrontier.add(edge.source);
        }
      }

      if (nextFrontier.size === 0) {
        break;
      }

      frontier = nextFrontier;
    }

    return active;
  }, [activeHighlightId, edges]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
      }
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setTransform(createDefaultTransform(initialScale));
  }, [initialScale]);

  useEffect(() => {
    if (fitToNodes || minZoomScale === 0) {
      return;
    }

    setTransform((current) =>
      current.k >= minZoomScale ? current : scaleAroundViewportCenter(current, minZoomScale, size),
    );
  }, [fitToNodes, minZoomScale, size]);

  useEffect(() => {
    if (!stageRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });

    resizeObserver.observe(stageRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (fitToNodes || focusId === null || focusId === undefined) {
      return;
    }

    const node = nodeMap.get(focusId);
    if (!node || size.width === 0 || size.height === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setTransform((current) => ({
        ...current,
        x:
          size.width / 2 -
          getRenderedPosition(node, layoutCenter, getSpacingFactor(current.k, initialScale, fitToNodes)).x *
            current.k,
        y:
          size.height / 2 -
          getRenderedPosition(node, layoutCenter, getSpacingFactor(current.k, initialScale, fitToNodes)).y *
            current.k,
      }));
    });

    return () => cancelAnimationFrame(frame);
  }, [fitToNodes, focusId, initialScale, layoutCenter, nodeMap, size.height, size.width]);

  useEffect(() => {
    if (!fitToNodes || nodes.length === 0 || size.width === 0 || size.height === 0) {
      return;
    }

    if (!graphBounds) {
      return;
    }

    const scale = Math.min(1.3, getFullGraphFitScale(graphBounds, size));
    const centerX = (graphBounds.minX + graphBounds.maxX) / 2;
    const centerY = (graphBounds.minY + graphBounds.maxY) / 2;

    setTransform({
      k: scale,
      x: size.width / 2 - centerX * scale,
      y: size.height / 2 - centerY * scale,
    });
  }, [fitToNodes, graphBounds, nodes.length, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = size.width * devicePixelRatio;
    canvas.height = size.height * devicePixelRatio;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    context.fillStyle = '#f5eedf';
    context.fillRect(0, 0, size.width, size.height);

    context.save();
    context.translate(transform.x, transform.y);
    context.scale(transform.k, transform.k);

    context.lineCap = 'round';
    context.lineJoin = 'round';
    const hasActiveHighlight = activeHighlightId !== null && activeHighlightId !== undefined;

    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      const sourcePosition = renderedPositions.get(edge.source);
      const targetPosition = renderedPositions.get(edge.target);

      if (!source || !target || !sourcePosition || !targetPosition) {
        continue;
      }

      const isActive = hasActiveHighlight && highlighted.has(edge.source) && highlighted.has(edge.target);
      context.strokeStyle = isActive
        ? 'rgba(24, 28, 35, 0.72)'
        : hasActiveHighlight
          ? 'rgba(24, 28, 35, 0.045)'
          : 'rgba(24, 28, 35, 0.12)';
      context.lineWidth = isActive ? 2 / transform.k : hasActiveHighlight ? 0.95 / transform.k : 1.15 / transform.k;
      context.beginPath();
      context.moveTo(sourcePosition.x, sourcePosition.y);
      context.lineTo(targetPosition.x, targetPosition.y);
      context.stroke();

      if (showDirectionalArrows && !edgeSet.has(`${edge.target}:${edge.source}`)) {
        const dx = targetPosition.x - sourcePosition.x;
        const dy = targetPosition.y - sourcePosition.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0.01) {
          const unitX = dx / length;
          const unitY = dy / length;
          const arrowSize = 8 / transform.k;
          const targetRadius =
            (getNodeScreenRadius(target, minScreenNodeRadius, transform.k, initialScale) + 1.4) /
            transform.k;
          const tipX = targetPosition.x - unitX * targetRadius;
          const tipY = targetPosition.y - unitY * targetRadius;
          const baseX = tipX - unitX * arrowSize;
          const baseY = tipY - unitY * arrowSize;
          const normalX = -unitY;
          const normalY = unitX;

          context.fillStyle = isActive
            ? 'rgba(24, 28, 35, 0.8)'
            : hasActiveHighlight
              ? 'rgba(24, 28, 35, 0.1)'
              : 'rgba(24, 28, 35, 0.28)';
          context.beginPath();
          context.moveTo(tipX, tipY);
          context.lineTo(baseX + normalX * (arrowSize * 0.55), baseY + normalY * (arrowSize * 0.55));
          context.lineTo(baseX - normalX * (arrowSize * 0.55), baseY - normalY * (arrowSize * 0.55));
          context.closePath();
          context.fill();
        }
      }
    }

    for (const node of nodes) {
      const isPrimaryHighlighted = activeHighlightId === node.id;
      const isFocused = focusId === node.id || selectedId === node.id;
      const isHovered = hoveredId === node.id;
      const isConnected = highlighted.has(node.id);
      const hasActiveHighlight = activeHighlightId !== null && activeHighlightId !== undefined;
      const fill = nodeColors.get(node.id)?.solid ?? '#6a6a6a';
      const position = renderedPositions.get(node.id);
      if (!position) {
        continue;
      }

      const baseRadius =
        getNodeScreenRadius(node, minScreenNodeRadius, transform.k, initialScale) / transform.k;
      const radius = isPrimaryHighlighted ? baseRadius * 2 : isHovered ? baseRadius * 1.65 : baseRadius;

      context.beginPath();
      context.arc(position.x, position.y, radius, 0, Math.PI * 2);
      context.fillStyle = isPrimaryHighlighted ? '#181c23' : fill;
      context.globalAlpha = hasActiveHighlight ? (isConnected || isHovered ? 1 : 0.18) : isHovered ? 1 : 0.84;
      context.fill();

      if (isPrimaryHighlighted) {
        context.globalAlpha = 1;
        context.lineWidth = 3.4 / transform.k;
        context.strokeStyle = '#f5eedf';
        context.stroke();
      } else if (isHovered) {
        context.globalAlpha = 1;
        context.lineWidth = 2.8 / transform.k;
        context.strokeStyle = '#181c23';
        context.stroke();
      } else if (isFocused) {
        context.globalAlpha = 1;
        context.lineWidth = 2.8 / transform.k;
        context.strokeStyle = '#181c23';
        context.stroke();
      }
    }

    context.restore();
    context.globalAlpha = 1;
  }, [
    edgeSet,
    edges,
    focusId,
    fitToNodes,
    highlighted,
    activeHighlightId,
    hoveredId,
    initialScale,
    renderedPositions,
    minScreenNodeRadius,
    nodeMap,
    nodeColors,
    nodes,
    selectedId,
    showDirectionalArrows,
    size.height,
    size.width,
    transform,
  ]);

  function clearHoldTimer() {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function clearHoverTimer() {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  function scheduleHover(nextHoveredId: number | null) {
    clearHoverTimer();

    if (hoverDelayMs <= 0) {
      setHoveredId(nextHoveredId);
      onNodeHover?.(nextHoveredId);
      return;
    }

    hoverTimerRef.current = window.setTimeout(() => {
      setHoveredId(nextHoveredId);
      onNodeHover?.(nextHoveredId);
      hoverTimerRef.current = null;
    }, hoverDelayMs);
  }

  function findNode(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - transform.x) / transform.k;
    const y = (clientY - rect.top - transform.y) / transform.k;

    let nearest: CatechismNode | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const node of nodes) {
      const position = renderedPositions.get(node.id);
      if (!position) {
        continue;
      }

      const dx = position.x - x;
      const dy = position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const threshold =
        getNodeScreenRadius(node, minScreenNodeRadius, transform.k, initialScale) * 2.8;

      if (distance < threshold && distance < bestDistance) {
        nearest = node;
        bestDistance = distance;
      }
    }

    return nearest;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'touch') {
      return;
    }

    if (dragRef.current.active) {
      const deltaX = event.clientX - dragRef.current.x;
      const deltaY = event.clientY - dragRef.current.y;
      const distanceFromStart = Math.hypot(
        event.clientX - dragRef.current.startX,
        event.clientY - dragRef.current.startY,
      );

      if (distanceFromStart > 6) {
        dragRef.current.moved = true;
        clearHoldTimer();
      }

      dragRef.current.x = event.clientX;
      dragRef.current.y = event.clientY;

      setTransform((current) => ({
        ...current,
        x: current.x + deltaX,
        y: current.y + deltaY,
      }));
      return;
    }

    const node = findNode(event.clientX, event.clientY);
    scheduleHover(node?.id ?? null);
    setTooltip({ x: event.clientX, y: event.clientY });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'touch') {
      return;
    }

    const node = findNode(event.clientX, event.clientY);

    dragRef.current = {
      active: true,
      longPressTriggered: false,
      moved: false,
      pressedNodeId: node?.id ?? null,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
    };

    if (node && onNodeLongPress) {
      clearHoldTimer();
      holdTimerRef.current = window.setTimeout(() => {
        dragRef.current.longPressTriggered = true;
        onNodeLongPress(node.id);
        holdTimerRef.current = null;
      }, 1000);
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'touch') {
      return;
    }

    clearHoldTimer();
    const node = findNode(event.clientX, event.clientY);
    if (
      dragRef.current.active &&
      !dragRef.current.moved &&
      !dragRef.current.longPressTriggered &&
      node
    ) {
      onNodeClick(node.id);
    } else if (
      dragRef.current.active &&
      !dragRef.current.moved &&
      !dragRef.current.longPressTriggered &&
      !node
    ) {
      onBackgroundClick?.();
    }

    dragRef.current.active = false;
    dragRef.current.longPressTriggered = false;
    dragRef.current.moved = false;
    dragRef.current.pressedNodeId = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerLeave() {
    clearHoldTimer();
    dragRef.current.active = false;
    dragRef.current.longPressTriggered = false;
    dragRef.current.moved = false;
    dragRef.current.pressedNodeId = null;
    scheduleHover(null);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLCanvasElement>) {
    scheduleHover(null);
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (event.touches.length >= 2) {
      const startMidpointClient = getTouchMidpoint(event.touches);
      clearHoldTimer();
      touchRef.current = {
        mode: 'gesture',
        moved: true,
        startX: 0,
        startY: 0,
        pressedNodeId: null,
        startDistance: getTouchDistance(event.touches),
        startMidpoint: getCanvasPointFromClient(canvas, startMidpointClient.x, startMidpointClient.y),
        startTransform: transform,
      };
      event.preventDefault();
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const node = findNode(touch.clientX, touch.clientY);
    touchRef.current = {
      mode: 'tap',
      moved: false,
      startX: touch.clientX,
      startY: touch.clientY,
      pressedNodeId: node?.id ?? null,
      startDistance: 0,
      startMidpoint: { x: 0, y: 0 },
      startTransform: transform,
    };

    if (node && onNodeLongPress) {
      clearHoldTimer();
      holdTimerRef.current = window.setTimeout(() => {
        onNodeLongPress(node.id);
        holdTimerRef.current = null;
      }, 1000);
    }
  }

  function handleTouchMove(event: React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (event.touches.length >= 2) {
      const startMidpointClient = getTouchMidpoint(event.touches);
      const gesture =
        touchRef.current.mode === 'gesture'
          ? touchRef.current
          : {
              ...touchRef.current,
              mode: 'gesture' as const,
              startDistance: getTouchDistance(event.touches),
              startMidpoint: getCanvasPointFromClient(canvas, startMidpointClient.x, startMidpointClient.y),
              startTransform: transform,
            };
      touchRef.current = gesture;
      clearHoldTimer();

      const currentDistance = Math.max(getTouchDistance(event.touches), 1);
      const currentMidpointClient = getTouchMidpoint(event.touches);
      const currentMidpoint = getCanvasPointFromClient(
        canvas,
        currentMidpointClient.x,
        currentMidpointClient.y,
      );
      const nextScale = Math.min(
        3.4,
        Math.max(
          minZoomScale || 0.14,
          gesture.startTransform.k * (currentDistance / Math.max(gesture.startDistance, 1)),
        ),
      );
      const worldX = (gesture.startMidpoint.x - gesture.startTransform.x) / gesture.startTransform.k;
      const worldY = (gesture.startMidpoint.y - gesture.startTransform.y) / gesture.startTransform.k;

      setTransform({
        k: nextScale,
        x: currentMidpoint.x - worldX * nextScale,
        y: currentMidpoint.y - worldY * nextScale,
      });
      event.preventDefault();
      return;
    }

    const touch = event.touches[0];
    if (!touch || touchRef.current.mode !== 'tap') {
      return;
    }

    const movedDistance = Math.hypot(
      touch.clientX - touchRef.current.startX,
      touch.clientY - touchRef.current.startY,
    );
    if (movedDistance > 10) {
      touchRef.current.moved = true;
      clearHoldTimer();
    }
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLCanvasElement>) {
    const wasTap = touchRef.current.mode === 'tap' && !touchRef.current.moved;
    clearHoldTimer();

    if (event.touches.length === 0 && wasTap) {
      const touch = event.changedTouches[0];
      const node = touch ? findNode(touch.clientX, touch.clientY) : null;

      if (node) {
        onNodeClick(node.id);
      } else {
        onBackgroundClick?.();
      }
    }

    if (event.touches.length < 2) {
      touchRef.current = {
        mode: 'idle',
        moved: false,
        startX: 0,
        startY: 0,
        pressedNodeId: null,
        startDistance: 0,
        startMidpoint: { x: 0, y: 0 },
        startTransform: transform,
      };
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    setTransform((current) => {
      const nextScale = Math.min(3.4, Math.max(minZoomScale || 0.14, current.k * (event.deltaY > 0 ? 0.92 : 1.08)));
      const worldX = (pointerX - current.x) / current.k;
      const worldY = (pointerY - current.y) / current.k;

      return {
        k: nextScale,
        x: pointerX - worldX * nextScale,
        y: pointerY - worldY * nextScale,
      };
    });
  }

  const tooltipMaxWidth = Math.min(300, Math.max(220, window.innerWidth - 32));
  const tooltipLeft =
    tooltip.x + 18 + tooltipMaxWidth > window.innerWidth - 16
      ? Math.max(16, tooltip.x - tooltipMaxWidth - 18)
      : tooltip.x + 18;

  return (
    <div className="graph-shell" ref={shellRef}>
      <div className="graph-canvas-stage" ref={stageRef}>
        <canvas
        ref={canvasRef}
        onPointerCancel={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        onWheel={handleWheel}
      />
      </div>
      <div className="graph-caption">
        {caption.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {hoveredNode ? (
        <div
          className="graph-tooltip"
          style={{
            left: tooltipLeft,
            top: Math.max(20, tooltip.y - 36),
          }}
        >
          {hoveredHierarchy ? (
            <div className="graph-tooltip-hierarchy">
              <div>{hoveredHierarchy.part}</div>
              <div>{hoveredHierarchy.section}</div>
              <div>{hoveredHierarchy.chapter}</div>
            </div>
          ) : null}
          <div className="graph-tooltip-number">¶ {hoveredNode.id}</div>
          <div className="graph-tooltip-title">{hoveredNode.title}</div>
          <p>{hoveredNode.preview}</p>
        </div>
      ) : null}
    </div>
  );
}
