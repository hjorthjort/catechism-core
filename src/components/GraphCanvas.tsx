import { useEffect, useMemo, useRef, useState } from 'react';

import type { CatechismEdge, CatechismNode } from '../types';

type GraphCanvasProps = {
  nodes: CatechismNode[];
  edges: CatechismEdge[];
  focusId?: number | null;
  onNodeClick: (id: number) => void;
  showDirectionalArrows?: boolean;
  caption?: string[];
  initialScale?: number;
  fitToNodes?: boolean;
  minScreenNodeRadius?: number;
};

const partColors: Record<string, string> = {
  Prologue: '#8b5e3c',
  'Profession of Faith': '#d06b33',
  'Celebration of the Christian Mystery': '#1b7f79',
  'Life in Christ': '#2d4ea1',
  'Christian Prayer': '#7e3f98',
};

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

export function GraphCanvas({
  nodes,
  edges,
  focusId,
  onNodeClick,
  showDirectionalArrows = false,
  caption = ['Scroll to zoom', 'Drag to pan', 'Click a node for full paragraph detail'],
  initialScale = 0.42,
  fitToNodes = false,
  minScreenNodeRadius = 6.4,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    x: number;
    y: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
  });

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState(() => createDefaultTransform(initialScale));
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const edgeSet = useMemo(() => new Set(edges.map((edge) => `${edge.source}:${edge.target}`)), [edges]);
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
  const renderedPositions = useMemo(
    () =>
      new Map(
        nodes.map((node) => [node.id, getRenderedPosition(node, layoutCenter, spacingFactor)]),
      ),
    [layoutCenter, nodes, spacingFactor],
  );

  const hoveredNode = hoveredId ? nodeMap.get(hoveredId) ?? null : null;

  const highlighted = useMemo(() => {
    const active = new Set<number>();
    if (hoveredId === null) {
      return active;
    }

    active.add(hoveredId);
    for (const edge of edges) {
      if (edge.source === hoveredId) {
        active.add(edge.target);
      }
      if (edge.target === hoveredId) {
        active.add(edge.source);
      }
    }

    return active;
  }, [edges, hoveredId]);

  useEffect(() => {
    setTransform(createDefaultTransform(initialScale));
  }, [initialScale]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });

    resizeObserver.observe(containerRef.current);
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

    const width = Math.max(bounds.maxX - bounds.minX, 80);
    const height = Math.max(bounds.maxY - bounds.minY, 80);
    const padding = 64;
    const scale = Math.min(
      1.3,
      Math.max(0.18, Math.min((size.width - padding) / width, (size.height - padding) / height)),
    );
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    setTransform({
      k: scale,
      x: size.width / 2 - centerX * scale,
      y: size.height / 2 - centerY * scale,
    });
  }, [fitToNodes, nodes, size.height, size.width]);

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

    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      const sourcePosition = renderedPositions.get(edge.source);
      const targetPosition = renderedPositions.get(edge.target);

      if (!source || !target || !sourcePosition || !targetPosition) {
        continue;
      }

      const isActive = hoveredId !== null && (edge.source === hoveredId || edge.target === hoveredId);
      context.strokeStyle = isActive ? 'rgba(24, 28, 35, 0.38)' : 'rgba(24, 28, 35, 0.12)';
      context.lineWidth = isActive ? 1.8 / transform.k : 1.15 / transform.k;
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

          context.fillStyle = isActive ? 'rgba(24, 28, 35, 0.58)' : 'rgba(24, 28, 35, 0.28)';
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
      const isHovered = hoveredId === node.id;
      const isFocused = focusId === node.id;
      const isConnected = highlighted.has(node.id);
      const fill = partColors[node.part] ?? '#6a6a6a';
      const position = renderedPositions.get(node.id);
      if (!position) {
        continue;
      }

      const radius =
        getNodeScreenRadius(node, minScreenNodeRadius, transform.k, initialScale) / transform.k;

      context.beginPath();
      context.arc(position.x, position.y, radius, 0, Math.PI * 2);
      context.fillStyle = isHovered ? '#181c23' : fill;
      context.globalAlpha = hoveredId === null ? 0.84 : isConnected ? 1 : 0.18;
      context.fill();

      if (isHovered) {
        context.globalAlpha = 1;
        context.lineWidth = 3 / transform.k;
        context.strokeStyle = '#f5eedf';
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
    hoveredId,
    initialScale,
    renderedPositions,
    minScreenNodeRadius,
    nodeMap,
    nodes,
    showDirectionalArrows,
    size.height,
    size.width,
    transform,
  ]);

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
    if (dragRef.current.active) {
      const deltaX = event.clientX - dragRef.current.x;
      const deltaY = event.clientY - dragRef.current.y;
      const distanceFromStart = Math.hypot(
        event.clientX - dragRef.current.startX,
        event.clientY - dragRef.current.startY,
      );

      if (distanceFromStart > 6) {
        dragRef.current.moved = true;
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
    setHoveredId(node?.id ?? null);
    setTooltip({ x: event.clientX, y: event.clientY });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const node = findNode(event.clientX, event.clientY);
    if (dragRef.current.active && !dragRef.current.moved && node) {
      onNodeClick(node.id);
    }

    dragRef.current.active = false;
    dragRef.current.moved = false;
  }

  function handlePointerLeave() {
    dragRef.current.active = false;
    dragRef.current.moved = false;
    setHoveredId(null);
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
      const nextScale = Math.min(3.4, Math.max(0.14, current.k * (event.deltaY > 0 ? 0.92 : 1.08)));
      const worldX = (pointerX - current.x) / current.k;
      const worldY = (pointerY - current.y) / current.k;

      return {
        k: nextScale,
        x: pointerX - worldX * nextScale,
        y: pointerY - worldY * nextScale,
      };
    });
  }

  return (
    <div className="graph-shell" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />
      <div className="graph-caption">
        {caption.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {hoveredNode ? (
        <div
          className="graph-tooltip"
          style={{
            left: Math.min(tooltip.x + 18, window.innerWidth - 320),
            top: Math.max(20, tooltip.y - 36),
          }}
        >
          <div className="graph-tooltip-number">¶ {hoveredNode.id}</div>
          <div className="graph-tooltip-title">{hoveredNode.title}</div>
          <p>{hoveredNode.preview}</p>
        </div>
      ) : null}
    </div>
  );
}
