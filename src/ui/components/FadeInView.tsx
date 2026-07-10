import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * 進場淡入 + 輕微上移，給等待後才出現的 AI 產出內容用（建議話題卡、研究摘要卡、AI
 * 助理回覆），避免內容在等待幾秒之後瞬間跳出的生硬感（視覺重新設計）。只在 mount
 * 時觸發一次，不需要 react-native-reanimated，RN 內建的 Animated 就夠。
 */
export function FadeInView({ children, style }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
