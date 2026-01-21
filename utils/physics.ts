
import { Vector } from '../types';

export const getDistance = (p1: Vector, p2: Vector): number => {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
};

export const massToRadius = (mass: number): number => {
  return Math.sqrt(mass) * 4;
};

export const getSpeed = (mass: number): number => {
  // Larger cells are slower
  return 2.5 * Math.pow(mass, -0.45) * 100;
};

export const lerp = (start: number, end: number, amt: number): number => {
  return (1 - amt) * start + amt * end;
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};
