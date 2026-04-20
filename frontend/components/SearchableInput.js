import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPlacePredictions, getPlaceDetails } from '../services/googlePlacesService';

const SearchableInput = ({
  value,
  onChangeText,
  onPlaceSelected,
  placeholder,
  icon = 'location',
  iconColor = '#FF4D4D',
  showLoadingWhen = false,
  disabled = false,
  style = {},
  userLocation = null,
}) => {
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  // Debounced search for predictions
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value && value.trim().length >= 2) {
      setLoading(true);
      timeoutRef.current = setTimeout(async () => {
        try {
          const results = await getPlacePredictions(value, {
            location: userLocation,
            radius: 50000, // 50km radius
          });
          setPredictions(results);
          setShowPredictions(true);
        } catch (error) {
          console.error('Search error:', error);
          setPredictions([]);
        } finally {
          setLoading(false);
        }
      }, 300); // 300ms debounce
    } else {
      setPredictions([]);
      setShowPredictions(false);
      setLoading(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value]);

  const handlePredictionSelect = async (prediction) => {
    try {
      setLoading(true);
      const details = await getPlaceDetails(prediction.place_id);

      if (details) {
        onChangeText(details.address || prediction.description);
        if (onPlaceSelected) {
          onPlaceSelected({
            address: details.address || prediction.description,
            latitude: details.latitude,
            longitude: details.longitude,
            name: details.name || prediction.main_text,
          });
        }
      }

      setShowPredictions(false);
      setPredictions([]);
    } catch (error) {
      console.error('Error selecting prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputFocus = () => {
    if (value && value.trim().length >= 2 && predictions.length > 0) {
      setShowPredictions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow selection
    setTimeout(() => {
      setShowPredictions(false);
    }, 200);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputRow, style]}>
        <Ionicons name={icon} size={22} color={iconColor} style={styles.inputIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          editable={!disabled}
          placeholderTextColor="#999"
        />
        {loading || showLoadingWhen ? (
          <ActivityIndicator size="small" color="#999" />
        ) : value ? (
          <Ionicons name="close-circle" size={20} color="#ccc" />
        ) : null}
      </View>

      {/* Autocomplete Predictions Dropdown */}
      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            scrollEnabled={predictions.length > 4}
            nestedScrollEnabled={true}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.predictionItem}
                onPress={() => handlePredictionSelect(item)}
              >
                <Ionicons name="location" size={16} color="#666" style={styles.predIcon} />
                <View style={styles.predTextContainer}>
                  <Text style={styles.predMainText}>{item.main_text}</Text>
                  {item.secondary_text && (
                    <Text style={styles.predSecondaryText}>{item.secondary_text}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* No Results Message */}
      {showPredictions && predictions.length === 0 && !loading && value && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No results found</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  predictionsContainer: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 280,
    zIndex: 1001,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  predIcon: {
    marginRight: 12,
    marginTop: 2,
    color: '#999',
  },
  predTextContainer: {
    flex: 1,
  },
  predMainText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  predSecondaryText: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  noResultsContainer: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 20,
    paddingHorizontal: 14,
    zIndex: 1001,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SearchableInput;
