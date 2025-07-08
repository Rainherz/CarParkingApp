import React, { useState } from 'react';
import { TouchableOpacity, Modal, View, Text } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onDateChange: (date: string) => void;
  placeholder?: string;
  style?: any;
}

export default function DatePickerField({ 
  label, 
  value, 
  onDateChange, 
  placeholder = "Seleccionar fecha",
  style 
}: DatePickerFieldProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return placeholder;
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleDateSelect = (date: any) => {
    if (date) {
      // Convertir a formato YYYY-MM-DD
      const selectedDate = new Date(date);
      const dateString = selectedDate.toISOString().split('T')[0];
      onDateChange(dateString);
      setShowCalendar(false);
    }
  };

  const clearDate = () => {
    onDateChange('');
    setShowCalendar(false);
  };

  const today = new Date();
  const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()); // Un año adelante
  const minDate = new Date(today.getFullYear() - 2, 0, 1); // Dos años atrás

  return (
    <>
      <Text style={{ fontWeight: '600', marginBottom: 8, color: '#333' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          style={[{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fff'
          }, style]}
          onPress={() => setShowCalendar(true)}
        >
          <Text style={{ 
            fontSize: 16, 
            color: value ? '#333' : '#999' 
          }}>
            {formatDisplayDate(value)}
          </Text>
          <MaterialIcons name="calendar-today" size={20} color="#666" />
        </TouchableOpacity>
        
        {value && (
          <TouchableOpacity
            style={{
              padding: 8,
              backgroundColor: '#f0f0f0',
              borderRadius: 6
            }}
            onPress={() => onDateChange('')}
          >
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 20,
            width: '95%',
            maxWidth: 400
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#333'
              }}>
                Seleccionar Fecha
              </Text>
              <TouchableOpacity
                onPress={() => setShowCalendar(false)}
                style={{ padding: 4 }}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Calendario */}
            <CalendarPicker
              onDateChange={handleDateSelect}
              selectedStartDate={value ? new Date(value) : undefined}
              startFromMonday={true}
              allowRangeSelection={false}
              minDate={minDate}
              maxDate={maxDate}
              todayBackgroundColor="#e8f5e8"
              selectedDayColor="#2E7D32"
              selectedDayTextColor="#ffffff"
              scaleFactor={375}
              textStyle={{
                fontSize: 16,
                color: '#333333'
              }}
              previousTitleStyle={{
                fontSize: 16,
                color: '#2E7D32'
              }}
              nextTitleStyle={{
                fontSize: 16,
                color: '#2E7D32'
              }}
              monthTitleStyle={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#333333'
              }}
              yearTitleStyle={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#333333'
              }}
              dayLabelsWrapper={{
                borderTopWidth: 0,
                borderBottomWidth: 0
              }}
              customDatesStyles={[]}
            />

            {/* Fecha seleccionada */}
            {value && (
              <View style={{
                backgroundColor: '#f8f9fa',
                padding: 12,
                borderRadius: 8,
                marginTop: 15,
                marginBottom: 15
              }}>
                <Text style={{
                  textAlign: 'center',
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#2E7D32'
                }}>
                  Fecha seleccionada: {formatDisplayDate(value)}
                </Text>
              </View>
            )}

            {/* Botones */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 15,
              gap: 12
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#f0f0f0',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                onPress={() => setShowCalendar(false)}
              >
                <Text style={{ color: '#666', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#FF6B35',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                onPress={clearDate}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Limpiar</Text>
              </TouchableOpacity>
            </View>

            {/* Botones de acceso rápido */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              marginTop: 15,
              paddingTop: 15,
              borderTopWidth: 1,
              borderTopColor: '#f0f0f0'
            }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#e8f5e8',
                  borderRadius: 15
                }}
                onPress={() => {
                  const today = new Date();
                  const dateString = today.toISOString().split('T')[0];
                  onDateChange(dateString);
                  setShowCalendar(false);
                }}
              >
                <Text style={{ color: '#2E7D32', fontSize: 12, fontWeight: '600' }}>Hoy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#e8f5e8',
                  borderRadius: 15
                }}
                onPress={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const dateString = yesterday.toISOString().split('T')[0];
                  onDateChange(dateString);
                  setShowCalendar(false);
                }}
              >
                <Text style={{ color: '#2E7D32', fontSize: 12, fontWeight: '600' }}>Ayer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#e8f5e8',
                  borderRadius: 15
                }}
                onPress={() => {
                  const lastWeek = new Date();
                  lastWeek.setDate(lastWeek.getDate() - 7);
                  const dateString = lastWeek.toISOString().split('T')[0];
                  onDateChange(dateString);
                  setShowCalendar(false);
                }}
              >
                <Text style={{ color: '#2E7D32', fontSize: 12, fontWeight: '600' }}>Hace 7 días</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}