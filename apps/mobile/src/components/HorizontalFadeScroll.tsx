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

interface HorizontalFadeScrollProps extends ScrollViewProps {
  children: React.ReactNode;
}

export const HorizontalFadeScroll: React.FC<HorizontalFadeScrollProps> = ({
  children,
  onScroll: userOnScroll,
  contentContainerStyle,
  ...props
}) => {
  const theme = useTheme();
  const [scrollX, setScrollX] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    setScrollX(contentOffset.x);
    if (userOnScroll) {
      userOnScroll(event);
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setLayoutWidth(width);
    if (props.onLayout) {
      props.onLayout(event);
    }
  };

  const handleContentSizeChange = (w: number, h: number) => {
    setContentWidth(w);
    if (props.onContentSizeChange) {
      props.onContentSizeChange(w, h);
    }
  };

  const hasScrollableContent = contentWidth > layoutWidth;
  const showLeftFade = hasScrollableContent && scrollX > 8;
  const showRightFade = hasScrollableContent && scrollX + layoutWidth < contentWidth - 8;

  const renderFade = (side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const isVisible = isLeft ? showLeftFade : showRightFade;
    if (!isVisible) return null;

    const baseColor = theme.colors.background;

    // Simulate smooth horizontal gradient fade using 8 step strips of 2px
    const widths = [2, 2, 2, 2, 2, 2, 2, 2];
    const opacities = [1.0, 0.85, 0.7, 0.55, 0.4, 0.25, 0.12, 0.04];
    const orderedOpacities = isLeft ? opacities : [...opacities].reverse();

    return (
      <View
        style={[styles.fadeContainer, isLeft ? styles.leftFade : styles.rightFade]}
        pointerEvents="none"
      >
        {widths.map((w, idx) => {
          const opacity = orderedOpacities[idx]!;
          return (
            <View
              key={idx}
              style={{
                width: w,
                height: '100%',
                backgroundColor: baseColor,
                opacity: opacity,
              }}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        contentContainerStyle={contentContainerStyle}
        {...props}
      >
        {children}
      </ScrollView>
      {renderFade('left')}
      {renderFade('right')}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  fadeContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 16,
    flexDirection: 'row',
  },
  leftFade: {
    left: 0,
  },
  rightFade: {
    right: 0,
  },
});
