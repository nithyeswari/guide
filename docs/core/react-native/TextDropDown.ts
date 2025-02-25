import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform
} from 'react-native';

/**
 * A text-based dropdown component that expands on click
 * 
 * @param {Object} props
 * @param {Array} props.options - Array of option objects with label and value
 * @param {Function} props.onSelect - Callback when an option is selected
 * @param {string} props.placeholder - Placeholder text when no option is selected
 * @param {string} props.value - Currently selected value
 * @param {Object} props.style - Additional styles for the text
 * @param {string} props.theme - 'light' or 'dark'
 * @param {string} props.triggerText - Text to display instead of selected value
 */
const TextDropdown = ({
  options = [],
  onSelect,
  placeholder = 'Select an option',
  value = null,
  style = {},
  theme = 'light',
  triggerText = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(
    options.find(option => option.value === value) || null
  );
  const dropdownAnimation = useRef(new Animated.Value(0)).current;
  const dropdownRef = useRef(null);
  const [maxHeight, setMaxHeight] = useState(200);

  // Update selected option when value prop changes
  useEffect(() => {
    const option = options.find(option => option.value === value);
    if (option) {
      setSelectedOption(option);
    }
  }, [value, options]);

  // Handle dropdown animation
  useEffect(() => {
    Animated.timing(dropdownAnimation, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: false
    }).start();
  }, [isOpen]);

  // Close dropdown when clicking outside (web only)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (option) => {
    setSelectedOption(option);
    onSelect && onSelect(option.value);
    setIsOpen(false);
  };

  const isDark = theme === 'dark';
  
  // Determine what text to display as the trigger
  const displayText = triggerText || (selectedOption ? selectedOption.label : placeholder);
  
  return (
    <View 
      ref={dropdownRef}
      style={[
        styles.container,
        isDark ? styles.containerDark : {},
        style
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggleDropdown}
      >
        <Text 
          style={[
            styles.triggerText,
            isDark ? styles.triggerTextDark : {},
            triggerText ? styles.customTrigger : {},
            !selectedOption && !triggerText ? styles.placeholder : {}
          ]}
        >
          {displayText}
        </Text>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.dropdownMenu,
          isDark ? styles.dropdownMenuDark : {},
          {
            opacity: dropdownAnimation,
            maxHeight: dropdownAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, maxHeight]
            }),
            zIndex: isOpen ? 1000 : -1,
            display: isOpen ? 'flex' : 'none'
          }
        ]}
      >
        <ScrollView
          style={styles.scroll}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.option,
                isDark ? styles.optionDark : {},
                selectedOption && selectedOption.value === option.value 
                  ? (isDark ? styles.selectedOptionDark : styles.selectedOption)
                  : {}
              ]}
              onPress={() => handleSelect(option)}
            >
              <Text 
                style={[
                  styles.optionText,
                  isDark ? styles.optionTextDark : {},
                  selectedOption && selectedOption.value === option.value
                    ? styles.selectedOptionText
                    : {}
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
    alignSelf: 'flex-start',
  },
  containerDark: {
    // Dark theme styles
  },
  triggerText: {
    fontSize: 16,
    color: '#2d3748',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  triggerTextDark: {
    color: '#f7fafc',
    borderBottomColor: '#4a5568',
  },
  customTrigger: {
    color: '#3182ce',
    fontWeight: '500',
    textDecorationLine: 'underline',
    borderBottomWidth: 0,
  },
  placeholder: {
    color: '#a0aec0',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 180,
  },
  dropdownMenuDark: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  scroll: {
    maxHeight: 200,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  optionDark: {
    borderBottomColor: '#4a5568',
  },
  selectedOption: {
    backgroundColor: '#ebf8ff',
  },
  selectedOptionDark: {
    backgroundColor: '#2c5282',
  },
  optionText: {
    fontSize: 16,
    color: '#2d3748',
  },
  optionTextDark: {
    color: '#f7fafc',
  },
  selectedOptionText: {
    fontWeight: '500',
    color: '#3182ce',
  },
});

export default TextDropdown;