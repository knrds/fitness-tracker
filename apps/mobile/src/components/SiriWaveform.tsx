import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@fitness-tracker/ui';

interface Canvas2DContextLike {
  clearRect: (x: number, y: number, w: number, h: number) => void;
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  stroke: () => void;
  strokeStyle: string;
  globalAlpha: number;
  lineWidth: number;
  lineCap: string;
  shadowColor: string;
  shadowBlur: number;
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

  // Web: High-performance Canvas with 3-layer chromatic Siri waveform
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const render = () => {
      time += 0.04;
      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;

      ctx.clearRect(0, 0, w, h);

      // 3 overlapping harmonic waves with spectral chromatic offsets
      const waves = [
        {
          color: theme.colors.primary,
          alpha: 0.85,
          freq: 0.022,
          speed: 1.8,
          amp: mid * 0.55,
          phaseOffset: 0,
          lineWidth: 3,
        },
        {
          color: theme.colors.secondary || '#38BDF8',
          alpha: 0.7,
          freq: 0.03,
          speed: -2.2,
          amp: mid * 0.45,
          phaseOffset: 1.2,
          lineWidth: 2.5,
        },
        {
          color: '#C084FC',
          alpha: 0.55,
          freq: 0.018,
          speed: 1.4,
          amp: mid * 0.38,
          phaseOffset: 2.5,
          lineWidth: 2,
        },
      ];

      for (const wave of waves) {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.globalAlpha = wave.alpha;
        ctx.lineWidth = wave.lineWidth;
        ctx.lineCap = 'round';
        ctx.shadowColor = wave.color;
        ctx.shadowBlur = 12;

        for (let x = 0; x <= w; x += 3) {
          // Bell curve envelope: 0 at edges, 1 at center
          const normX = (x / w) * 2 - 1;
          const envelope = Math.max(0, Math.pow(1 - normX * normX, 2));

          // Multi-harmonic modulation
          const sin1 = Math.sin(x * wave.freq + time * wave.speed + wave.phaseOffset);
          const sin2 = Math.sin(x * wave.freq * 1.6 - time * 0.9);
          const y = mid + (sin1 * 0.75 + sin2 * 0.25) * wave.amp * envelope;

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
      setNativePhase((p) => (p + 0.05) % (Math.PI * 2));
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

  // Native SVG Fallback: 2 smooth harmonic waves
  const mid = height / 2;
  const generatePath = (freq: number, speed: number, amp: number, phaseOffset: number) => {
    let d = '';
    const points = 24;
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const normX = (i / points) * 2 - 1;
      const envelope = Math.max(0, Math.pow(1 - normX * normX, 2));
      const y =
        mid +
        Math.sin(normX * Math.PI * freq + nativePhase * speed + phaseOffset) * amp * envelope;
      d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="waveGradPrimary" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity="0.2" />
            <Stop offset="50%" stopColor={theme.colors.primary} stopOpacity="1" />
            <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity="0.2" />
          </LinearGradient>
          <LinearGradient id="waveGradSecondary" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={theme.colors.secondary} stopOpacity="0.2" />
            <Stop offset="50%" stopColor="#C084FC" stopOpacity="0.85" />
            <Stop offset="100%" stopColor={theme.colors.secondary} stopOpacity="0.2" />
          </LinearGradient>
        </Defs>
        <Path
          d={generatePath(2.2, 1.8, mid * 0.55, 0)}
          fill="none"
          stroke="url(#waveGradPrimary)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Path
          d={generatePath(2.8, -2.1, mid * 0.42, 1.5)}
          fill="none"
          stroke="url(#waveGradSecondary)"
          strokeWidth={2.5}
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
