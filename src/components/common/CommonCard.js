// components/CommonCard.js
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Reusable Card Component
 * @param {object} props
 * @param {React.ReactNode} props.children - Content inside the card
 * @param {object} [props.style] - Additional custom styles
 * @param {function} [props.onPress] - Optional press handler (makes card touchable)
 */
const Card = ({ children, style, onPress }) => {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
});

export default Card;