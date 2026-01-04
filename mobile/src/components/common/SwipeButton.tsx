import React, { useState } from 'react';
import { StyleSheet, View, Text, LayoutChangeEvent } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedGestureHandler,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    runOnJS,
    interpolate,
    Extrapolate,
    withTiming,
} from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import Icon from 'react-native-vector-icons/MaterialIcons';

const BUTTON_HEIGHT = 60;
const PADDING = 5;
const SWIPEABLE_DIMENSIONS = BUTTON_HEIGHT - 2 * PADDING;

interface SwipeButtonProps {
    onSwipeComplete: () => void;
    title: string;
    iconName?: string;
    color?: string;
    backgroundColor?: string;
    width?: number;
    enabled?: boolean;
}

const SwipeButton: React.FC<SwipeButtonProps> = ({
    onSwipeComplete,
    title,
    iconName = 'arrow-forward',
    color = colors.primary,
    backgroundColor = colors.indigo50,
    enabled = true,
}) => {
    const [containerWidth, setContainerWidth] = useState(0);
    const translateX = useSharedValue(0);
    const isCompleted = useSharedValue(false);

    const onLayout = (event: LayoutChangeEvent) => {
        setContainerWidth(event.nativeEvent.layout.width);
    };

    const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number }>({
        onStart: (_, ctx) => {
            if (isCompleted.value || !enabled) return;
            ctx.startX = translateX.value;
        },
        onActive: (event, ctx) => {
            if (isCompleted.value || !enabled) return;
            const maxTranslate = containerWidth - BUTTON_HEIGHT;
            translateX.value = Math.min(Math.max(ctx.startX + event.translationX, 0), maxTranslate);
        },
        onEnd: () => {
            if (isCompleted.value || !enabled) return;
            const maxTranslate = containerWidth - BUTTON_HEIGHT;
            if (translateX.value > maxTranslate * 0.7) {
                translateX.value = withTiming(maxTranslate, { duration: 200 });
                isCompleted.value = true;
                runOnJS(onSwipeComplete)();
            } else {
                translateX.value = withSpring(0);
            }
        },
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    // Text stays centered and always visible
    const textStyle = useAnimatedStyle(() => {
        const maxTranslate = containerWidth - BUTTON_HEIGHT;
        return {
            opacity: interpolate(
                translateX.value,
                [0, maxTranslate],
                [1, 0.4],
                Extrapolate.CLAMP
            ),
        };
    });

    const arrowStyle = useAnimatedStyle(() => {
        const maxTranslate = containerWidth - BUTTON_HEIGHT;
        return {
            opacity: interpolate(
                translateX.value,
                [0, maxTranslate * 0.3],
                [1, 0],
                Extrapolate.CLAMP
            ),
        };
    });

    const bgStyle = useAnimatedStyle(() => {
        return {
            width: translateX.value + BUTTON_HEIGHT,
        };
    });

    return (
        <View style={[styles.container, { backgroundColor, borderColor: color + '40' }]} onLayout={onLayout}>
            <Animated.View style={[styles.backgroundFill, { backgroundColor: color }, bgStyle]} />

            {/* Chevrons hint */}
            <View style={styles.chevronsContainer}>
                <Animated.View style={arrowStyle}>
                    <Icon name="chevron-right" size={16} color={color + '50'} />
                </Animated.View>
                <Animated.View style={arrowStyle}>
                    <Icon name="chevron-right" size={16} color={color + '35'} />
                </Animated.View>
                <Animated.View style={arrowStyle}>
                    <Icon name="chevron-right" size={16} color={color + '20'} />
                </Animated.View>
            </View>

            {/* Centered text */}
            <Animated.Text style={[styles.title, { color: color }, textStyle]}>
                {title}
            </Animated.Text>

            <PanGestureHandler onGestureEvent={gestureHandler} enabled={enabled}>
                <Animated.View style={[styles.swipeable, { backgroundColor: color }, animatedStyle]}>
                    <Icon name={iconName} size={24} color="#fff" />
                </Animated.View>
            </PanGestureHandler>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: BUTTON_HEIGHT,
        borderRadius: BUTTON_HEIGHT / 2,
        justifyContent: 'center',
        alignItems: 'center',
        padding: PADDING,
        overflow: 'hidden',
        width: '100%',
        marginVertical: 8,
        borderWidth: 2,
    },
    backgroundFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: BUTTON_HEIGHT / 2,
        opacity: 0.15,
    },
    chevronsContainer: {
        position: 'absolute',
        left: BUTTON_HEIGHT + 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    swipeable: {
        position: 'absolute',
        left: PADDING,
        height: SWIPEABLE_DIMENSIONS,
        width: SWIPEABLE_DIMENSIONS,
        borderRadius: SWIPEABLE_DIMENSIONS / 2,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        zIndex: 2,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
        textAlign: 'center',
    },
});

export default SwipeButton;
