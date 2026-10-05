/** @cpu/sim 的公開 API。其他套件只能從這裡 import。 */
export * from './core/types';
export type * from './core/registry';
export { Simulation, SIM_STATE_VERSION, type GameModule, type SimulationOptions, type SimState } from './core/simulation';
export type { Command, System, SystemContext } from './core/system';
export { makeCommand } from './core/system';
export { ContractError } from './core/system';
export type { GameEvent } from './core/events';
export { Rng, RngRegistry } from './core/rng';
export { hashString, stableStringify } from './core/hash';
export * from './modules/common';
export * from './modules/m01-map';
export * from './modules/m02-movement';
export * from './modules/players';
export * from './view/snapshot';
export * from './game';
