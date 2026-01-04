/**
 * Student Card Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Student } from '../../types/models';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Card from '../common/Card';
import Avatar from '../common/Avatar';

interface StudentCardProps {
    student: Student;
    onPress?: () => void;
    status?: 'not_on_bus' | 'on_bus' | 'dropped';
    showRoute?: boolean;
}

const getStatusColor = (status?: string): string => {
    switch (status) {
        case 'on_bus':
            return colors.success;
        case 'dropped':
            return colors.info;
        default:
            return colors.textHint;
    }
};

const getStatusText = (status?: string): string => {
    switch (status) {
        case 'on_bus':
            return 'On Bus';
        case 'dropped':
            return 'Dropped';
        default:
            return 'Not on bus';
    }
};

const StudentCard: React.FC<StudentCardProps> = ({
    student,
    onPress,
    status,
    showRoute = true,
}) => {
    // Compute display name from first_name + last_name if full_name is missing
    const displayName = student.full_name ||
        `${student.first_name || ''} ${student.last_name || ''}`.trim() ||
        'Unknown Student';

    return (
        <Card style={styles.card} onPress={onPress}>
            <View style={styles.content}>
                <Avatar
                    source={student.photo}
                    name={displayName}
                    size="medium"
                />
                <View style={styles.info}>
                    <Text style={styles.name}>{displayName}</Text>
                    <Text style={styles.grade}>
                        Grade {student.grade}
                        {student.section ? ` - ${student.section}` : ''}
                    </Text>
                    {showRoute && student.route_name && (
                        <Text style={styles.route}>{student.route_name}</Text>
                    )}
                </View>
                {status && (
                    <View style={styles.statusContainer}>
                        <View
                            style={[
                                styles.statusDot,
                                { backgroundColor: getStatusColor(status) },
                            ]}
                        />
                        <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                            {getStatusText(status)}
                        </Text>
                    </View>
                )}
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    grade: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    route: {
        fontSize: 11,
        color: colors.primary,
        marginTop: 2,
    },
    statusContainer: {
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '500',
    },
});

export default StudentCard;

