export type Point = {
  x: number;
  y: number;
}

export type Boundary = {
  vertices: Point[];
  isClosed: boolean;
}

// _getBoundary(width, height) => Boundary [internal API]
// getBoundary() => Boundary [public API (what parent components use. requires width and height to
// be determined already)]

const distance = (point1: Point, point2: Point): number => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const length = (boundary: Boundary): number => {
  const { vertices, isClosed } = boundary;

  let totalLength = 0;
  for (let i = 1; i < vertices.length; i++) {
    totalLength += distance(vertices[i - 1], vertices[i]);
  }

  if (isClosed) {
    totalLength += distance(vertices[vertices.length - 1], vertices[0]);
  }

  return totalLength;
};
