
export interface Vector {
  x: number;
  y: number;
}

export interface Cell {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
  isPlayer: boolean;
  name: string;
  isAI: boolean;
  splitTimer: number; // For merging back
}

export interface Food {
  id: string;
  x: number;
  y: number;
  mass: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  playerCells: Cell[];
  aiPlayers: { name: string; cells: Cell[]; color: string }[];
  food: Food[];
  particles: Particle[];
  camera: Vector;
  viewport: { w: number; h: number };
  mouse: Vector;
  worldSize: number;
  isGameOver: boolean;
  totalMass: number;
}
