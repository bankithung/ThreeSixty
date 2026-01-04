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

const BUTTON_HEIGHT = 56;
const PADDING = 4;
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

    const textStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(
                translateX.value,
                [0, containerWidth / 3],
                [1, 0],
                Extrapolate.CLAMP
            ),
        };
    });

    const bgStyle = useAnimatedStyle(() => {
        return {
            width: translateX.value + BUTTON_HEIGHT,
        };
    })

    return (
        <View style={[styles.container, { backgroundColor }]} onLayout={onLayout}>
            <Animated.View style={[styles.backgroundFill, { backgroundColor: color }, bgStyle]} />
            <Animated.Text style={[styles.title, { color: color }, textStyle]}>
                {title}
            </Animated.Text>
            <PanGestureHandler onGestureEvent={gestureHandler} enabled={enabled}>
                <Animated.View style={[styles.swipeable, animatedStyle]}>
                    <Icon name={iconName} size={24} color={color} />
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
        padding: PADDING,
        overflow: 'hidden',
        width: '100%',
        marginVertical: 8,
    },
    backgroundFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: BUTTON_HEIGHT / 2,
    },
    swipeable: {
        height: SWIPEABLE_DIMENSIONS,
        width: SWIPEABLE_DIMENSIONS,
        borderRadius: SWIPEABLE_DIMENSIONS / 2,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        zIndex: 2,
    },
    title: {
        position: 'absolute',
        alignSelf: 'center',
        fontSize: 16,
        fontWeight: '600',
        zIndex: 1,
    },
});

export default SwipeButton;
