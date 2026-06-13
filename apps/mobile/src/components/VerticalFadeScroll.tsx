import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ScrollViewProps,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';

import { useTheme } from '@fitness-tracker/ui';

interface VerticalFadeScrollProps extends ScrollViewProps {
  children: React.ReactNode;
  fadeColor?: string;
}

export const VerticalFadeScroll: React.FC<VerticalFadeScrollProps> = ({
  children,
  onScroll: userOnScroll,
  contentContainerStyle,
  fadeColor,
  style,
  ...props
}) => {
  const theme = useTheme();
  const [scrollY, setScrollY] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    setScrollY(contentOffset.y);
    if (userOnScroll) {
      userOnScroll(event);
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setLayoutHeight(height);
    if (props.onLayout) {
      props.onLayout(event);
    }
  };

  const handleContentSizeChange = (w: number, h: number) => {
    setContentHeight(h);
    if (props.onContentSizeChange) {
      props.onContentSizeChange(w, h);
    }
  };

  const hasScrollableContent = contentHeight > layoutHeight;
  const showTopFade = hasScrollableContent && scrollY > 8;
  const showBottomFade = hasScrollableContent && scrollY + layoutHeight < contentHeight - 8;

  const renderFade = (side: 'top' | 'bottom') => {
    const isTop = side === 'top';
    const isVisible = isTop ? showTopFade : showBottomFade;
    if (!isVisible) return null;

    const baseColor = fadeColor || theme.colors.surface;

    // Simulate smooth vertical gradient fade using 8 step strips of 2px
    const heights = [2, 2, 2, 2, 2, 2, 2, 2];
    const opacities = [1.0, 0.85, 0.7, 0.55, 0.4, 0.25, 0.12, 0.04];
    const orderedOpacities = isTop ? opacities : [...opacities].reverse();

    return (
      <View
        style={[styles.fadeContainer, isTop ? styles.topFade : styles.bottomFade]}
        pointerEvents="none"
      >
        {heights.map((h, idx) => {
          const opacity = orderedOpacities[idx]!;
          return (
            <View
              key={idx}
              style={{
                height: h,
                width: '100%',
                backgroundColor: baseColor,
                opacity: opacity,
              }}
            />
          );
        })}
      </View>
    );
  };

  const flatStyle = StyleSheet.flatten(style);
  const maxHeight = flatStyle?.maxHeight;
  const height = flatStyle?.height;

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        contentContainerStyle={contentContainerStyle}
        style={[styles.scrollView, { maxHeight, height }]}
        {...props}
      >
        {children}
      </ScrollView>
      {renderFade('top')}
      {renderFade('bottom')}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    flexShrink: 1,
  },
  scrollView: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 1,
  },
  fadeContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 16,
    flexDirection: 'column',
    zIndex: 10,
  },
  topFade: {
    top: 0,
  },
  bottomFade: {
    bottom: 0,
  },
});
