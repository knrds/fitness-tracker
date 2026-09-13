import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@fitness-tracker/ui';

interface CanvasGradientLike {
  addColorStop: (offset: number, color: string) => void;
}

interface Canvas2DContextLike {
  clearRect: (x: number, y: number, w: number, h: number) => void;
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  stroke: () => void;
  strokeStyle: string | CanvasGradientLike;
  globalAlpha: number;
  lineWidth: number;
  lineCap: string;
  shadowColor: string;
  shadowBlur: number;
  createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => CanvasGradientLike;
}

interface CanvasElementLike {
  width: number;
  height: number;
  getContext: (type: string) => Canvas2DContextLike | null;
}

interface SiriWaveformProps {
  active: boolean;
  width?: number;
  height?: number;
}

export function SiriWaveform({ active, width = 300, height = 90 }: SiriWaveformProps) {
  const theme = useTheme();
  const canvasRef = useRef<CanvasElementLike | null>(null);
  const [nativePhase, setNativePhase] = useState(0);

  // Web: High-performance Canvas with 3-layer chromatic Siri waveform with edge fading
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const render = () => {
      time += 0.035;
      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;

      ctx.clearRect(0, 0, w, h);

      // 3 overlapping harmonic waves with spectral chromatic offsets, subtle amplitudes
      const waves = [
        {
          color: theme.colors.primary,
          alpha: 0.75,
          freq: 0.022,
          speed: 1.6,
          amp: mid * 0.35,
          phaseOffset: 0,
          lineWidth: 2,
        },
        {
          color: theme.colors.secondary || '#38BDF8',
          alpha: 0.6,
          freq: 0.028,
          speed: -1.9,
          amp: mid * 0.28,
          phaseOffset: 1.2,
          lineWidth: 1.6,
        },
        {
          color: '#C084FC',
          alpha: 0.45,
          freq: 0.018,
          speed: 1.3,
          amp: mid * 0.22,
          phaseOffset: 2.5,
          lineWidth: 1.4,
        },
      ];

      for (const wave of waves) {
        ctx.beginPath();
        // Horizontal linear gradient to fade out left and right edges smoothly
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.18, wave.color);
        grad.addColorStop(0.82, wave.color);
        grad.addColorStop(1, 'transparent');

        ctx.strokeStyle = grad;
        ctx.globalAlpha = wave.alpha;
        ctx.lineWidth = wave.lineWidth;
        ctx.lineCap = 'round';
        ctx.shadowColor = wave.color;
        ctx.shadowBlur = 4;

        for (let x = 0; x <= w; x += 3) {
          // Bell curve envelope: 0 at edges, 1 at center
          const normX = (x / w) * 2 - 1;
          const envelope = Math.max(0, Math.pow(1 - normX * normX, 2));
          // Explicit edge fade multiplier so the stroke tapers completely to center line
          const edgeFade = Math.min(1, Math.min(x / (w * 0.18), (w - x) / (w * 0.18)));

          // Multi-harmonic modulation
          const sin1 = Math.sin(x * wave.freq + time * wave.speed + wave.phaseOffset);
          const sin2 = Math.sin(x * wave.freq * 1.6 - time * 0.9);
          const y = mid + (sin1 * 0.75 + sin2 * 0.25) * wave.amp * envelope * edgeFade;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [active, theme.colors.primary, theme.colors.secondary]);

  // Native (iOS/Android): Loop phase for SVG harmonic waves
  useEffect(() => {
    if (Platform.OS === 'web' || !active) return;
    let animId = 0;
    const loop = () => {
      setNativePhase((p) => (p + 0.04) % (Math.PI * 2));
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [active]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { width, height }]}>
        <canvas
          ref={canvasRef as unknown as React.LegacyRef<never>}
          width={width}
          height={height}
          style={{ width, height, display: 'block' }}
        />
      </View>
    );
  }

  // Native SVG Fallback: 2 smooth harmonic waves with edge fading
  const mid = height / 2;
  const generatePath = (freq: number, speed: number, amp: number, phaseOffset: number) => {
    let d = '';
    const points = 24;
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const normX = (i / points) * 2 - 1;
      const envelope = Math.max(0, Math.pow(1 - normX * normX, 2));
      const edgeFade = Math.min(1, Math.min(i / (points * 0.18), (points - i) / (points * 0.18)));
      const y =
        mid +
        Math.sin(normX * Math.PI * freq + nativePhase * speed + phaseOffset) * amp * envelope * edgeFade;
      d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="waveGradPrimary" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity="0" />
            <Stop offset="20%" stopColor={theme.colors.primary} stopOpacity="0.75" />
            <Stop offset="80%" stopColor={theme.colors.primary} stopOpacity="0.75" />
            <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="waveGradSecondary" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={theme.colors.secondary} stopOpacity="0" />
            <Stop offset="20%" stopColor="#C084FC" stopOpacity="0.6" />
            <Stop offset="80%" stopColor={theme.colors.secondary} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={theme.colors.secondary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path
          d={generatePath(2.2, 1.6, mid * 0.35, 0)}
          fill="none"
          stroke="url(#waveGradPrimary)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d={generatePath(2.8, -1.8, mid * 0.28, 1.5)}
          fill="none"
          stroke="url(#waveGradSecondary)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
