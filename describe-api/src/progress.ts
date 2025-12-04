/**
 * Progress tracker for resumable operations
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ProgressState {
  lastProcessedIndex: number;
  lastProcessedObject: string;
  totalObjects: number;
  startedAt: string;
  lastUpdatedAt: string;
  processedCount: number;
}

const PROGRESS_FILE = '.describe-progress.json';

/**
 * Save progress to file
 */
export function saveProgress(state: ProgressState, outputDir: string): void {
  const progressPath = path.join(outputDir, PROGRESS_FILE);
  fs.writeFileSync(progressPath, JSON.stringify(state, null, 2));
}

/**
 * Load progress from file
 */
export function loadProgress(outputDir: string): ProgressState | null {
  const progressPath = path.join(outputDir, PROGRESS_FILE);
  
  if (!fs.existsSync(progressPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(progressPath, 'utf-8');
    return JSON.parse(content) as ProgressState;
  } catch (error) {
    console.error('Failed to load progress:', error);
    return null;
  }
}

/**
 * Clear progress file
 */
export function clearProgress(outputDir: string): void {
  const progressPath = path.join(outputDir, PROGRESS_FILE);
  
  if (fs.existsSync(progressPath)) {
    fs.unlinkSync(progressPath);
  }
}

/**
 * Check if we should resume from previous progress
 */
export function shouldResume(outputDir: string): boolean {
  return loadProgress(outputDir) !== null;
}



