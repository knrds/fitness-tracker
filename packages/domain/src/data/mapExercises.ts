import { Exercise, MuscleGroup, Equipment, MovementPattern } from '../types';

/**
 * Generates a deterministic UUID-like string from an arbitrary input string.
 * This guarantees unique, valid UUIDs for offline exercises without external deps.
 */
function deterministicUUID(str: string): string {
  let hash1 = 0;
  let hash2 = 0;
  let hash3 = 0;
  let hash4 = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 * 31 + char) | 0;
    hash2 = (hash2 * 37 + char) | 0;
    hash3 = (hash3 * 41 + char) | 0;
    hash4 = (hash4 * 43 + char) | 0;
  }

  const hex1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash3).toString(16).padStart(8, '0');
  const hex4 = Math.abs(hash4).toString(16).padStart(8, '0');

  const hex = (hex1 + hex2 + hex3 + hex4).slice(0, 32);

  // Conform to UUID v4 layout (8-4-4-4-12) with version '4' and variant '8'
  const part1 = hex.slice(0, 8);
  const part2 = hex.slice(8, 12);
  const part3 = '4' + hex.slice(13, 16);
  const part4 = '8' + hex.slice(17, 20);
  const part5 = hex.slice(20, 32);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

/**
 * Maps raw equipment name from free-exercise-db to our domain Equipment enum.
 */
function mapEquipment(eq: string | null | undefined): Equipment {
  if (!eq) return Equipment.Other;
  const lower = eq.toLowerCase();
  
  if (lower.includes('dumbbell')) return Equipment.Dumbbell;
  if (lower.includes('barbell')) return Equipment.Barbell;
  if (lower.includes('cable')) return Equipment.Cable;
  if (lower.includes('machine')) return Equipment.Machine;
  if (lower.includes('body only')) return Equipment.Bodyweight;
  if (lower.includes('kettlebell')) return Equipment.Kettlebell;
  if (lower.includes('band')) return Equipment.ResistanceBand;
  if (lower.includes('medicine ball')) return Equipment.MedicineBall;
  if (lower.includes('e-z curl bar')) return Equipment.EzBar;
  if (lower.includes('foam roll')) return Equipment.Other;
  if (lower.includes('exercise ball')) return Equipment.Other;
  
  return Equipment.Other;
}

/**
 * Maps raw muscle name from free-exercise-db to our domain MuscleGroup enum.
 */
function mapMuscle(m: string): MuscleGroup | null {
  const lower = m.toLowerCase();
  
  if (lower === 'chest') return MuscleGroup.Chest;
  if (lower === 'middle back') return MuscleGroup.UpperBack;
  if (lower === 'lower back') return MuscleGroup.LowerBack;
  if (lower === 'lats') return MuscleGroup.Lats;
  if (lower === 'traps') return MuscleGroup.Traps;
  if (lower === 'biceps') return MuscleGroup.Biceps;
  if (lower === 'triceps') return MuscleGroup.Triceps;
  if (lower === 'quadriceps') return MuscleGroup.Quads;
  if (lower === 'hamstrings') return MuscleGroup.Hamstrings;
  if (lower === 'glutes') return MuscleGroup.Glutes;
  if (lower === 'shoulders') return MuscleGroup.SideDelts;
  if (lower === 'calves') return MuscleGroup.Calves;
  if (lower === 'abdominals') return MuscleGroup.Abs;
  if (lower === 'forearms') return MuscleGroup.Forearms;
  if (lower === 'neck') return MuscleGroup.Neck;
  if (lower === 'adductors') return MuscleGroup.Quads;
  if (lower === 'abductors') return MuscleGroup.Glutes;
  
  return null;
}

/**
 * Infers the movement pattern from exercise name/category.
 */
