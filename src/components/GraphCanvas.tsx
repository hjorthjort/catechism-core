import { useEffect, useMemo, useRef, useState } from 'react';

import type { CatechismEdge, CatechismNode } from '../types';

type GraphCanvasProps = {
  nodes: CatechismNode[];
  edges: CatechismEdge[];
  focusId?: number | null;
  onNodeClick: (id: number) => void;
};

const partColors: Record<string, string> = {
  Prologue: '#8b5e3c',
  'Profession of Faith': '#d06b33',
  'Celebration of the Christian Mystery': '#1b7f79',
  'Life in Christ': '#2d4ea1',
  'Christian Prayer': '#7e3f98',
};

const defaultTransform = { x: 0, y: 0, k: 0.42 };

export function GraphCanvas({ nodes, edges, focusId, onNodeClick }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState(defaultTransform);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

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
    if (focusId === null || focusId === undefined) {
      return;
    }

    const node = nodeMap.get(focusId);
    if (!node || size.width === 0 || size.height === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setTransform((current) => ({
        ...current,
        x: size.width / 2 - node.position.x * current.k,
        y: size.height / 2 - node.position.y * current.k,
      }));
    });

    return () => cancelAnimationFrame(frame);
  }, [focusId, nodeMap, size.height, size.width]);

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

      if (!source || !target) {
        continue;
      }

      const isActive = hoveredId !== null && (edge.source === hoveredId || edge.target === hoveredId);
      context.strokeStyle = isActive ? 'rgba(24, 28, 35, 0.28)' : 'rgba(24, 28, 35, 0.05)';
      context.lineWidth = isActive ? 1.2 / transform.k : 0.7 / transform.k;
      context.beginPath();
      context.moveTo(source.position.x, source.position.y);
      context.lineTo(target.position.x, target.position.y);
      context.stroke();
    }

    for (const node of nodes) {
      const isHovered = hoveredId === node.id;
      const isConnected = highlighted.has(node.id);
      const fill = partColors[node.part] ?? '#6a6a6a';
      const radius = node.visualRadius / transform.k;

      context.beginPath();
      context.arc(node.position.x, node.position.y, radius, 0, Math.PI * 2);
      context.fillStyle = isHovered ? '#181c23' : fill;
      context.globalAlpha = hoveredId === null ? 0.84 : isConnected ? 1 : 0.18;
      context.fill();

      if (isHovered) {
        context.globalAlpha = 1;
        context.lineWidth = 3 / transform.k;
        context.strokeStyle = '#f5eedf';
        context.stroke();
      }
    }

    context.restore();
    context.globalAlpha = 1;
  }, [edges, highlighted, hoveredId, nodeMap, nodes, size.height, size.width, transform]);

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
      const dx = node.position.x - x;
      const dy = node.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const threshold = node.visualRadius * 2.8;

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
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const node = findNode(event.clientX, event.clientY);
    if (dragRef.current.active && node) {
      onNodeClick(node.id);
    }

    dragRef.current.active = false;
  }

  function handlePointerLeave() {
    dragRef.current.active = false;
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
      const nextScale = Math.min(2.3, Math.max(0.18, current.k * (event.deltaY > 0 ? 0.92 : 1.08)));
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
        <span>Scroll to zoom</span>
        <span>Drag to pan</span>
        <span>Click a node for full paragraph detail</span>
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
