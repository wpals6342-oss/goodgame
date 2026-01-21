
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Cell, Food, GameState, Particle, Vector } from './types';
import { WORLD_SIZE, INITIAL_MASS, MAX_FOOD, FOOD_MASS, FRICTION, ACCEL, NEON_COLORS, AI_COUNT, MIN_SPLIT_MASS, EJECT_MASS, MERGE_TIME } from './constants';
import { getDistance, massToRadius, getSpeed, lerp, randomRange } from './utils/physics';

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const stateRef = useRef<GameState>({
    playerCells: [],
    aiPlayers: [],
    food: [],
    particles: [],
    camera: { x: 0, y: 0 },
    viewport: { w: window.innerWidth, h: window.innerHeight },
    mouse: { x: 0, y: 0 },
    worldSize: WORLD_SIZE,
    isGameOver: true,
    totalMass: 0
  });

  const [uiState, setUiState] = useState({
    mass: 0,
    leaderboard: [] as { name: string; mass: number }[],
    isGameOver: true,
    playerName: 'Player'
  });

  const [screenShake, setScreenShake] = useState(0);

  // Initialization
  const spawnFood = (count: number) => {
    const newFood: Food[] = [];
    for (let i = 0; i < count; i++) {
      newFood.push({
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        mass: FOOD_MASS,
        color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)]
      });
    }
    return newFood;
  };

  const createCell = (x: number, y: number, mass: number, color: string, name: string, isPlayer: boolean, isAI: boolean): Cell => ({
    id: Math.random().toString(36).substr(2, 9),
    x, y, vx: 0, vy: 0,
    mass,
    radius: massToRadius(mass),
    color,
    name,
    isPlayer,
    isAI,
    splitTimer: 0
  });

  const spawnAI = () => {
    const aiNames = ['Cosmo', 'Quasar', 'Nebula', 'Nova', 'Void', 'Eclipse', 'Pulsar', 'Zenith', 'Apex', 'Astro', 'Aether', 'Orbit', 'Lumina', 'Sol', 'Titan'];
    const ais = [];
    for (let i = 0; i < AI_COUNT; i++) {
      const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
      ais.push({
        name: aiNames[i % aiNames.length],
        color,
        cells: [createCell(Math.random() * WORLD_SIZE, Math.random() * WORLD_SIZE, INITIAL_MASS + Math.random() * 100, color, aiNames[i % aiNames.length], false, true)]
      });
    }
    return ais;
  };

  const startGame = (name: string) => {
    stateRef.current = {
      ...stateRef.current,
      playerCells: [createCell(WORLD_SIZE / 2, WORLD_SIZE / 2, INITIAL_MASS, '#ffffff', name || 'Player', true, false)],
      aiPlayers: spawnAI(),
      food: spawnFood(MAX_FOOD),
      particles: [],
      isGameOver: false,
      totalMass: INITIAL_MASS
    };
    setUiState(prev => ({ ...prev, isGameOver: false, playerName: name || 'Player' }));
  };

  const splitCells = (cells: Cell[], target: Vector) => {
    const newCells: Cell[] = [];
    cells.forEach(cell => {
      if (cell.mass >= MIN_SPLIT_MASS) {
        const splitMass = cell.mass / 2;
        cell.mass = splitMass;
        cell.radius = massToRadius(splitMass);
        cell.splitTimer = Date.now() + MERGE_TIME;

        const dx = target.x - cell.x;
        const dy = target.y - cell.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dist > 0 ? dx / dist : 1;
        const ny = dist > 0 ? dy / dist : 0;

        const ejected = createCell(
          cell.x + nx * cell.radius * 2,
          cell.y + ny * cell.radius * 2,
          splitMass,
          cell.color,
          cell.name,
          cell.isPlayer,
          cell.isAI
        );
        ejected.vx = nx * 30;
        ejected.vy = ny * 30;
        ejected.splitTimer = Date.now() + MERGE_TIME;
        newCells.push(ejected);
        setScreenShake(10);
      }
    });
    return [...cells, ...newCells];
  };

  const ejectMass = (cells: Cell[], target: Vector) => {
    const ejectedFood: Food[] = [];
    cells.forEach(cell => {
      if (cell.mass > 40) {
        const massValue = EJECT_MASS;
        cell.mass -= massValue;
        cell.radius = massToRadius(cell.mass);

        const dx = target.x - cell.x;
        const dy = target.y - cell.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dist > 0 ? dx / dist : 1;
        const ny = dist > 0 ? dy / dist : 0;

        ejectedFood.push({
          id: Math.random().toString(36).substr(2, 9),
          x: cell.x + nx * cell.radius * 1.5,
          y: cell.y + ny * cell.radius * 1.5,
          mass: massValue,
          color: cell.color
        });
      }
    });
    stateRef.current.food.push(...ejectedFood);
  };

  // Input Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      stateRef.current.mouse = { x: e.clientX, y: e.clientY };
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.isGameOver) return;
      if (e.code === 'Space') {
        const target = { 
          x: stateRef.current.camera.x + (stateRef.current.mouse.x - stateRef.current.viewport.w/2),
          y: stateRef.current.camera.y + (stateRef.current.mouse.y - stateRef.current.viewport.h/2)
        };
        stateRef.current.playerCells = splitCells(stateRef.current.playerCells, target);
      }
      if (e.code === 'KeyW') {
        const target = { 
          x: stateRef.current.camera.x + (stateRef.current.mouse.x - stateRef.current.viewport.w/2),
          y: stateRef.current.camera.y + (stateRef.current.mouse.y - stateRef.current.viewport.h/2)
        };
        ejectMass(stateRef.current.playerCells, target);
      }
    };
    const handleResize = () => {
      stateRef.current.viewport = { w: window.innerWidth, h: window.innerHeight };
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const update = useCallback(() => {
    const s = stateRef.current;
    if (s.isGameOver) return;

    // Update Particles
    s.particles = s.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      return p.life > 0;
    });

    // Handle Player Physics
    let avgX = 0, avgY = 0, totalPuckMass = 0;
    s.playerCells.forEach(cell => {
      const targetX = s.camera.x + (s.mouse.x - s.viewport.w / 2);
      const targetY = s.camera.y + (s.mouse.y - s.viewport.h / 2);
      
      const dx = targetX - cell.x;
      const dy = targetY - cell.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const speed = getSpeed(cell.mass);
      if (dist > 5) {
        cell.vx += (dx / dist) * ACCEL;
        cell.vy += (dy / dist) * ACCEL;
      }
      
      // Speed Cap
      const curSpeed = Math.sqrt(cell.vx * cell.vx + cell.vy * cell.vy);
      if (curSpeed > speed) {
        cell.vx = (cell.vx / curSpeed) * speed;
        cell.vy = (cell.vy / curSpeed) * speed;
      }

      cell.vx *= FRICTION;
      cell.vy *= FRICTION;
      cell.x += cell.vx;
      cell.y += cell.vy;

      // Bound Checks
      cell.x = Math.max(cell.radius, Math.min(WORLD_SIZE - cell.radius, cell.x));
      cell.y = Math.max(cell.radius, Math.min(WORLD_SIZE - cell.radius, cell.y));

      avgX += cell.x * cell.mass;
      avgY += cell.y * cell.mass;
      totalPuckMass += cell.mass;

      // Merging
      if (cell.splitTimer > 0 && Date.now() > cell.splitTimer) {
        s.playerCells.forEach(other => {
          if (cell !== other && getDistance(cell, other) < cell.radius + other.radius) {
             other.mass += cell.mass;
             other.radius = massToRadius(other.mass);
             cell.mass = 0; // Mark for removal
          }
        });
      }
    });
    s.playerCells = s.playerCells.filter(c => c.mass > 0);
    s.totalMass = totalPuckMass;

    // AI Logic
    s.aiPlayers.forEach(ai => {
      ai.cells.forEach(cell => {
        // Simple AI: Head toward nearest smaller food or player
        let target = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
        let minDist = Infinity;
        
        s.food.slice(0, 10).forEach(f => {
          const d = getDistance(cell, f);
          if (d < minDist) { minDist = d; target = f; }
        });

        const dx = target.x - cell.x;
        const dy = target.y - cell.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = getSpeed(cell.mass) * 0.8;

        if (dist > 5) {
          cell.vx += (dx / dist) * (ACCEL * 0.5);
          cell.vy += (dy / dist) * (ACCEL * 0.5);
        }
        cell.vx *= FRICTION;
        cell.vy *= FRICTION;
        cell.x += cell.vx;
        cell.y += cell.vy;

        cell.x = Math.max(cell.radius, Math.min(WORLD_SIZE - cell.radius, cell.x));
        cell.y = Math.max(cell.radius, Math.min(WORLD_SIZE - cell.radius, cell.y));
      });
    });

    // Collisions: Food
    const allCells = [...s.playerCells, ...s.aiPlayers.flatMap(ai => ai.cells)];
    s.food = s.food.filter(f => {
      for (const cell of allCells) {
        if (getDistance(cell, f) < cell.radius) {
          cell.mass += f.mass;
          cell.radius = massToRadius(cell.mass);
          return false;
        }
      }
      return true;
    });
    if (s.food.length < MAX_FOOD) s.food.push(...spawnFood(10));

    // Collisions: Cells eating cells
    for (let i = 0; i < allCells.length; i++) {
      for (let j = 0; j < allCells.length; j++) {
        if (i === j) continue;
        const a = allCells[i];
        const b = allCells[j];
        if (a.mass <= 0 || b.mass <= 0) continue;

        const dist = getDistance(a, b);
        if (dist < a.radius && a.mass > b.mass * 1.25) {
           // A eats B
           a.mass += b.mass;
           a.radius = massToRadius(a.mass);
           b.mass = 0;
           // Visual feedback
           for(let k=0; k<5; k++) {
             s.particles.push({
               x: b.x, y: b.y, 
               vx: randomRange(-5, 5), vy: randomRange(-5, 5),
               life: 30, maxLife: 30, color: b.color, size: 5
             });
           }
        }
      }
    }

    // Cleanup dead cells
    s.aiPlayers.forEach(ai => {
      ai.cells = ai.cells.filter(c => c.mass > 0);
      if (ai.cells.length === 0) {
        ai.cells = [createCell(Math.random() * WORLD_SIZE, Math.random() * WORLD_SIZE, INITIAL_MASS, ai.color, ai.name, false, true)];
      }
    });
    const playerAlive = s.playerCells.some(c => c.mass > 0);
    if (!playerAlive) {
      s.isGameOver = true;
      setUiState(prev => ({ ...prev, isGameOver: true }));
    }

    // Camera follow player
    if (playerAlive) {
      s.camera.x = lerp(s.camera.x, avgX / totalPuckMass, 0.1);
      s.camera.y = lerp(s.camera.y, avgY / totalPuckMass, 0.1);
    }

    // Update UI
    const scores = [
      { name: s.playerName, mass: Math.floor(s.totalMass) },
      ...s.aiPlayers.map(ai => ({ name: ai.name, mass: Math.floor(ai.cells.reduce((sum, c) => sum + c.mass, 0)) }))
    ].sort((a, b) => b.mass - a.mass).slice(0, 10);

    setUiState(prev => ({ ...prev, mass: Math.floor(s.totalMass), leaderboard: scores }));
    if (screenShake > 0) setScreenShake(prev => Math.max(0, prev - 1));
  }, [screenShake]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;
    ctx.clearRect(0, 0, s.viewport.w, s.viewport.h);
    
    ctx.save();
    // Zoom handling
    const zoomBase = 1.0;
    const zoomScale = Math.max(0.2, zoomBase - (s.totalMass / 5000));
    ctx.translate(s.viewport.w / 2, s.viewport.h / 2);
    ctx.scale(zoomScale, zoomScale);
    ctx.translate(-s.camera.x + (Math.random() * screenShake), -s.camera.y + (Math.random() * screenShake));

    // Draw Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    const gridSize = 100;
    const startX = Math.floor((s.camera.x - s.viewport.w / (2 * zoomScale)) / gridSize) * gridSize;
    const endX = Math.ceil((s.camera.x + s.viewport.w / (2 * zoomScale)) / gridSize) * gridSize;
    const startY = Math.floor((s.camera.y - s.viewport.h / (2 * zoomScale)) / gridSize) * gridSize;
    const endY = Math.ceil((s.camera.y + s.viewport.h / (2 * zoomScale)) / gridSize) * gridSize;

    for (let x = Math.max(0, startX); x <= Math.min(WORLD_SIZE, endX); x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, Math.max(0, startY)); ctx.lineTo(x, Math.min(WORLD_SIZE, endY)); ctx.stroke();
    }
    for (let y = Math.max(0, startY); y <= Math.min(WORLD_SIZE, endY); y += gridSize) {
      ctx.beginPath(); ctx.moveTo(Math.max(0, startX), y); ctx.lineTo(Math.min(WORLD_SIZE, endX), y); ctx.stroke();
    }

    // Draw Borders
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // Draw Food
    s.food.forEach(f => {
      ctx.fillStyle = f.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, massToRadius(f.mass), 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Particles
    s.particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;

    // Draw Cells
    const allCells = [...s.playerCells, ...s.aiPlayers.flatMap(ai => ai.cells)];
    allCells.sort((a, b) => a.mass - b.mass).forEach(cell => {
      // Glow
      ctx.shadowBlur = 20;
      ctx.shadowColor = cell.color;
      ctx.fillStyle = cell.color;
      
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Highlight/Glass effect
      const grad = ctx.createRadialGradient(cell.x - cell.radius/3, cell.y - cell.radius/3, 0, cell.x, cell.y, cell.radius);
      grad.addColorStop(0, 'rgba(255,255,255,0.3)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill();

      // Text
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.max(12, cell.radius / 2.5)}px Inter`;
      ctx.fillText(cell.name, cell.x, cell.y);
      ctx.font = `${Math.max(10, cell.radius / 4)}px Inter`;
      ctx.fillText(Math.floor(cell.mass).toString(), cell.x, cell.y + cell.radius / 2.5);
    });

    ctx.restore();
  }, [screenShake]);

  const loop = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        update();
        draw(ctx);
      }
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [loop]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white select-none">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* UI Overlays */}
      {!uiState.isGameOver && (
        <>
          {/* Leaderboard */}
          <div className="absolute top-4 right-4 w-48 bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Leaderboard</h3>
            <div className="space-y-1">
              {uiState.leaderboard.map((player, i) => (
                <div key={i} className={`flex justify-between text-sm ${player.name === uiState.playerName ? 'text-blue-400 font-bold' : 'text-slate-200'}`}>
                  <span className="truncate max-w-[100px]">{i + 1}. {player.name}</span>
                  <span>{player.mass}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mass Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
             <div className="text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
               {uiState.mass}
             </div>
             <div className="text-xs uppercase tracking-widest text-blue-400 font-bold">Current Mass</div>
          </div>

          {/* Minimap */}
          <div className="absolute bottom-4 right-4 w-32 h-32 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden p-1">
            <div className="relative w-full h-full">
              <div 
                className="absolute w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"
                style={{
                  left: `${(stateRef.current.camera.x / WORLD_SIZE) * 100}%`,
                  top: `${(stateRef.current.camera.y / WORLD_SIZE) * 100}%`,
                }}
              />
              {stateRef.current.aiPlayers.map((ai, i) => (
                ai.cells.length > 0 && (
                  <div 
                    key={i}
                    className="absolute w-1 h-1 rounded-full opacity-50"
                    style={{
                      backgroundColor: ai.color,
                      left: `${(ai.cells[0].x / WORLD_SIZE) * 100}%`,
                      top: `${(ai.cells[0].y / WORLD_SIZE) * 100}%`,
                    }}
                  />
                )
              ))}
            </div>
          </div>

          {/* Controls Help */}
          <div className="absolute bottom-4 left-4 text-[10px] text-slate-500 flex flex-col gap-1">
            <div>SPACE to split</div>
            <div>W to eject mass</div>
            <div>MOUSE to move</div>
          </div>
        </>
      )}

      {/* Start / Game Over Screen */}
      {uiState.isGameOver && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-50">
          <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col items-center text-center">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-500 mb-2 italic">NEBULA CELLS</h1>
            <p className="text-slate-400 text-sm mb-8">Devour others. Survive the void.</p>
            
            <input 
              type="text" 
              placeholder="Enter Pilot Name"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') startGame((e.target as HTMLInputElement).value);
              }}
              id="name-input"
            />

            <button 
              onClick={() => {
                const val = (document.getElementById('name-input') as HTMLInputElement).value;
                startGame(val);
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transform transition-all active:scale-95"
            >
              LAUNCH MISSION
            </button>

            <div className="mt-8 grid grid-cols-2 gap-4 w-full">
              <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5">
                <div className="text-blue-400 font-bold text-xs uppercase mb-1">Split</div>
                <div className="text-[10px] text-slate-400">Spacebar</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5">
                <div className="text-purple-400 font-bold text-xs uppercase mb-1">Eject</div>
                <div className="text-[10px] text-slate-400">W Key</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