function mapMovementPattern(name: string, category: string | null | undefined): MovementPattern {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('squat')) return MovementPattern.Squat;
  if (lowerName.includes('lunge') || lowerName.includes('step-up') || lowerName.includes('step up')) return MovementPattern.Lunge;
  if (
    lowerName.includes('deadlift') || 
    lowerName.includes('good morning') || 
    lowerName.includes('hinge') || 
    lowerName.includes('clean') || 
    lowerName.includes('snatch')
  ) {
    return MovementPattern.Hinge;
  }
  if (
    lowerName.includes('bench press') || 
    lowerName.includes('push-up') || 
    lowerName.includes('pushup') || 
    lowerName.includes('chest press') || 
    lowerName.includes('dip')
  ) {
    return MovementPattern.HorizontalPush;
  }
  if (
    lowerName.includes('overhead press') || 
    lowerName.includes('shoulder press') || 
    lowerName.includes('military press') || 
    lowerName.includes('push press') || 
    lowerName.includes('arnold press')
  ) {
    return MovementPattern.VerticalPush;
  }
  if (
    lowerName.includes('row') || 
    lowerName.includes('pull-up') || 
    lowerName.includes('pullup') || 
    lowerName.includes('chin-up') || 
    lowerName.includes('chinup') || 
    lowerName.includes('pulldown') || 
    lowerName.includes('face pull')
  ) {
    return MovementPattern.HorizontalPull;
  }
  if (
    lowerName.includes('plank') || 
    lowerName.includes('crunch') || 
    lowerName.includes('sit-up') || 
    lowerName.includes('sit up') || 
    lowerName.includes('leg raise') || 
    lowerName.includes('woodchopper') || 
    lowerName.includes('ab ') || 
    lowerName.includes('core')
  ) {
    return MovementPattern.Core;
  }
  if (lowerName.includes('carry') || lowerName.includes('walk')) return MovementPattern.Carry;
  if (
    lowerName.includes('curl') || 
    lowerName.includes('extension') || 
    lowerName.includes('raise') || 
    lowerName.includes('fly') || 
    lowerName.includes('kickback') || 
    lowerName.includes('abduction') || 
    lowerName.includes('adduction') || 
    lowerName.includes('stretch')
  ) {
    return MovementPattern.Isolation;
  }

  // Category fallback
  if (category === 'cardio') return MovementPattern.Cardio;
  if (category === 'stretching') return MovementPattern.Isolation;
  
  return MovementPattern.Isolation;
}

export interface RawExercise {
  name: string;
  level?: string;
  equipment?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  category?: string;
  images?: string[];
  id: string;
}

export function mapExercises(rawData: RawExercise[]): Exercise[] {
  return rawData.map((raw) => {
    // Generate valid UUID
    const id = deterministicUUID(raw.id || raw.name);
    
    // Map primary muscles
    const primaryMuscles: MuscleGroup[] = [];
    if (raw.primaryMuscles) {
      raw.primaryMuscles.forEach((pm) => {
        const mapped = mapMuscle(pm);
        if (mapped && !primaryMuscles.includes(mapped)) {
          primaryMuscles.push(mapped);
        }
      });
    }
    // Fallback: at least one primary muscle is required by schema
    if (primaryMuscles.length === 0) {
      primaryMuscles.push(MuscleGroup.FullBody);
    }

    // Map secondary muscles
    const secondaryMuscles: MuscleGroup[] = [];
    if (raw.secondaryMuscles) {
      raw.secondaryMuscles.forEach((sm) => {
        const mapped = mapMuscle(sm);
        if (mapped && !secondaryMuscles.includes(mapped) && !primaryMuscles.includes(mapped)) {
          secondaryMuscles.push(mapped);
        }
      });
    }

    // Experience level
    let experienceLevel: Exercise['experienceLevel'] = 'beginner';
    if (raw.level === 'intermediate') experienceLevel = 'intermediate';
    else if (raw.level === 'expert' || raw.level === 'advanced') experienceLevel = 'advanced';

    // Instructions joined with newline
    const instructionsStr = raw.instructions && raw.instructions.length > 0
      ? raw.instructions.join('\n')
      : undefined;

    // Image URL
    const imageUrl = raw.images && raw.images.length > 0
      ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises/${raw.images[0]}`
      : undefined;

    const mappedEx: Exercise = {
      id,
      name: raw.name,
      primaryMuscles,
      secondaryMuscles,
      equipment: mapEquipment(raw.equipment),
      movementPattern: mapMovementPattern(raw.name, raw.category),
      isCustom: false,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      ...(instructionsStr !== undefined ? { instructions: instructionsStr } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(experienceLevel !== undefined ? { experienceLevel } : {}),
    };

    return mappedEx;
  });
}
