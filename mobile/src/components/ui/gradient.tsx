import {useRef, useState, type ReactNode} from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

let counter = 0;

type GradientProps = {
  /** Two-or-more stop colors, top-left → bottom-right by default. */
  colors: string[];
  /** Gradient vector start/end in unit space (0–1). */
  start?: {x: number; y: number};
  end?: {x: number; y: number};
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Linear-gradient surface built on react-native-svg (no extra native dep).
 *
 * The SVG is sized from the measured container (onLayout) rather than CSS
 * percentages — percentage dimensions don't resolve reliably for an absolutely
 * positioned SVG inside an auto-height container, which left gradients clipped.
 */
export function Gradient({
  colors,
  start = {x: 0, y: 0},
  end = {x: 1, y: 1},
  borderRadius = 0,
  style,
  children,
}: GradientProps) {
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) {
    counter += 1;
    idRef.current = `grad${counter}`;
  }
  const id = idRef.current;

  const [size, setSize] = useState({width: 0, height: 0});
  const onLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setSize(prev =>
      prev.width === width && prev.height === height ? prev : {width, height},
    );
  };

  const last = colors.length - 1;

  return (
    <View style={[{borderRadius, overflow: 'hidden'}, style]} onLayout={onLayout}>
      {size.width > 0 && size.height > 0 ? (
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}>
          <Defs>
            <LinearGradient
              id={id}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}>
              {colors.map((color, index) => (
                <Stop
                  key={index}
                  offset={last === 0 ? 0 : index / last}
                  stopColor={color}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            fill={`url(#${id})`}
          />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
